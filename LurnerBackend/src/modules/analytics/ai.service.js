import { GoogleGenerativeAI } from '@google/generative-ai';
import prisma from "../../config/prisma.js";

export const generateAiReport = async (userId, days) => {
    // 1. Check if GEMINI_API_KEY is available
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY is not set in the environment variables.");
    }

    const since = new Date();
    since.setDate(since.getDate() - days);

    // 2. Fetch data (Submissions)
    const submissions = await prisma.submission.findMany({
        where: { userId, createdAt: { gte: since } },
        include: { question: { select: { title: true } } },
        orderBy: { createdAt: 'asc' }
    });

    const activityLogs = await prisma.activityLog.findMany({
        where: { userId, createdAt: { gte: since } },
        include: { question: { select: { title: true } } },
        orderBy: { createdAt: 'asc' }
    });

    // Merge and sort chronologically
    const allEvents = [...submissions, ...activityLogs].sort((a, b) => a.createdAt - b.createdAt);

    if (allEvents.length === 0) {
        throw new Error("Not enough data to generate an AI report for the specified timeframe.");
    }

    // 3. Prune data: We don't want to send thousands of lines. 
    // We'll summarize by question.
    let timelineText = "User's Execution Timeline:\n\n";
    let eventCount = 0;

    // Group events by question
    const grouped = {};
    for (const event of allEvents) {
        const title = event.question.title;
        if (!grouped[title]) grouped[title] = [];
        grouped[title].push(event);
    }

    for (const [title, events] of Object.entries(grouped)) {
        timelineText += `Question: ${title}\n`;
        let lastError = null;
        for (let i = 0; i < events.length; i++) {
            const ev = events[i];
            const isLast = i === events.length - 1;

            // Log if it's the first event, the last event, or if the status changed.
            // Also log if it's a SUCCESS.
            if (i === 0 || isLast || ev.status === 'SUCCESS' || ev.status !== lastError) {
                timelineText += `- [${ev.createdAt.toISOString()}] Status: ${ev.status} | Code: ${ev.code.replace(/\n/g, ' ')}`;
                if (ev.errorMessage) {
                    timelineText += ` | Error: ${ev.errorMessage}`;
                }
                timelineText += '\n';
                lastError = ev.status;
                eventCount++;
            }
        }
        timelineText += "\n";
    }

    console.log(`Sending ${eventCount} condensed events to Gemini...`);
    console.log("Data sent for AI report generation : ", timelineText);

    // 4. Construct Prompt
    const systemPrompt = `You are an expert SQL instructor analyzing a student's coding history over the last ${days} days.
    
Based on their execution timeline, you must generate a highly structured performance report.
Identify their strengths, weaknesses, and common mistakes.
Also provide a 'competence_score' (0-100) for these 4 specific categories based on their queries:
1. filtering_and_sorting (WHERE, ORDER BY)
2. joins (INNER, LEFT, etc)
3. aggregations (GROUP BY, COUNT, SUM)
4. subqueries

You MUST respond with ONLY a valid JSON object matching this exact schema, with no markdown formatting outside the JSON:
{
  "executive_summary": "A 2-sentence encouraging overview of their performance.",
  "strengths": "Detailed paragraph about what they are doing well.",
  "areas_for_improvement": "Detailed paragraph about where they struggle.",
  "common_mistakes": ["Mistake 1", "Mistake 2"],
  "competence_scores": {
    "filtering_and_sorting": 85,
    "joins": 60,
    "aggregations": 40,
    "subqueries": 0
  }
}`;

    // 5. Call Gemini
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
        generationConfig: {
            responseMimeType: "application/json"
        }
    });

    const result = await model.generateContent([systemPrompt, timelineText]);
    const responseText = result.response.text();

    let reportData;
    try {
        reportData = JSON.parse(responseText);
    } catch (e) {
        console.error("Failed to parse Gemini response as JSON:", responseText);
        throw new Error("AI returned malformed data.");
    }

    // 6. Save to DB
    const savedReport = await prisma.aiReport.create({
        data: {
            userId,
            timeframeDays: days,
            reportData
        }
    });

    return savedReport;
};

export const getLatestReport = async (userId, days) => {
    return prisma.aiReport.findFirst({
        where: { userId, timeframeDays: days },
        orderBy: { createdAt: 'desc' }
    });
};
