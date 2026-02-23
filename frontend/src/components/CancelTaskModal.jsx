import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, XCircle } from 'lucide-react';

// ✅ FIX: React Portal — see ArchiveTaskModal.jsx for full explanation.
// Framer-motion's CSS transform on TaskCard creates a stacking context that
// traps fixed-position children. Portal teleports to document.body to escape it.

const CancelTaskModal = ({ isOpen, onClose, onConfirm, taskTitle, loading }) => {
    const [reason, setReason] = useState('');

    if (!isOpen) return null;

    const handleConfirm = () => {
        onConfirm(reason);
        setReason('');
    };

    const handleClose = () => {
        setReason('');
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl animate-slide-up">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/20">
                            <XCircle className="h-5 w-5 text-amber-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100">Cancel Task</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-4">
                    <p className="text-slate-300">
                        Cancel this task?
                    </p>
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="font-medium text-slate-200">{taskTitle}</p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Cancellation Reason (Optional)
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder="Why is this task being cancelled?"
                            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-100 placeholder-slate-500 resize-none"
                            rows="4"
                            disabled={loading}
                        />
                    </div>
                </div>

                {/* Footer */}
                <div className="flex gap-3 p-6 border-t border-slate-700/50">
                    <button
                        onClick={handleClose}
                        className="flex-1 btn-secondary"
                        disabled={loading}
                    >
                        Close
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={loading}
                        className="flex-1 btn-danger flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Cancel Task'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default CancelTaskModal;
