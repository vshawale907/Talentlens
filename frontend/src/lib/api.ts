import axios from 'axios';
import { useAuthStore } from '../stores/authStore';

export const api = axios.create({
    baseURL: '/api/v1',
    headers: { 'Content-Type': 'application/json' },
    timeout: 120000, // 2 minutes for AI operations
});

// ─── Request Interceptor: Attach JWT ──────────────────
api.interceptors.request.use((config) => {
    const token = useAuthStore.getState().accessToken;
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

// ─── Response Interceptor: Auto-refresh Token ─────────
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const original = error.config;

        if (error.response?.status === 401 && !original._retry) {
            original._retry = true;
            try {
                const refreshToken = useAuthStore.getState().refreshToken;
                if (!refreshToken) throw new Error('No refresh token');

                const { data } = await axios.post('/api/v1/auth/refresh', { refreshToken });
                const { accessToken, refreshToken: newRefreshToken } = data.data.tokens;

                useAuthStore.getState().setTokens(accessToken, newRefreshToken);
                original.headers.Authorization = `Bearer ${accessToken}`;
                return api(original);
            } catch {
                useAuthStore.getState().logout();
                window.location.href = '/login';
            }
        }

        return Promise.reject(error);
    }
);

// ─── Typed API helpers ─────────────────────────────────
export const authApi = {
    register: (data: { name: string; email: string; password: string }) => api.post('/auth/register', data),
    login: (data: { email: string; password: string }) => api.post('/auth/login', data),
    me: () => api.get('/auth/me'),
    updateProfile: (data: object) => api.patch('/auth/profile', data),
    changePassword: (data: { currentPassword: string; newPassword: string }) => api.post('/auth/change-password', data),
    forgotPassword: (data: { email: string }) => api.post('/auth/forgot-password', data),
    resetPassword: (data: { token: string; newPassword: string }) => api.post('/auth/reset-password', data),
};

export const resumeApi = {
    upload: (formData: FormData) => api.post('/resumes/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
    analyze: (id: string, jobDescriptionText?: string) => api.post(`/resumes/${id}/analyze`, { jobDescriptionText }),
    getStatus: (id: string) => api.get(`/resumes/${id}/status`),
    list: (page = 1, limit = 10) => api.get('/resumes', { params: { page, limit } }),
    delete: (id: string) => api.delete(`/resumes/${id}`),
};

export const analysisApi = {
    getLatest: (resumeId: string) => api.get(`/analysis/${resumeId}/latest`),
    getHistory: (resumeId: string) => api.get(`/analysis/${resumeId}/history`),
    getInterviewQuestions: (resumeId: string, data: { jobTitle: string; jobDescription?: string; forceRegenerate?: boolean }) =>
        api.post(`/analysis/${resumeId}/interview-questions`, data),
    getCoverLetter: (resumeId: string, data: { jobTitle: string; company: string; jobDescription?: string }) =>
        api.post(`/analysis/${resumeId}/cover-letter`, data),
    getRoadmap: (resumeId: string, targetRole: string) =>
        api.post(`/analysis/${resumeId}/roadmap`, { targetRole }),
    getCustomCoverLetter: (data: {
        fullName: string; email: string; phone: string;
        jobTitle: string; company: string;
        skills: string; experience: string; projectTitle: string; projectDesc: string; education: string; whyInterested: string;
    }) => api.post(`/analysis/custom-cover-letter`, data),
};

export const jobApi = {
    search: (q: string, page = 1) => api.get('/jobs', { params: { q, page } }),
    getById: (id: string) => api.get(`/jobs/${id}`),
    getMatches: (resumeId: string) => api.get(`/jobs/match/${resumeId}`),
};

export const chatApi = {
    createSession: (resumeId?: string) => api.post('/chat/sessions', { resumeId }),
    getSessions: () => api.get('/chat/sessions'),
    sendMessage: (sessionId: string, message: string, mode?: string, bulletText?: string) =>
        api.post(`/chat/sessions/${sessionId}/message`, { message, mode, bulletText }),
    deleteSession: (sessionId: string) => api.delete(`/chat/sessions/${sessionId}`),
};

export const userApi = {
    getAnalytics: () => api.get('/users/analytics'),
};

export const adminApi = {
    getStats: () => api.get('/admin/stats'),
    getUsers: (page = 1, search?: string) => api.get('/admin/users', { params: { page, search } }),
    setUserStatus: (id: string, isActive: boolean) => api.patch(`/admin/users/${id}/status`, { isActive }),
};

export const subscriptionApi = {
    createCheckout: (tier: string) => api.post('/subscriptions/create-checkout', { tier }),
    getPortal: () => api.get('/subscriptions/portal'),
};
