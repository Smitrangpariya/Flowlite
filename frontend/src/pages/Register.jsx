import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { UserPlus, AlertCircle, Eye, EyeOff, Building2 } from 'lucide-react';
import logo from '../assets/logo.png';
import EmailStrengthMeter from '../components/EmailStrengthMeter';

// ✅ ADDED: Live email validation meter (same UX pattern as password strength).
//    EmailStrengthMeter appears as soon as the user starts typing and shows
//    per-rule pass/fail checks with a segmented progress bar.

const Register = () => {
    const [username, setUsername]             = useState('');
    const [email, setEmail]                   = useState('');
    const [password, setPassword]             = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [organizationName, setOrganizationName] = useState('');
    const [showPassword, setShowPassword]     = useState(false);
    const [error, setError]                   = useState('');
    const [loading, setLoading]               = useState(false);
    const { register }                        = useAuth();
    const navigate                            = useNavigate();

    // ── Password strength (existing logic) ──────────────────────────────────
    const getPasswordStrength = (pwd) => {
        if (!pwd) return { level: 0, label: '', color: '' };
        let score = 0;
        if (pwd.length >= 8)              score++;
        if (/[A-Z]/.test(pwd))            score++;
        if (/[a-z]/.test(pwd))            score++;
        if (/[0-9]/.test(pwd))            score++;
        if (/[^A-Za-z0-9]/.test(pwd))     score++;

        if (score <= 1) return { level: 1, label: 'Weak',   color: 'bg-red-500',    textColor: 'text-red-400'   };
        if (score <= 2) return { level: 2, label: 'Fair',   color: 'bg-amber-500',  textColor: 'text-amber-400' };
        if (score <= 3) return { level: 3, label: 'Good',   color: 'bg-yellow-500', textColor: 'text-yellow-400'};
        if (score <= 4) return { level: 4, label: 'Strong', color: 'bg-green-500',  textColor: 'text-green-400' };
        return               { level: 5, label: 'Very Strong', color: 'bg-emerald-500', textColor: 'text-emerald-400' };
    };

    const passwordStrength = getPasswordStrength(password);

    // ────────────────────────────────────────────────────────────────────────

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password !== confirmPassword) {
            const msg = 'Passwords do not match';
            setError(msg);
            toast.error(msg);
            return;
        }
        if (password.length < 6) {
            const msg = 'Password must be at least 6 characters';
            setError(msg);
            toast.error(msg);
            return;
        }
        if (organizationName.trim().length < 2) {
            const msg = 'Organization name must be at least 2 characters';
            setError(msg);
            toast.error(msg);
            return;
        }

        setLoading(true);
        try {
            const result = await register(username, password, email, organizationName.trim());
            if (result.success) {
                toast.success('Organization created! You are now the admin.');
                navigate('/');
            } else {
                const msg = result.error || 'Registration failed';
                setError(msg);
                toast.error(msg);
            }
        } catch (err) {
            const msg = 'An unexpected error occurred. Please try again.';
            setError(msg);
            toast.error(msg);
            console.error('Registration error:', err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl" />
            </div>

            <div className="w-full max-w-md relative z-10">
                {/* Logo */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center mb-4">
                        <img
                            src={logo}
                            alt="FlowLite"
                            className="h-20 w-20 rounded-2xl shadow-2xl shadow-primary-500/25 object-cover"
                        />
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
                        <div className="flex items-center gap-2 p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-5">

                        {/* Organization Name */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                <Building2 className="inline h-4 w-4 mr-1 text-slate-400" />
                                Organization Name
                            </label>
                            <input
                                type="text"
                                value={organizationName}
                                onChange={(e) => setOrganizationName(e.target.value)}
                                className="input-field"
                                placeholder="Acme Corp"
                                required
                                minLength={2}
                            />
                        </div>

                        {/* Username */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Username
                            </label>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="input-field"
                                placeholder="johndoe"
                                autoComplete="username"
                                required
                            />
                        </div>

                        {/* ── Email with live validator ── */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Email
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="input-field"
                                placeholder="john@acme.com"
                                autoComplete="email"
                                required
                            />
                            {/* Live email validation — appears as user types */}
                            <EmailStrengthMeter email={email} show={email.length > 0} />
                        </div>

                        {/* Password with strength meter */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Password
                            </label>
                            <div className="relative">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="input-field pr-10"
                                    placeholder="Min. 6 characters"
                                    autoComplete="new-password"
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
                                        : <Eye    className="h-4 w-4" />}
                                </button>
                            </div>

                            {/* Password strength meter */}
                            {password && (
                                <div className="mt-2">
                                    <div className="flex gap-1 mb-1">
                                        {[1, 2, 3, 4, 5].map((i) => (
                                            <div
                                                key={i}
                                                className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                                                    i <= passwordStrength.level
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

                        {/* Confirm Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-300 mb-2">
                                Confirm Password
                            </label>
                            <input
                                type={showPassword ? 'text' : 'password'}
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                className={`input-field ${
                                    confirmPassword && confirmPassword !== password
                                        ? 'border-red-500/50 focus:border-red-500'
                                        : confirmPassword && confirmPassword === password
                                            ? 'border-green-500/50 focus:border-green-500'
                                            : ''
                                }`}
                                placeholder="Repeat your password"
                                autoComplete="new-password"
                                required
                            />
                            {confirmPassword && confirmPassword !== password && (
                                <p className="text-xs text-red-400 mt-1">Passwords do not match</p>
                            )}
                            {confirmPassword && confirmPassword === password && (
                                <p className="text-xs text-green-400 mt-1">✓ Passwords match</p>
                            )}
                        </div>

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full btn-primary flex items-center justify-center gap-2 mt-2"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <UserPlus className="h-5 w-5" />
                            )}
                            {loading ? 'Creating...' : 'Create Organization'}
                        </button>
                    </form>

                    <p className="text-center text-sm text-slate-400 mt-6">
                        Already have an account?{' '}
                        <Link to="/login" className="text-primary-400 hover:text-primary-300 font-medium">
                            Sign in
                        </Link>
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Register;
