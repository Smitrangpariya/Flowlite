import { X, AlertTriangle } from 'lucide-react';

const ConfirmModal = ({ isOpen, onClose, onConfirm, title, message, itemName, confirmText = 'Confirm', loading, variant = 'danger' }) => {
    if (!isOpen) return null;

    const variantStyles = {
        danger: {
            iconBg: 'bg-red-500/20',
            iconColor: 'text-red-400',
            button: 'btn-danger',
        },
        warning: {
            iconBg: 'bg-amber-500/20',
            iconColor: 'text-amber-400',
            button: 'bg-amber-600 hover:bg-amber-500 text-white font-medium py-2 px-4 rounded-xl transition-colors',
        },
    };

    const styles = variantStyles[variant] || variantStyles.danger;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${styles.iconBg}`}>
                            <AlertTriangle className={`h-5 w-5 ${styles.iconColor}`} />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100">{title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-slate-300">{message}</p>
                    {itemName && (
                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                            <p className="font-medium text-slate-200">{itemName}</p>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-slate-700/50">
                    <button
                        onClick={onClose}
                        className="flex-1 btn-secondary"
                        disabled={loading}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={loading}
                        className={`flex-1 flex items-center justify-center gap-2 disabled:opacity-50 ${styles.button}`}
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            confirmText
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ConfirmModal;
