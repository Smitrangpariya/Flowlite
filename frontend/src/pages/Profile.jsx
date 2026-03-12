import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import { User, Mail, Lock, Save, AlertCircle, CheckCircle, Briefcase } from 'lucide-react';

const JOB_TITLE_OPTIONS = [
    'Product Owner',
    'Software Developer',
    'QA Engineer',
    'Scrum Master',
    'DevOps Engineer',
    'Architect',
    'Business Analyst',
];

const Profile = () => {
    const { user, refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState({ type: '', text: '' });

    // Profile Form State
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        email: '',
        jobTitle: ''
    });

    const [isCustomJobTitle, setIsCustomJobTitle] = useState(false);

    // Password Form State
    const [passwordData, setPasswordData] = useState({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
    });

    useEffect(() => {
        if (user) {
            const currentJobTitle = user.jobTitle || '';
            const isCustom = currentJobTitle && !JOB_TITLE_OPTIONS.includes(currentJobTitle);
            setIsCustomJobTitle(isCustom);
            setFormData({
                firstName: user.firstName || '',
                lastName: user.lastName || '',
                email: user.email || '',
                jobTitle: currentJobTitle
            });
        }
    }, [user]);

    const handleJobTitleChange = (e) => {
        const value = e.target.value;
        if (value === '__custom__') {
            setIsCustomJobTitle(true);
            setFormData({ ...formData, jobTitle: '' });
        } else {
            setIsCustomJobTitle(false);
            setFormData({ ...formData, jobTitle: value });
        }
    };

    const handleProfileUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            const response = await api.put('/users/me', formData);

            setMessage({ type: 'success', text: 'Profile updated successfully!' });

            // B5/B11 fix: refresh context from server instead of full page reload
            await refreshUser();

        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.message || 'Failed to update profile'
            });
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        if (passwordData.newPassword !== passwordData.confirmPassword) {
            setMessage({ type: 'error', text: 'New passwords do not match' });
            return;
        }

        setLoading(true);
        setMessage({ type: '', text: '' });

        try {
            await api.post('/users/me/password', {
                currentPassword: passwordData.currentPassword,
                newPassword: passwordData.newPassword
            });

            setMessage({ type: 'success', text: 'Password changed successfully!' });
            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        } catch (error) {
            setMessage({
                type: 'error',
                text: error.response?.data?.error || 'Failed to change password'
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto px-4 py-8">
            <h1 className="text-3xl font-bold text-white mb-8">My Profile</h1>

            {message.text && (
                <div className={`p-4 rounded-lg mb-6 flex items-center gap-2 ${message.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                    {message.type === 'success' ? <CheckCircle className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Profile Details */}
                <div className="glass p-6 rounded-xl border border-slate-700/50">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <User className="h-5 w-5 text-primary-400" />
                        Personal Details
                    </h2>

                    <form onSubmit={handleProfileUpdate} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">First Name</label>
                            <input
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                required
                                minLength={2}
                                maxLength={50}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Last Name</label>
                            <input
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                required
                                minLength={2}
                                maxLength={50}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Email</label>
                            <div className="relative">
                                <Mail className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                    required
                                />
                            </div>
                        </div>

                        {/* Job Title */}
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Job Title</label>
                            <div className="relative">
                                <Briefcase className="absolute left-3 top-2.5 h-5 w-5 text-slate-500" />
                                {isCustomJobTitle ? (
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={formData.jobTitle}
                                            onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                                            placeholder="Enter custom job title"
                                            className="flex-1 pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                            maxLength={100}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => { setIsCustomJobTitle(false); setFormData({ ...formData, jobTitle: '' }); }}
                                            className="px-3 py-2 text-xs text-slate-400 hover:text-slate-200 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
                                        >
                                            Preset
                                        </button>
                                    </div>
                                ) : (
                                    <select
                                        value={formData.jobTitle}
                                        onChange={handleJobTitleChange}
                                        className="w-full pl-10 pr-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500 appearance-none"
                                    >
                                        <option value="">— No job title —</option>
                                        {JOB_TITLE_OPTIONS.map(title => (
                                            <option key={title} value={title}>{title}</option>
                                        ))}
                                        <option value="__custom__">Custom...</option>
                                    </select>
                                )}
                            </div>
                            <p className="text-xs text-slate-500 mt-1">Displayed as a badge — does not affect permissions.</p>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors mt-4"
                        >
                            <Save className="h-4 w-4" />
                            Update Profile
                        </button>
                    </form>
                </div>

                {/* Change Password */}
                <div className="glass p-6 rounded-xl border border-slate-700/50">
                    <h2 className="text-xl font-semibold text-white mb-6 flex items-center gap-2">
                        <Lock className="h-5 w-5 text-primary-400" />
                        Change Password
                    </h2>

                    <form onSubmit={handlePasswordChange} className="space-y-4">
                        {/* Hidden username field for browser accessibility (password managers) */}
                        <input
                            type="text"
                            name="username"
                            autoComplete="username"
                            value={user?.username || ''}
                            readOnly
                            className="hidden"
                            aria-hidden="true"
                        />
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Current Password</label>
                            <input
                                type="password"
                                value={passwordData.currentPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                autoComplete="current-password"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">New Password</label>
                            <input
                                type="password"
                                value={passwordData.newPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                autoComplete="new-password"
                                required
                                minLength={8}
                            />
                            <p className="text-xs text-slate-500 mt-1">Min. 8 chars, mix of logic.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-slate-400 mb-1">Confirm New Password</label>
                            <input
                                type="password"
                                value={passwordData.confirmPassword}
                                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                                className="w-full px-4 py-2 bg-slate-800/50 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-primary-500"
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors mt-4"
                        >
                            <Lock className="h-4 w-4" />
                            Change Password
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};

export default Profile;
