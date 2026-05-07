const BASE_URL = 'http://localhost:3000/api';

/**
 * API Helpers for Lurner.
 * Centralized logic for all backend communication.
 */

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
    return await res.json();
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