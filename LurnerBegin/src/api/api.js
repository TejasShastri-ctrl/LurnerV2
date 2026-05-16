const BASE_URL = 'http://localhost:3000/api';

// Questions
export const fetchAllQuestions = async (token) => {
    try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${BASE_URL}/questions`, { headers });
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("error while fetching questions:", e);
        return [];
    }
}

export const fetchAllTags = async (token) => {
    try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${BASE_URL}/questions/tags`, { headers });
        const data = await res.json();
        return Array.isArray(data) ? data : [];
    } catch (e) {
        console.error("error while fetching tags:", e);
        return [];
    }
}

export const fetchQueById = async (id, token) => {
    try {
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch(`${BASE_URL}/questions/${id}`, { headers });
        return await res.json();
    } catch (e) {
        console.error(e);
        return null;
    }
}

// admin endpoint
export const createQuestion = async (data, token) => {
    const res = await fetch(`${BASE_URL}/questions/createQuestion`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    const resdata = await res.json();
    if (!res.ok) {
        throw new Error(resdata.error || "(api.js) failed to create question, check the issue out");
    }
    return resdata;
}

export const generateExpectedOutput = async (initSql, solutionSql, token) => {
    const res = await fetch(`${BASE_URL}/questions/generateOutput`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ initSql, solutionSql })
    });
    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to generate output");
    }
    return await res.json();
}

export const updateQuestion = async (id, data, token) => {
    const res = await fetch(`${BASE_URL}/questions/update/${id}`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error("Failed to update question");
    return await res.json();
}

export const deleteQuestion = async (id, token) => {
    const res = await fetch(`${BASE_URL}/questions/delete/${id}`, {
        method: 'DELETE',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!res.ok) throw new Error("Failed to delete question");
    return await res.json();
}

// Authentication
export const register = async (username, email, password) => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, email, password })
    });
    return await res.json();
}

export const login = async (email, password) => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    return await res.json();
}

// Submissions (Authenticated)
export const submitSolution = async (sql, questionId, token, sessionId) => {
    const res = await fetch(`${BASE_URL}/submissions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sql, questionId, sessionId })
    });
    return await res.json();
}

export const fetchHistory = async (questionId, token) => {
    try {
        const res = await fetch(`${BASE_URL}/submissions/history/${questionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await res.json();
    } catch (e) {
        console.error("Failed to fetch history:", e);
        return [];
    }
}

export const executeSql = async (sql, questionId, token, sessionId) => {
    const res = await fetch(`${BASE_URL}/questions/execute`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ sql, questionId, sessionId })
    });

    const data = await res.json();
    // 429 is considered a success and hence does not trigger error catching. Have to do it manually
    if (!res.ok) {
        throw { status: res.status, ...data }
    }

    return data;

}

// Social & Invites
export const sendInvite = async (code, token) => {
    const res = await fetch(`${BASE_URL}/social/invite`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ code })
    });
    return await res.json();
}

export const fetchPendingInvites = async (token) => {
    const res = await fetch(`${BASE_URL}/social/invites/pending`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

export const acceptInvite = async (inviteId, token) => {
    const res = await fetch(`${BASE_URL}/social/invite/${inviteId}/accept`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

export const declineInvite = async (inviteId, token) => {
    const res = await fetch(`${BASE_URL}/social/invite/${inviteId}/decline`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

export const fetchFriends = async (token) => {
    const res = await fetch(`${BASE_URL}/social/friends`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

export const unfriendUser = async (userId, token) => {
    const res = await fetch(`${BASE_URL}/social/unfriend/${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

// Analytics
export const fetchUserStats = async (token) => {
    const res = await fetch(`${BASE_URL}/analytics/user-stats-summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

export const fetchActivityHeatmap = async (token) => {
    const res = await fetch(`${BASE_URL}/analytics/activity-heatmap`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

export const fetchSkillMastery = async (token) => {
    const res = await fetch(`${BASE_URL}/analytics/skill-mastery-breakdown`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

export const fetchErrorDistribution = async (token) => {
    const res = await fetch(`${BASE_URL}/analytics/error-distribution`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

export const fetchPerformanceTelemetry = async (token) => {
    const res = await fetch(`${BASE_URL}/analytics/performance-telemetry`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    return await res.json();
}

export const generateAiReport = async (token, days = 7) => {
    const res = await fetch(`${BASE_URL}/analytics/ai-report`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ days })
    });
    if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to generate report');
    }
    return await res.json();
}

export const fetchAiReport = async (token, days = 7) => {
    const res = await fetch(`${BASE_URL}/analytics/ai-report?days=${days}`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    console.log('ai report fetch response - ', res);
    if (!res.ok) {
        if (res.status === 404) return null; // Expected if no report exists
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to fetch report');
    }
    return await res.json();
}