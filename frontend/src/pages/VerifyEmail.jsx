import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { CheckCircle, XCircle, Loader } from 'lucide-react';
import api from '../api/axiosConfig';
import logo from '../assets/logo.png';

const VerifyEmail = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) {
            setStatus('error');
            setMessage('Invalid verification link');
            return;
        }

        const verifyEmail = async () => {
            try {
                const response = await api.get(`/auth/verify-email?token=${token}`);
                setStatus('success');
                setMessage(response.data.message);
                setTimeout(() => navigate('/login'), 3000);
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.error || 'Verification failed');
            }
        };

        verifyEmail();
    }, [token, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            {/* Background Effects */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-500/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-500/20 rounded-full blur-3xl"></div>
            </div>

            <div className="w-full max-w-md text-center relative z-10">
                <img src={logo} alt="FlowLite" className="h-16 w-16 mx-auto mb-6 rounded-xl shadow-lg" />

                {status === 'verifying' && (
                    <>
                        <Loader className="h-12 w-12 mx-auto mb-4 text-primary-400 animate-spin" />
                        <h1 className="text-2xl font-bold text-slate-100 mb-2">
                            Verifying Email...
                        </h1>
                        <p className="text-slate-400">Please wait</p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div className="inline-flex items-center justify-center p-4 rounded-full bg-green-500/20 mb-6">
                            <CheckCircle className="h-12 w-12 text-green-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-100 mb-2">
                            Email Verified!
                        </h1>
                        <p className="text-slate-400 mb-4">{message}</p>
                        <p className="text-sm text-slate-500">Redirecting to login...</p>
                    </>
                )}

                {status === 'error' && (
                    <>
                        <div className="inline-flex items-center justify-center p-4 rounded-full bg-red-500/20 mb-6">
                            <XCircle className="h-12 w-12 text-red-400" />
                        </div>
                        <h1 className="text-2xl font-bold text-slate-100 mb-2">
                            Verification Failed
                        </h1>
                        <p className="text-slate-400 mb-6">{message}</p>
                        <Link
                            to="/login"
                            className="btn-primary inline-block"
                        >
                            Go to Login
                        </Link>
                    </>
                )}
            </div>
        </div>
    );
};

export default VerifyEmail;
