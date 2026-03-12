import { useState, useMemo, useEffect } from 'react';
import { createPortal } from 'react-dom';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';
import EmailStrengthMeter from '../components/EmailStrengthMeter';
import { useEmailValidator } from '../hooks/useEmailValidator';
import {
    Users, Plus, Trash2, Shield, AlertCircle, RefreshCw, X,
    Building2, Search, UserPlus, Edit, Eye, Briefcase,
    Copy, Check, Mail, Key, Share2, EyeOff, Shuffle,
    CheckCircle2, ClipboardCopy, RotateCw
} from 'lucide-react';

const JOB_TITLE_OPTIONS = [
    'Product Owner',
    'Software Developer',
    'QA Engineer',
    'Scrum Master',
    'DevOps Engineer',
    'Architect',
    'Business Analyst',
];

// ─── Password generator ──────────────────────────────────────────────────────
const CHARSET = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%&*';
const generatePassword = (len = 12) =>
    Array.from({ length: len }, () => CHARSET[Math.floor(Math.random() * CHARSET.length)]).join('');

// ─── Password strength helper ─────────────────────────────────────────────────
const getPasswordStrength = (pwd) => {
    if (!pwd) return { level: 0, label: '', color: '', textColor: '' };
    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    if (score <= 1) return { level: 1, label: 'Weak', color: 'bg-red-500', textColor: 'text-red-400' };
    if (score <= 2) return { level: 2, label: 'Fair', color: 'bg-amber-500', textColor: 'text-amber-400' };
    if (score <= 3) return { level: 3, label: 'Good', color: 'bg-yellow-500', textColor: 'text-yellow-400' };
    if (score <= 4) return { level: 4, label: 'Strong', color: 'bg-green-500', textColor: 'text-green-400' };
    return { level: 5, label: 'Very Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
};

// ─── Tiny hook: copy-to-clipboard with transient "Copied!" feedback ──────────
const useCopy = (timeout = 2000) => {
    const [copied, setCopied] = useState(false);
    const copy = (text) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), timeout);
        });
    };
    return { copied, copy };
};


// ════════════════════════════════════════════════════════════════════════════
// AdminUsers page
// ════════════════════════════════════════════════════════════════════════════
const AdminUsers = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [reshareTarget, setReshareTarget] = useState(null);   // { username, email, password }
    const [reshareLoading, setReshareLoading] = useState(null); // holds the userId while loading
    const [roleFilter, setRoleFilter] = useState('all');
    const { organization } = useAuth();

    useEffect(() => { fetchUsers(); }, []);

    const fetchUsers = async () => {
        try {
            setLoading(true);
            const { data } = await api.get('/admin/users');
            setUsers(data);
        } catch {
            toast.error('Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const filteredUsers = useMemo(() => {
        let f = users;
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            f = f.filter(u =>
                u.username?.toLowerCase().includes(q) ||
                u.email?.toLowerCase().includes(q) ||
                `${u.firstName || ''} ${u.lastName || ''}`.toLowerCase().includes(q)
            );
        }
        if (roleFilter !== 'all') f = f.filter(u => u.role === roleFilter);
        return f;
    }, [users, searchQuery, roleFilter]);

    const handleDeleteUser = (userId) => setDeleteTarget(users.find(u => u.id === userId) || { id: userId });

    const handleReshare = async (user) => {
        // Check localStorage first — credentials are saved there at creation time
        // so the admin can always retrieve them without resetting the password
        const stored = localStorage.getItem(`fl_creds_${user.id}`);
        if (stored) {
            try {
                setReshareTarget(JSON.parse(stored));
                return;
            } catch {
                // Corrupt entry — fall through to generate new ones
                localStorage.removeItem(`fl_creds_${user.id}`);
            }
        }

        // No saved credentials (user predates this feature, or storage was cleared).
        // Silently generate a new password and show credentials — no dialog.
        setReshareLoading(user.id);
        const newPassword = generatePassword();
        try {
            await api.patch(`/admin/users/${user.id}/reset-password`, { password: newPassword });
            const creds = { username: user.username, email: user.email, password: newPassword };
            localStorage.setItem(`fl_creds_${user.id}`, JSON.stringify(creds));
            setReshareTarget(creds);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to load credentials');
        } finally {
            setReshareLoading(null);
        }
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

    const handleUpdateJobTitle = async (userId, newJobTitle) => {
        try {
            await api.patch(`/admin/users/${userId}/job-title`, { jobTitle: newJobTitle || null });
            toast.success('Job title updated');
            fetchUsers();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update job title');
        }
    };

    const getRoleBadge = (role) => {
        const cfg = {
            ADMIN: { label: 'Admin', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/30' },
            PRODUCT_MANAGER: { label: 'Product Manager', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
            TEAM_LEAD: { label: 'Team Lead', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
            TEAM_MEMBER: { label: 'Team Member', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
        };
        return cfg[role] || cfg.TEAM_MEMBER;
    };

    const getAccessLevel = (role) => {
        if (role === 'ADMIN') return { icon: Shield, color: 'text-red-400', label: 'Full Access' };
        if (role === 'PRODUCT_MANAGER') return { icon: Edit, color: 'text-purple-400', label: 'Manager' };
        if (role === 'TEAM_LEAD') return { icon: Edit, color: 'text-amber-400', label: 'Lead' };
        return { icon: Eye, color: 'text-slate-400', label: 'Member' };
    };

    const getInitials = (user) => {
        if (user.firstName && user.lastName)
            return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
        return user.username?.[0]?.toUpperCase() || '?';
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4" />
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
                    <button onClick={fetchUsers} className="btn-secondary flex items-center gap-2">
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
                        <UserPlus className="h-4 w-4" />
                        Add Member
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="glass rounded-xl border border-slate-700/50 p-4 mb-6">
                <div className="flex flex-col md:flex-row gap-4">
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
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Name</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider">Role</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden lg:table-cell">Job Title</th>
                            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-400 uppercase tracking-wider hidden md:table-cell">Access Level</th>
                            <th className="px-6 py-4 text-right text-xs font-semibold text-slate-400 uppercase tracking-wider">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="px-6 py-12 text-center text-slate-400">
                                    {searchQuery || roleFilter !== 'all'
                                        ? 'No users match your filters'
                                        : 'No users found'}
                                </td>
                            </tr>
                        ) : (
                            filteredUsers.map((user) => {
                                const roleBadge = getRoleBadge(user.role);
                                const access = getAccessLevel(user.role);
                                const AccessIcon = access.icon;

                                return (
                                    <tr key={user.id} className="border-b border-slate-700/30 hover:bg-slate-800/30 transition-colors group">
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
                                                    <div className="text-sm text-slate-400">{user.email}</div>
                                                    <div className="text-xs text-slate-500">@{user.username}</div>
                                                    {user.jobTitle && (
                                                        <span className="inline-flex items-center gap-1 mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-600/30 text-slate-300 border border-slate-600/40 md:hidden">
                                                            <Briefcase className="h-3 w-3" />
                                                            {user.jobTitle}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Role selector */}
                                        <td className="px-6 py-4">
                                            <select
                                                value={user.role}
                                                onChange={(e) => handleUpdateRole(user.id, e.target.value)}
                                                className={`text-xs font-medium px-3 py-1.5 rounded-lg border
                                                           bg-transparent cursor-pointer focus:outline-none
                                                           ${roleBadge.text} ${roleBadge.border} ${roleBadge.bg}`}
                                            >
                                                <option value="TEAM_MEMBER">Team Member</option>
                                                <option value="TEAM_LEAD">Team Lead</option>
                                                <option value="PRODUCT_MANAGER">Product Manager</option>
                                                <option value="ADMIN">Admin</option>
                                            </select>
                                        </td>

                                        {/* Job Title */}
                                        <td className="px-6 py-4 hidden lg:table-cell">
                                            <select
                                                value={user.jobTitle || ''}
                                                onChange={(e) => handleUpdateJobTitle(user.id, e.target.value)}
                                                className="text-xs font-medium px-3 py-1.5 rounded-lg border
                                                           bg-transparent cursor-pointer focus:outline-none
                                                           text-slate-300 border-slate-600/40 bg-slate-600/20"
                                            >
                                                <option value="">— None —</option>
                                                {JOB_TITLE_OPTIONS.map(t => (
                                                    <option key={t} value={t}>{t}</option>
                                                ))}
                                            </select>
                                        </td>

                                        {/* Access Level */}
                                        <td className="px-6 py-4 hidden md:table-cell">
                                            <div className={`flex items-center gap-1.5 text-sm ${access.color}`}>
                                                <AccessIcon className="h-4 w-4" />
                                                {access.label}
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                {/* Reshare credentials */}
                                                <button
                                                    onClick={() => handleReshare(user)}
                                                    disabled={reshareLoading === user.id}
                                                    className="p-2 hover:bg-primary-500/10 rounded-lg text-slate-400
                                                               hover:text-primary-400 transition-colors opacity-0 group-hover:opacity-100
                                                               disabled:opacity-50"
                                                    title="Share credentials"
                                                >
                                                    {reshareLoading === user.id
                                                        ? <div className="w-4 h-4 border-2 border-primary-400/30 border-t-primary-400 rounded-full animate-spin" />
                                                        : <Share2 className="h-4 w-4" />
                                                    }
                                                </button>
                                                {/* Delete */}
                                                <button
                                                    onClick={() => handleDeleteUser(user.id)}
                                                    className="p-2 hover:bg-red-500/10 rounded-lg text-slate-400
                                                               hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Delete user"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        )}
                    </tbody>
                </table>
            </div>

            {/* Footer count */}
            <p className="text-sm text-slate-500 mt-4">
                Showing {filteredUsers.length} of {users.length} members
            </p>

            {/* Create User Modal */}
            {showCreateModal && (
                <CreateUserModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); fetchUsers(); }}
                />
            )}

            {/* Delete Confirm */}
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

            {/* Reshare Credentials Modal */}
            {reshareTarget && (
                <ShareCredentialsModal
                    credentials={reshareTarget}
                    onClose={() => setReshareTarget(null)}
                />
            )}
        </div>
    );
};


// ════════════════════════════════════════════════════════════════════════════
// CreateUserModal — with:
//   1. Live email validation meter
//   2. Password strength meter
//   3. Password generator button
//   4. Credential sharing step after creation
// ════════════════════════════════════════════════════════════════════════════

/**
 * Step 1 — Fill in user details and create the account.
 * Step 2 — "Share Credentials" screen shown after success,
 *           where admin can copy credentials or open a pre-filled mailto link.
 */
const CreateUserModal = ({ onClose, onCreated }) => {
    // ── form state ────────────────────────────────────────────────────────
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState(() => generatePassword());
    const [role, setRole] = useState('TEAM_MEMBER');
    const [jobTitle, setJobTitle] = useState('');
    const [showPassword, setShowPassword] = useState(false);

    // ── ui state ──────────────────────────────────────────────────────────
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    /** After a successful creation we move to the "share credentials" screen */
    const [createdCredentials, setCreatedCredentials] = useState(null); // { username, email, password }

    // ── validation ────────────────────────────────────────────────────────
    const { isValid: emailIsValid } = useEmailValidator(email);
    const passwordStrength = getPasswordStrength(password);

    // ── copy helpers ──────────────────────────────────────────────────────
    const { copied: copiedUser, copy: copyUser } = useCopy();
    const { copied: copiedPass, copy: copyPass } = useCopy();
    const { copied: copiedAll, copy: copyAll } = useCopy();

    // ── handlers ─────────────────────────────────────────────────────────
    const handleGenerate = () => setPassword(generatePassword());

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!emailIsValid) {
            setError('Please enter a valid email address');
            return;
        }
        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setLoading(true);
        try {
            const res = await api.post('/admin/users', { username, email, password, role, jobTitle: jobTitle || undefined });
            const userId = res.data?.id;
            const creds = { username, email, password };
            // Persist to localStorage so the Share button can show them anytime without resetting the password
            if (userId) {
                localStorage.setItem(`fl_creds_${userId}`, JSON.stringify(creds));
            }
            // Move to share-credentials step instead of just closing
            setCreatedCredentials(creds);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create user');
        } finally {
            setLoading(false);
        }
    };

    /** Build email subject and body for credential sharing */
    const getEmailContent = () => {
        const subject = 'Your FlowLite Account Credentials';
        const body =
            `Hi ${createdCredentials?.username},\n\n` +
            `Your FlowLite account has been created.\n\n` +
            `Username: ${createdCredentials?.username}\n` +
            `Email:    ${createdCredentials?.email}\n` +
            `Password: ${createdCredentials?.password}\n\n` +
            `Please log in at ${window.location.origin}/login and change your password after your first sign-in.\n\n` +
            `Regards,\nYour Admin`;
        return { subject, body };
    };

    /** Build a mailto: link for native mail apps (Outlook, Thunderbird, etc.) */
    const buildMailtoLink = () => {
        const { subject, body } = getEmailContent();
        return `mailto:${createdCredentials?.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    /** Build a Gmail compose URL that opens directly in the browser */
    const buildGmailLink = () => {
        const { subject, body } = getEmailContent();
        return `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(createdCredentials?.email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const handleDone = () => {
        onCreated();
    };

    // ─────────────────────────────────────────────────────────────────────
    // RENDER — Step 2: Share credentials
    // ─────────────────────────────────────────────────────────────────────
    if (createdCredentials) {
        const allText =
            `Username: ${createdCredentials.username}\n` +
            `Email:    ${createdCredentials.email}\n` +
            `Password: ${createdCredentials.password}`;

        return createPortal(
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleDone} />

                <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl flex flex-col animate-slide-up"
                    style={{ maxHeight: '90vh' }}>

                    {/* Header */}
                    <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-green-500/20">
                                <CheckCircle2 className="h-5 w-5 text-green-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-slate-100">Account Created!</h2>
                                <p className="text-xs text-slate-400 mt-0.5">Share credentials with the new member</p>
                            </div>
                        </div>
                        <button onClick={handleDone} className="p-2 hover:bg-slate-700/50 rounded-lg">
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>

                    {/* Body */}
                    <div className="flex-1 overflow-y-auto p-6 space-y-4">

                        {/* Success banner */}
                        <div className="flex items-center gap-3 p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                            <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
                            <p className="text-sm text-green-300">
                                <span className="font-semibold">@{createdCredentials.username}</span> has been added to your organization.
                            </p>
                        </div>

                        {/* Security warning */}
                        <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-xl">
                            <Key className="h-4 w-4 text-amber-400 mt-0.5 shrink-0" />
                            <p className="text-xs text-amber-300 leading-relaxed">
                                Share these credentials securely. The password is shown only once — ask the user to change it on first login.
                            </p>
                        </div>

                        {/* Credential cards */}
                        <div className="space-y-3">
                            {/* Username */}
                            <CredentialRow
                                icon={<Users className="h-4 w-4 text-primary-400" />}
                                label="Username"
                                value={createdCredentials.username}
                                copied={copiedUser}
                                onCopy={() => copyUser(createdCredentials.username)}
                            />
                            {/* Email */}
                            <CredentialRow
                                icon={<Mail className="h-4 w-4 text-sky-400" />}
                                label="Email"
                                value={createdCredentials.email}
                                copied={false}
                                onCopy={() => navigator.clipboard.writeText(createdCredentials.email)}
                            />
                            {/* Password */}
                            <CredentialRow
                                icon={<Key className="h-4 w-4 text-amber-400" />}
                                label="Password"
                                value={createdCredentials.password}
                                copied={copiedPass}
                                onCopy={() => copyPass(createdCredentials.password)}
                                secret
                            />
                        </div>

                        {/* Copy all */}
                        <button
                            onClick={() => copyAll(allText)}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                       bg-slate-700/50 border border-slate-600/50 text-slate-300 text-sm
                                       hover:bg-slate-700 transition-colors"
                        >
                            {copiedAll
                                ? <><Check className="h-4 w-4 text-green-400" /> Copied all!</>
                                : <><ClipboardCopy className="h-4 w-4" /> Copy all credentials</>
                            }
                        </button>

                        {/* Divider */}
                        <div className="flex items-center gap-3">
                            <div className="flex-1 h-px bg-slate-700/50" />
                            <span className="text-xs text-slate-500">or send by email</span>
                            <div className="flex-1 h-px bg-slate-700/50" />
                        </div>

                        {/* Email options */}
                        <div className="grid grid-cols-2 gap-3">
                            {/* Open in Gmail */}
                            <a
                                href={buildGmailLink()}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                           bg-red-500/15 border border-red-500/30 text-red-300 text-sm
                                           hover:bg-red-500/25 transition-colors"
                            >
                                <Mail className="h-4 w-4" />
                                Open in Gmail
                            </a>
                            {/* Open in default mail app */}
                            <a
                                href={buildMailtoLink()}
                                className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                           bg-primary-500/20 border border-primary-500/30 text-primary-300 text-sm
                                           hover:bg-primary-500/30 transition-colors"
                            >
                                <Mail className="h-4 w-4" />
                                Mail App
                            </a>
                        </div>

                        <p className="text-xs text-center text-slate-500">
                            Opens a pre-filled email with credentials. Nothing is sent automatically.
                        </p>
                    </div>

                    {/* Footer */}
                    <div className="flex-shrink-0 p-4 border-t border-slate-700/50">
                        <button onClick={handleDone} className="w-full btn-primary">
                            Done
                        </button>
                    </div>
                </div>
            </div>,
            document.body
        );
    }

    // ─────────────────────────────────────────────────────────────────────
    // RENDER — Step 1: Create user form
    // ─────────────────────────────────────────────────────────────────────
    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl flex flex-col animate-slide-up"
                style={{ maxHeight: '90vh' }}>

                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary-500/20">
                            <UserPlus className="h-5 w-5 text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-100">Add New Member</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Credentials will be shown after creation</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-lg">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Form body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Username */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Username</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="input-field"
                            placeholder="johndoe"
                            required
                        />
                    </div>

                    {/* Email with live validator */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Email</label>
                        <input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className={`input-field transition-colors ${email.length > 0
                                ? emailIsValid
                                    ? 'border-green-500/40 focus:border-green-500'
                                    : 'border-amber-500/40 focus:border-amber-500'
                                : ''
                                }`}
                            placeholder="john@company.com"
                            required
                        />
                        {/* Live email validation — identical UX to password strength meter */}
                        <EmailStrengthMeter email={email} show={email.length > 0} />
                    </div>

                    {/* Password with strength + generator */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-sm font-medium text-slate-300">Password</label>
                            <button
                                type="button"
                                onClick={handleGenerate}
                                className="flex items-center gap-1.5 text-xs text-primary-400 hover:text-primary-300
                                           px-2 py-1 rounded-lg hover:bg-primary-500/10 transition-colors"
                                title="Generate a random strong password"
                            >
                                <Shuffle className="h-3.5 w-3.5" />
                                Generate
                            </button>
                        </div>
                        <div className="relative">
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="input-field pr-10"
                                required
                                minLength={6}
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
                            >
                                {showPassword
                                    ? <EyeOff className="h-4 w-4" />
                                    : <Eye className="h-4 w-4" />}
                            </button>
                        </div>

                        {/* Password strength meter */}
                        {password && (
                            <div className="mt-2">
                                <div className="flex gap-1 mb-1">
                                    {[1, 2, 3, 4, 5].map((i) => (
                                        <div
                                            key={i}
                                            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${i <= passwordStrength.level
                                                ? passwordStrength.color
                                                : 'bg-slate-700'
                                                }`}
                                        />
                                    ))}
                                </div>
                                <p className={`text-xs font-medium ${passwordStrength.textColor}`}>
                                    {passwordStrength.label}
                                </p>
                            </div>
                        )}
                    </div>

                    {/* Role */}
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

                    {/* Job Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Job Title <span className="text-slate-500 font-normal">(optional)</span></label>
                        <div className="relative">
                            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <select
                                value={jobTitle}
                                onChange={(e) => setJobTitle(e.target.value)}
                                className="input-field pl-10"
                            >
                                <option value="">— No job title —</option>
                                {JOB_TITLE_OPTIONS.map(t => (
                                    <option key={t} value={t}>{t}</option>
                                ))}
                            </select>
                        </div>
                        <p className="text-xs text-slate-500 mt-1">Metadata only — does not affect permissions.</p>
                    </div>

                    {/* Info note */}
                    <div className="flex items-start gap-2 p-3 bg-slate-800/50 border border-slate-700/30 rounded-xl">
                        <Share2 className="h-4 w-4 text-slate-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-400 leading-relaxed">
                            After creating the account you will see a <span className="text-slate-200 font-medium">Share Credentials</span> screen
                            where you can copy or email the login details to the new member.
                        </p>
                    </div>
                </form>

                {/* Footer */}
                <div className="flex-shrink-0 flex gap-3 p-6 border-t border-slate-700/50">
                    <button type="button" onClick={onClose} className="flex-1 btn-secondary" disabled={loading}>
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading || !emailIsValid || password.length < 6}
                        className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading
                            ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            : <UserPlus className="h-4 w-4" />}
                        {loading ? 'Creating...' : 'Create & Share'}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};


// ─── Small sub-component: single credential row ───────────────────────────────
const CredentialRow = ({ icon, label, value, copied, onCopy, secret = false }) => {
    const [revealed, setRevealed] = useState(!secret);
    return (
        <div className="flex items-center gap-3 p-3 bg-slate-800/50 rounded-xl border border-slate-700/50">
            <div className="shrink-0">{icon}</div>
            <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-500 mb-0.5">{label}</p>
                <p className="text-sm font-mono text-slate-100 truncate">
                    {secret && !revealed ? '••••••••' : value}
                </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
                {secret && (
                    <button
                        onClick={() => setRevealed(!revealed)}
                        className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                        title={revealed ? 'Hide' : 'Show'}
                    >
                        {revealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                    </button>
                )}
                <button
                    onClick={onCopy}
                    className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-slate-200 transition-colors"
                    title="Copy"
                >
                    {copied
                        ? <Check className="h-3.5 w-3.5 text-green-400" />
                        : <Copy className="h-3.5 w-3.5" />}
                </button>
            </div>
        </div>
    );
};


// ─── Share Credentials Modal ──────────────────────────────────────────────────
const ShareCredentialsModal = ({ credentials, onClose }) => {
    const { copied: copiedUser, copy: copyUser } = useCopy();
    const { copied: copiedPass, copy: copyPass } = useCopy();
    const { copied: copiedAll, copy: copyAll } = useCopy();

    const allText =
        `Username: ${credentials.username}\n` +
        `Email:    ${credentials.email}\n` +
        `Password: ${credentials.password}`;

    const getEmailContent = () => {
        const subject = 'Your FlowLite Account — Password Reset';
        const body =
            `Hi ${credentials.username},\n\n` +
            `Your FlowLite password has been reset by an admin.\n\n` +
            `Username: ${credentials.username}\n` +
            `Email:    ${credentials.email}\n` +
            `Password: ${credentials.password}\n\n` +
            `Please log in at ${window.location.origin}/login and change your password immediately.\n\n` +
            `Regards,\nYour Admin`;
        return { subject, body };
    };

    const buildMailtoLink = () => {
        const { subject, body } = getEmailContent();
        return `mailto:${credentials.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    const buildGmailLink = () => {
        const { subject, body } = getEmailContent();
        return `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(credentials.email || '')}&su=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl flex flex-col animate-slide-up"
                style={{ maxHeight: '90vh' }}>

                {/* Header */}
                <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary-500/20">
                            <Share2 className="h-5 w-5 text-primary-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-slate-100">Share Credentials</h2>
                            <p className="text-xs text-slate-400 mt-0.5">Login details for @{credentials.username}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-lg">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="flex-1 overflow-y-auto p-6 space-y-4">

                    {/* Info banner */}
                    <div className="flex items-start gap-3 p-3 bg-primary-500/10 border border-primary-500/20 rounded-xl">
                        <Key className="h-4 w-4 text-primary-400 mt-0.5 shrink-0" />
                        <p className="text-xs text-slate-300 leading-relaxed">
                            Share these credentials securely. Ask the user to change their password after signing in.
                        </p>
                    </div>

                    {/* Credential cards */}
                    <div className="space-y-3">
                        <CredentialRow
                            icon={<Users className="h-4 w-4 text-primary-400" />}
                            label="Username"
                            value={credentials.username}
                            copied={copiedUser}
                            onCopy={() => copyUser(credentials.username)}
                        />
                        <CredentialRow
                            icon={<Mail className="h-4 w-4 text-sky-400" />}
                            label="Email"
                            value={credentials.email}
                            copied={false}
                            onCopy={() => navigator.clipboard.writeText(credentials.email)}
                        />
                        <CredentialRow
                            icon={<Key className="h-4 w-4 text-amber-400" />}
                            label="Password"
                            value={credentials.password}
                            copied={copiedPass}
                            onCopy={() => copyPass(credentials.password)}
                            secret
                        />
                    </div>

                    {/* Copy all */}
                    <button
                        onClick={() => copyAll(allText)}
                        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                   bg-slate-700/50 border border-slate-600/50 text-slate-300 text-sm
                                   hover:bg-slate-700 transition-colors"
                    >
                        {copiedAll
                            ? <><Check className="h-4 w-4 text-green-400" /> Copied all!</>
                            : <><ClipboardCopy className="h-4 w-4" /> Copy all credentials</>
                        }
                    </button>

                    {/* Divider */}
                    <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-slate-700/50" />
                        <span className="text-xs text-slate-500">or send by email</span>
                        <div className="flex-1 h-px bg-slate-700/50" />
                    </div>

                    {/* Email options */}
                    <div className="grid grid-cols-2 gap-3">
                        <a
                            href={buildGmailLink()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                       bg-red-500/15 border border-red-500/30 text-red-300 text-sm
                                       hover:bg-red-500/25 transition-colors"
                        >
                            <Mail className="h-4 w-4" />
                            Open in Gmail
                        </a>
                        <a
                            href={buildMailtoLink()}
                            className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl
                                       bg-primary-500/20 border border-primary-500/30 text-primary-300 text-sm
                                       hover:bg-primary-500/30 transition-colors"
                        >
                            <Mail className="h-4 w-4" />
                            Mail App
                        </a>
                    </div>

                    <p className="text-xs text-center text-slate-500">
                        Opens a pre-filled email with the new credentials. Nothing is sent automatically.
                    </p>
                </div>

                {/* Footer */}
                <div className="flex-shrink-0 p-4 border-t border-slate-700/50">
                    <button onClick={onClose} className="w-full btn-primary">
                        Done
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};


export default AdminUsers;
