const API_BASE_URL = '/api';

export const apiService = {
    // Projects
    getProjects: async () => {
        const res = await fetch(`${API_BASE_URL}/projects`);
        return await res.json();
    },
    addProject: async (formData) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/projects`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` },
            body: formData
        });
        if (!res.ok) throw new Error('Failed to add project');
        return await res.json();
    },
    deleteProject: async (id) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/projects/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete project');
        return await res.json();
    },

    // Reviews
    getReviews: async () => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/reviews/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await res.json();
    },
    approveReview: async (id) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/reviews/${id}/approve`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to approve review');
        return await res.json();
    },
    rejectReview: async (id) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/reviews/${id}/reject`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to reject review');
        return await res.json();
    },
    deleteReview: async (id) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/reviews/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete review');
        return await res.json();
    },

    // Queries
    getQueries: async () => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/contact/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await res.json();
    },
    markQueryRead: async (id) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/contact/${id}/read`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to mark query read');
        return await res.json();
    },
    deleteQuery: async (id) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/contact/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete query');
        return await res.json();
    },

    // Careers
    getApplications: async () => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/careers/admin`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        return await res.json();
    },
    deleteApplication: async (id) => {
        const token = localStorage.getItem('token');
        const res = await fetch(`${API_BASE_URL}/careers/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!res.ok) throw new Error('Failed to delete application');
        return await res.json();
    }
};
