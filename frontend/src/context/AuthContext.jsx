import { createContext, useContext, useState, useEffect } from 'react';
import api from '../api/axiosConfig';

const AuthContext = createContext(null);

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [organization, setOrganization] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Restore user state from localStorage (no JWT needed — the HttpOnly
        // cookie is managed by the browser automatically).
        const storedUser = localStorage.getItem('user');
        const storedOrg = localStorage.getItem('organization');

        if (storedUser) {
            setUser(JSON.parse(storedUser));
            if (storedOrg) {
                setOrganization(JSON.parse(storedOrg));
            }
        }
        setLoading(false);
    }, []);

    const login = async (username, password) => {
        try {
            const response = await api.post('/auth/login', { username, password });
            // Token is no longer in the response body — it's set as an HttpOnly cookie
            // by the server. We only use the metadata fields.
            const {
                username: userName, firstName, lastName, email,
                role, userId, organizationId, organizationName
            } = response.data;

            // CRITICAL: Role must exist — fail login if missing
            if (!role) {
                console.error('Login failed: No role found in response');
                return {
                    success: false,
                    error: 'Login failed: User role is missing. Contact your administrator.'
                };
            }

            const userData = {
                username: userName,
                firstName,
                lastName,
                email,
                role,
                userId
            };

            const orgData = organizationId ? {
                id: organizationId,
                name: organizationName
            } : null;

            localStorage.setItem('user', JSON.stringify(userData));
            if (orgData) {
                localStorage.setItem('organization', JSON.stringify(orgData));
            }
            setUser(userData);
            setOrganization(orgData);

            return { success: true };
        } catch (error) {
            console.error('Login error:', error);
            return {
                success: false,
                error: error.response?.data?.message || error.message || 'Login failed'
            };
        }
    };

    const register = async (username, password, email, organizationName) => {
        try {
            const response = await api.post('/auth/register', {
                username,
                password,
                email,
                organizationName
            });

            // Token is no longer in the response body — it's set as an HttpOnly cookie
            const {
                username: userName, firstName, lastName, email: userEmail,
                role, userId, organizationId, organizationName: orgName
            } = response.data;

            const userData = {
                username: userName,
                firstName,
                lastName,
                email: userEmail,
                role,
                userId
            };

            const orgData = {
                id: organizationId,
                name: orgName
            };

            localStorage.setItem('user', JSON.stringify(userData));
            localStorage.setItem('organization', JSON.stringify(orgData));
            setUser(userData);
            setOrganization(orgData);

            return { success: true };
        } catch (error) {
            console.error('Registration error:', error);

            let errorMessage = 'Registration failed';

            if (error.response?.data) {
                errorMessage = error.response.data.message
                    || error.response.data.error
                    || errorMessage;
            } else if (error.message) {
                errorMessage = error.message;
            }

            return {
                success: false,
                error: errorMessage
            };
        }
    };

    const logout = async () => {
        try {
            await api.post('/auth/logout');
        } catch (error) {
            // Don't block logout if API call fails
            // 401 is expected if cookie already expired — not a real error
            if (error.response?.status !== 401) {
                console.warn('Logout API call failed, proceeding with local logout');
            }
        } finally {
            // Always clear local state — the server clears the cookie
            localStorage.removeItem('user');
            localStorage.removeItem('organization');
            setUser(null);
            setOrganization(null);
        }
    };

    const hasRole = (role) => user?.role === role;
    const hasAnyRole = (roles) => roles.includes(user?.role);

    const isAdmin = () => hasRole('ADMIN');
    const isTeamLead = () => hasRole('TEAM_LEAD');
    const isTeamMember = () => hasRole('TEAM_MEMBER');
    const isProductManager = () => hasRole('PRODUCT_MANAGER');

    const canApprove = () => hasAnyRole(['TEAM_LEAD', 'ADMIN']);
    const canManageProjects = () => hasAnyRole(['PRODUCT_MANAGER', 'ADMIN']);
    const canManageUsers = () => hasRole('ADMIN');

    const value = {
        user,
        organization,
        login,
        register,
        logout,
        loading,
        isAuthenticated: !!user,
        hasRole,
        hasAnyRole,
        isAdmin,
        isTeamLead,
        isTeamMember,
        isProductManager,
        canApprove,
        canManageProjects,
        canManageUsers,
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};