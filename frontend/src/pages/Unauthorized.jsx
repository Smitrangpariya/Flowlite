import { Link } from 'react-router-dom';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

const Unauthorized = () => {
    return (
        <div className="min-h-screen flex items-center justify-center p-4">
            <div className="text-center max-w-md">
                <div className="inline-flex items-center justify-center p-4 rounded-2xl bg-red-500/20 mb-6">
                    <ShieldAlert className="h-12 w-12 text-red-400" />
                </div>

                <h1 className="text-3xl font-bold text-slate-100 mb-4">
                    Access Denied
                </h1>

                <p className="text-slate-400 mb-8">
                    You don't have permission to access this page.
                    Please contact your administrator if you believe this is an error.
                </p>

                <Link
                    to="/"
                    className="btn-primary inline-flex items-center gap-2"
                >
                    <ArrowLeft className="h-4 w-4" />
                    Back to Dashboard
                </Link>
            </div>
        </div>
    );
};

export default Unauthorized;
