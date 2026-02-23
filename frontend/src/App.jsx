import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import VerifyEmail from './pages/VerifyEmail';
import Dashboard from './pages/Dashboard';
import Unauthorized from './pages/Unauthorized';
import AdminUsers from './pages/AdminUsers';
import AdminAuditLogs from './pages/AdminAuditLogs';
import TaskTemplates from './pages/TaskTemplates';
import Boards from './pages/Boards';
import BoardTasks from './pages/BoardTasks';
import Profile from './pages/Profile';
import Navbar from './components/Navbar';
import CommandPalette from './components/CommandPalette';
import ProtectedRoute from './components/ProtectedRoute';
import RoleProtectedRoute from './components/RoleProtectedRoute';

function App() {
    const { isAuthenticated } = useAuth();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            {isAuthenticated && <CommandPalette />}
            {isAuthenticated && <Navbar />}
            <Routes>
                {/* Public Routes */}
                <Route
                    path="/login"
                    element={isAuthenticated ? <Navigate to="/" replace /> : <Login />}
                />
                <Route
                    path="/register"
                    element={isAuthenticated ? <Navigate to="/" replace /> : <Register />}
                />
                <Route
                    path="/unauthorized"
                    element={<Unauthorized />}
                />
                <Route
                    path="/forgot-password"
                    element={isAuthenticated ? <Navigate to="/" replace /> : <ForgotPassword />}
                />
                <Route
                    path="/reset-password"
                    element={isAuthenticated ? <Navigate to="/" replace /> : <ResetPassword />}
                />
                <Route
                    path="/verify-email"
                    element={<VerifyEmail />}
                />

                {/* Protected Routes - All authenticated users */}
                <Route
                    path="/"
                    element={
                        <ProtectedRoute>
                            <Dashboard />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/profile"
                    element={
                        <ProtectedRoute>
                            <Profile />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/templates"
                    element={
                        <ProtectedRoute>
                            <TaskTemplates />
                        </ProtectedRoute>
                    }
                />

                <Route
                    path="/boards"
                    element={
                        <ProtectedRoute>
                            <Boards />
                        </ProtectedRoute>
                    }
                />
                <Route
                    path="/boards/:boardId/tasks"
                    element={
                        <ProtectedRoute>
                            <BoardTasks />
                        </ProtectedRoute>
                    }
                />

                {/* Admin Only Routes */}
                <Route
                    path="/admin/users"
                    element={
                        <RoleProtectedRoute allowedRoles={['ADMIN']}>
                            <AdminUsers />
                        </RoleProtectedRoute>
                    }
                />
                <Route
                    path="/admin/audit-logs"
                    element={
                        <RoleProtectedRoute allowedRoles={['ADMIN']}>
                            <AdminAuditLogs />
                        </RoleProtectedRoute>
                    }
                />

                {/* Catch all */}
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </div>
    );
}

export default App;
