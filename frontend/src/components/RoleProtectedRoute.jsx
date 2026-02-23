import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * RoleProtectedRoute - Protects routes based on user roles
 * 
 * @param {string[]} allowedRoles - Array of roles that can access this route
 * @param {React.ReactNode} children - The component to render if authorized
 * @param {string} redirectTo - Where to redirect if unauthorized (default: /unauthorized)
 */
const RoleProtectedRoute = ({ children, allowedRoles, redirectTo = '/unauthorized' }) => {
    const { isAuthenticated, loading, user, hasAnyRole } = useAuth();
    const location = useLocation();

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    // Not authenticated - redirect to login
    if (!isAuthenticated) {
        return <Navigate to="/login" state={{ from: location }} replace />;
    }

    // Check if user has any of the allowed roles
    if (allowedRoles && allowedRoles.length > 0) {
        if (!hasAnyRole(allowedRoles)) {
            // User doesn't have permission - redirect to unauthorized page
            return <Navigate to={redirectTo} replace />;
        }
    }

    return children;
};

export default RoleProtectedRoute;
