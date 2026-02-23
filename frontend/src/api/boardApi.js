import api from './axiosConfig';

// Board API functions for React Query
export const fetchBoardLimits = async () => {
    const response = await api.get('/boards/limits');
    return response.data;
};

export const fetchAllBoards = async () => {
    const response = await api.get('/boards');
    return response.data;
};

export const fetchTeamBoards = async () => {
    const response = await api.get('/boards/team');
    return response.data;
};

export const fetchPersonalBoards = async () => {
    const response = await api.get('/boards/personal');
    return response.data;
};

export const createBoard = async (boardData) => {
    const response = await api.post('/boards', boardData);
    return response.data;
};

export const updateBoard = async (boardId, boardData) => {
    const response = await api.put(`/boards/${boardId}`, boardData);
    return response.data;
};

export const deleteBoard = async (boardId) => {
    const response = await api.delete(`/boards/${boardId}`);
    return response.data;
};

export const setDefaultBoard = async (boardId) => {
    const response = await api.put(`/boards/${boardId}/set-default`);
    return response.data;
};

export const reorderBoards = async (boardIds) => {
    const response = await api.put('/boards/reorder', boardIds);
    return response.data;
};

// Fetch tasks filtered by board
export const fetchTasksByBoard = async ({ boardId, pageParam = 0, size = 10 }) => {
    const response = await api.get(`/tasks/board/${boardId}`, {
        params: { page: pageParam, size }
    });
    return response.data;
};
