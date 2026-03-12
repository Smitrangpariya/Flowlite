import axios from 'axios';
import toast from 'react-hot-toast';

// Use env variable - works in dev and prod
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    withCredentials: true,  // Required — sends the HttpOnly jwt cookie automatically
});

// REQUEST INTERCEPTOR
// No Authorization header needed — the HttpOnly cookie is sent automatically
// by the browser via withCredentials: true. The JwtFilter reads the cookie.

// RESPONSE INTERCEPTOR
// NOTE: 401 handling is owned by AuthContext.jsx (has access to useNavigate)
api.interceptors.response.use(
    (response) => response,
    (error) => {
        const status = error.response?.status;

        if (status === 403) {
            const errorCode = error.response?.data?.code;
            const errorMessage = error.response?.data?.message || "You don't have permission for this action";
            console.warn('Permission denied:', errorCode || 'UNKNOWN',
                '| URL:', error.config?.url,
                '| Method:', error.config?.method?.toUpperCase());
            toast.error(errorMessage);
        }

        if (status === 429) {
            console.warn('Rate limited on:', error.config?.url);
        }

        return Promise.reject(error);
    }
);

export default api;
