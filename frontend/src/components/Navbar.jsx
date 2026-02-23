import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, ChevronDown, Shield, Users, Settings, Building2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import logo from '../assets/logo.png';
import NotificationDropdown from './NotificationDropdown';
import TrashModal from './TrashModal';

const Navbar = () => {
    const { user, organization, logout, isAdmin, canManageUsers } = useAuth();
    const navigate = useNavigate();
    const [showDropdown, setShowDropdown] = useState(false);
    const [showTrash, setShowTrash] = useState(false);

    const handleLogout = () => {
        logout();
        navigate('/login');
    };

    const getRoleBadgeColor = (role) => {
        const colors = {
            ADMIN: 'bg-gradient-to-r from-red-500 to-rose-600',
            PRODUCT_MANAGER: 'bg-gradient-to-r from-purple-500 to-violet-600',
            TEAM_LEAD: 'bg-gradient-to-r from-amber-500 to-orange-600',
            TEAM_MEMBER: 'bg-gradient-to-r from-emerald-500 to-green-600',
        };
        return colors[role] || 'bg-slate-600';
    };

    const formatRole = (role) => {
        return role?.replace('_', ' ') || 'Unknown';
    };

    return (
        <>
            <nav className="glass sticky top-0 z-50 border-b border-slate-700/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        {/* Logo */}
                        <div className="flex items-center gap-6">
                            <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/')}>
                                <img src={logo} alt="FlowLite" className="h-10 w-10 rounded-lg object-cover" />
                                <span className="text-xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                                    FlowLite
                                </span>
                            </div>

                            {/* Organization Badge */}
                            {organization && (
                                <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 border border-slate-700/50 rounded-lg">
                                    <Building2 className="h-4 w-4 text-primary-400" />
                                    <span className="text-sm font-medium text-slate-300">{organization.name}</span>
                                </div>
                            )}

                            {/* Navigation Links - Role Based */}
                            <div className="hidden md:flex items-center gap-4">
                                <button
                                    onClick={() => navigate('/')}
                                    className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                >
                                    Dashboard
                                </button>

                                <button
                                    onClick={() => navigate('/boards')}
                                    className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                >
                                    Boards
                                </button>

                                <button
                                    onClick={() => navigate('/templates')}
                                    className="px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                >
                                    Templates
                                </button>

                                {/* Admin Only - User Management */}
                                {canManageUsers() && (
                                    <button
                                        onClick={() => navigate('/admin/users')}
                                        className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                                    >
                                        <Users className="h-4 w-4" />
                                        Users
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* User Info */}
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => setShowTrash(true)}
                                className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors text-slate-400 hover:text-red-400"
                                title="Recycle Bin"
                            >
                                <Trash2 className="h-5 w-5" />
                            </button>
                            <NotificationDropdown />

                            <div className="relative">
                                <button
                                    onClick={() => setShowDropdown(!showDropdown)}
                                    className="flex items-center gap-3 px-4 py-2 rounded-xl bg-slate-800/50 hover:bg-slate-700/50 border border-slate-600/50 transition-all duration-300"
                                >
                                    <div className="p-2 rounded-lg bg-slate-700/50">
                                        <User className="h-4 w-4 text-slate-300" />
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-slate-200">
                                            {user?.firstName && user?.lastName ? `${user.firstName} ${user.lastName}` : user?.username}
                                        </p>
                                        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full text-white ${getRoleBadgeColor(user?.role)}`}>
                                            {formatRole(user?.role)}
                                        </span>
                                    </div>
                                    <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} />
                                </button>

                                {/* Dropdown */}
                                {showDropdown && (
                                    <div className="absolute right-0 mt-2 w-56 glass rounded-xl shadow-xl border border-slate-600/50 overflow-hidden animate-fade-in">
                                        {/* Role indicator */}
                                        <div className="px-4 py-3 border-b border-slate-700/50">
                                            <div className="flex items-center gap-2 text-sm text-slate-400">
                                                <Shield className="h-4 w-4" />
                                                <span>Role: <span className="text-slate-200">{formatRole(user?.role)}</span></span>
                                            </div>
                                        </div>

                                        {/* Mobile nav links */}
                                        <div className="md:hidden border-b border-slate-700/50">
                                            <button
                                                onClick={() => { navigate('/'); setShowDropdown(false); }}
                                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                                            >
                                                Dashboard
                                            </button>
                                            {canManageUsers() && (
                                                <button
                                                    onClick={() => { navigate('/admin/users'); setShowDropdown(false); }}
                                                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                                                >
                                                    <Users className="h-4 w-4" />
                                                    User Management
                                                </button>
                                            )}
                                        </div>

                                        <button
                                            onClick={() => { navigate('/profile'); setShowDropdown(false); }}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors border-b border-slate-700/50"
                                        >
                                            <User className="h-4 w-4" />
                                            Profile
                                        </button>

                                        <button
                                            onClick={handleLogout}
                                            className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-200 hover:bg-slate-700/50 transition-colors"
                                        >
                                            <LogOut className="h-4 w-4" />
                                            Sign out
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </nav>
            <TrashModal isOpen={showTrash} onClose={() => setShowTrash(false)} />
        </>
    );
};

export default Navbar;
