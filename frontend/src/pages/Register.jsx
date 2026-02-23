import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { UserPlus, AlertCircle, Eye, EyeOff, Building2 } from 'lucide-react';
import logo from '../assets/logo.png';

const Register = () => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Validation
        if (password !== confirmPassword) {
            const errorMsg = 'Passwords do not match';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        if (password.length < 6) {
            const errorMsg = 'Password must be at least 6 characters';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        if (organizationName.trim().length < 2) {
            const errorMsg = 'Organization name must be at least 2 characters';
            setError(errorMsg);
            toast.error(errorMsg);
            return;
        }

        setLoading(true);

        try {
            const result = await register(username, password, email, organizationName.trim());

            if (result.success) {
                toast.success('Organization created! You are now the admin.');
                navigate('/');
            } else {
                const errorMsg = result.error || 'Registration failed';
                setError(errorMsg);
                toast.error(errorMsg);
            }
        } catch (err) {
            const errorMsg = 'An unexpected error occurred. Please try again.';
            setError(errorMsg);
            toast.error(errorMsg);
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-4">
                        <img src={logo} alt="FlowLite" className="h-20 w-20 rounded-2xl shadow-2xl shadow-primary-500/25 object-cover" />
                    </div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
                        FlowLite
                    </h1>
                    <p className="text-slate-400 mt-2">Create your organization</p>
                </div>

                {/* Register Card */}
                <div className="glass rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-xl font-semibold text-slate-100 mb-6 text-center">
                        Get Started
                    </h2>

                    {error && (
                        <div className="flex items-center gap-2 p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm animate-fade-in">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {/* Organization Name - Highlighted */}
                        <div className="p-4 bg-primary-500/5 border border-primary-500/20 rounded-xl">
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 text-primary-400" />
                                    Organization Name
                                </div>
                            </label>
                            <input
                                type="text"
                                value={organizationName}
                                onChange={(e) => setOrganizationName(e.target.value)}
                                className="input-field"
                                placeholder="Your company or team name"
                                autoComplete="organization"
                                required
                                minLength={2}
                            />
                            <p className="text-xs text-slate-400 mt-2">
                                You'll be the admin of this organization
                            </p>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input-field"
                                placeholder="Choose a username"
                                autoComplete="username"
                                required
                                minLength={3}
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="Enter your email"
                                autoComplete="email"
                                required
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pr-12"
                                    placeholder="Create a password"
                                    autoComplete="new-password"
                                    required
                                    minLength={8}
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300 transition-colors"
                                >
                                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                </button>
                            </div>

                            {/* Password Strength Indicator */}
                            {password && (() => {
                                let strength = 0;
                                if (password.length >= 8) strength++;
                                if (password.length >= 12) strength++;
                                if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
                                if (/\d/.test(password)) strength++;
                                if (/[^a-zA-Z0-9]/.test(password)) strength++;

                                const labels = ['', 'Weak', 'Weak', 'Fair', 'Good', 'Strong'];
                                const colors = ['', 'bg-red-500', 'bg-red-500', 'bg-yellow-500', 'bg-blue-500', 'bg-green-500'];
                                const textColors = ['', 'text-red-400', 'text-red-400', 'text-yellow-400', 'text-blue-400', 'text-green-400'];

                                return (
                                    <div className="mt-2">
                                        <div className="flex gap-1 mb-1">
                                            {[...Array(5)].map((_, i) => (
                                                <div key={i} className={`h-1 flex-1 rounded ${i < strength ? colors[strength] : 'bg-slate-700'}`} />
                                            ))}
                                        </div>
                                        <p className={`text-xs ${textColors[strength]}`}>
                                            Password strength: {labels[strength]}
                                        </p>
                                    </div>
                                );
                            })()}
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className="input-field"
                                placeholder="Confirm your password"
                                autoComplete="new-password"
                                required
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary py-3 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            ) : (
                                <>
                                    <UserPlus className="h-5 w-5" />
                                    Create Organization
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-6 text-center">
                        <p className="text-slate-400 text-sm">
                            Already have an account?{' '}
                            <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                                Sign in
                            </Link>
                        </p>
                    </div>
                </div>

                {/* Note */}
                <p className="text-center text-sm text-slate-500 mt-6">
                    Need to join an existing organization? Ask your admin to add you.
                </p>
            </div>
        </div>
    );
};

export default Register;