import api from './axiosConfig';

// Task API functions for React Query
export const fetchAllTasks = async () => {
    const response = await api.get('/tasks');
    return response.data;
};

export const fetchArchivedTasks = async () => {
    const response = await api.get('/tasks/archived');
    return response.data;
};

export const fetchCancelledTasks = async () => {
    const response = await api.get('/tasks/cancelled');
    return response.data;
};

export const archiveTask = async (taskId) => {
    const response = await api.post(`/tasks/${taskId}/archive`);
    return response.data;
};

export const cancelTask = async (taskId, reason) => {
    const response = await api.post(`/tasks/${taskId}/cancel`, null, {
        params: { reason }
    });
    return response.data;
};

export const restoreTask = async (taskId) => {
    const response = await api.put(`/tasks/${taskId}/restore`);
    return response.data;
};

export const deleteTask = async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
};

export const undoDelete = async (taskId) => {
    const response = await api.put(`/tasks/${taskId}/undo-delete`);
    return response.data;
};

// Paginated fetch for infinite scroll
export const fetchTasksPaginated = async ({ pageParam = 0, size = 10 }) => {
    const response = await api.get('/tasks/paginated', {
        params: { page: pageParam, size }
    });
    return response.data;
};

// My tasks (assigned to current user)
export const fetchMyTasks = async () => {
    const response = await api.get('/tasks/my');
    return response.data;
};

// Search with optional filters
export const searchTasks = async ({ search, priority, status, assigneeId, page = 0, size = 10, sortBy = 'createdAt' }) => {
    const response = await api.get('/tasks/search', {
        params: { search, priority, status, assigneeId, page, size, sortBy }
    });
    return response.data;
};

// Create task
export const createTask = async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
};

// Update task
export const updateTask = async ({ taskId, taskData }) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
};

// Fetch all tasks for a specific board (non-paginated)
export const fetchBoardTasks = async (boardId) => {
    const response = await api.get(`/tasks/board/${boardId}/all`);
    return response.data;
};
