import api from './axiosConfig';

// Create a new project (ADMIN / PRODUCT_MANAGER only)
export const createProject = async (projectData) => {
    const response = await api.post('/projects', projectData);
    return response.data;
};
