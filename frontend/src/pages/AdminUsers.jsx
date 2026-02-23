import { useState, useMemo, useEffect } from 'react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import {
    Users,
    Plus,
    Trash2,
    Shield,
    AlertCircle,
    RefreshCw,
    X,
    Building2,
    Search,
    Filter,
    UserPlus,
    MoreVertical,
    Edit,
    Eye
} from 'lucide-react';

const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [roleFilter, setRoleFilter] = useState('all');
    const { organization } = useAuth();

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const response = await api.get('/admin/users');
            setUsers(response.data);
        } catch (err) {
            toast.error('Failed to load users');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    // Filter users based on search and role
    const filteredUsers = useMemo(() => {
        let filtered = users;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(user =>
                user.username?.toLowerCase().includes(q) ||
                user.email?.toLowerCase().includes(q) ||
                `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(q)
            );
        }

        if (roleFilter !== 'all') {
            filtered = filtered.filter(user => user.role === roleFilter);
        }

        return filtered;
    }, [users, searchQuery, roleFilter]);

    const handleDeleteUser = async (userId) => {
        setDeleteTarget(users.find(u => u.id === userId) || { id: userId });
    };

    const confirmDeleteUser = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await api.delete(`/admin/users/${deleteTarget.id}`);
            toast.success('User deleted');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete user');
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    };

    const handleUpdateRole = async (userId, newRole) => {
        try {
            await api.patch(`/admin/users/${userId}/role`, { role: newRole });
            toast.success('Role updated');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update role');
        }
    };

    // Role badge config
    const getRoleBadge = (role) => {
        const config = {
            ADMIN: {
                label: 'Admin',
                bg: 'bg-red-500/10',
                text: 'text-red-400',
                border: 'border-red-500/30',
            },
            PRODUCT_MANAGER: {
                label: 'Product Manager',
                bg: 'bg-purple-500/10',
                text: 'text-purple-400',
                border: 'border-purple-500/30',
            },
            TEAM_LEAD: {
                label: 'Team Lead',
                bg: 'bg-amber-500/10',
                text: 'text-amber-400',
                border: 'border-amber-500/30',
            },
            TEAM_MEMBER: {
                label: 'Team Member',
                bg: 'bg-emerald-500/10',
                text: 'text-emerald-400',
                border: 'border-emerald-500/30',
            }
        };
        return config[role] || config.TEAM_MEMBER;
    };

    // Access level config
    const getAccessLevel = (role) => {
        if (role === 'ADMIN') return { icon: Shield, color: 'text-red-400', label: 'Full Access' };
        if (role === 'PRODUCT_MANAGER') return { icon: Edit, color: 'text-purple-400', label: 'Manager' };
        if (role === 'TEAM_LEAD') return { icon: Edit, color: 'text-amber-400', label: 'Lead' };
        return { icon: Eye, color: 'text-slate-400', label: 'Member' };
    };

    // Get user initials
    const getInitials = (user) => {
        if (user.firstName && user.lastName) {
            return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        }
        return user.username?.[0]?.toUpperCase() || '?';
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4"></div>
                    <p className="text-slate-400">Loading users...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                        <Shield className="h-7 w-7 text-red-400" />
                        Team Members
                    </h1>
                    <div className="flex items-center gap-2 mt-2">
                        <Building2 className="h-4 w-4 text-primary-400" />
                        <p className="text-slate-400">
                            {organization ? `${organization.name} · ` : ''}Manage users and permissions
                        </p>
                    </div>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchUsers}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <UserPlus className="h-4 w-4" />
                        Add People
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="glass rounded-xl border border-slate-700/50 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
                    {/* Search */}
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search members by name, username, or email..."
                            className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg
                                     text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2
                                     focus:ring-primary-500 focus:border-transparent"
                        />
                    </div>

                    {/* Role Filter */}
                    <select
                        value={roleFilter}
                        onChange={(e) => setRoleFilter(e.target.value)}
                        className="px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg text-slate-100
                                 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="all">All Roles</option>
                        <option value="ADMIN">Admin</option>
                        <option value="PRODUCT_MANAGER">Product Manager</option>
                        <option value="TEAM_LEAD">Team Lead</option>
                        <option value="TEAM_MEMBER">Team Member</option>
                    </select>
                </div>
            </div>

            {/* Users Table */}
            <div className="glass rounded-xl border border-slate-700/50 overflow-hidden">
                <table className="w-full">
                    <thead>
                        <tr className="border-b border-slate-700/50 bg-slate-800/30">
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Name
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Role
                            </th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">
                                Access Level
                            </th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="px-6 py-12 text-center text-slate-400">
                                    {searchQuery || roleFilter !== 'all'
                                        ? 'No users match your filters'
                                        : 'No users found'}
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => {
                                const roleBadge = getRoleBadge(user.role);
                                const accessLevel = getAccessLevel(user.role);
                                const AccessIcon = accessLevel.icon;

                                return (
                                    <tr
                                        key={user.id}
                                        className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors group"
                                    >
                                        {/* Name & Email */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className="h-10 w-10 rounded-full bg-primary-500/20 border border-primary-500/30
                                                              flex items-center justify-center text-primary-400 font-semibold text-sm shrink-0">
                                                    {getInitials(user)}
                                                </div>
                                                <div>
                                                    <div className="font-medium text-slate-100">
                                                        {user.firstName && user.lastName
                                                            ? `${user.firstName} ${user.lastName}`
                                                            : user.username}
                                                    </div>
                                                    <div className="text-sm text-slate-400">
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role Badge with Dropdown */}
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                className={`px-2.5 py-1 rounded-lg border text-xs font-medium
                                                           ${roleBadge.bg} ${roleBadge.text} ${roleBadge.border}
                                                           bg-transparent cursor-pointer hover:brightness-110 transition-all`}
                                            >
                                                <option value="TEAM_MEMBER">Team Member</option>
                                                <option value="TEAM_LEAD">Team Lead</option>
                                                <option value="PRODUCT_MANAGER">Product Manager</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </td>

                                        {/* Access Level */}
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className="flex items-center gap-2 text-slate-300">
                                                <AccessIcon className={`h-4 w-4 ${accessLevel.color}`} />
                                                <span className="text-sm">{accessLevel.label}</span>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <button
                                                onClick={() => handleDeleteUser(user.id)}
                                                className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg
                                                         transition-colors opacity-0 group-hover:opacity-100"
                                                title="Delete user"
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>

                {/* Footer Stats */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-slate-700/50 bg-slate-800/30">
                    <p className="text-sm text-slate-400">
                        Showing <span className="font-medium text-slate-100">{filteredUsers.length}</span> of{' '}
                        <span className="font-medium text-slate-100">{users.length}</span> members
                    </p>
                </div>
            </div>

            {/* Create User Modal */}
            {showCreateModal && (
                <CreateUserModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); fetchUsers(); }}
                />
            )}

            {/* Delete User Confirm Modal */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDeleteUser}
                title="Delete User"
                message="Are you sure you want to deactivate this user? They will no longer be able to log in."
                itemName={deleteTarget?.username}
                confirmText="Delete User"
                loading={deleteLoading}
            />
        </div>
    );
};

const CreateUserModal = ({ onClose, onCreated }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState('TEAM_MEMBER');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/admin/users', { username, email, password, role });
            toast.success('User created successfully');
            onCreated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl animate-slide-in">
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <h2 className="text-xl font-semibold text-slate-100">Create New User</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-lg">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input-field"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="input-field"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="input-field"
                            required
                            minLength={6}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Role</label>
                        <select
                            value={role}
                            onChange={(e) => setRole(e.target.value)}
                            className="input-field"
                        >
                            <option value="TEAM_MEMBER">Team Member</option>
                            <option value="TEAM_LEAD">Team Lead</option>
                            <option value="PRODUCT_MANAGER">Product Manager</option>
                            <option value="ADMIN">Admin</option>
                        </select>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading} className="flex-1 btn-primary disabled:opacity-50">
                            {loading ? 'Creating...' : 'Create User'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AdminUsers;
