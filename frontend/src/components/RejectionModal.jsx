import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X, AlertCircle, RotateCcw } from 'lucide-react';

// ✅ FIX: React Portal — see ArchiveTaskModal.jsx for full explanation.
// Framer-motion's CSS transform on TaskCard creates a stacking context that
// traps fixed-position children. Portal teleports to document.body to escape it.

const RejectionModal = ({ isOpen, onClose, onReject, taskTitle, loading }) => {
    const [reason, setReason] = useState('');
    const [error, setError] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();

        if (!reason.trim()) {
            setError('Rejection reason is required');
            return;
        }

        if (reason.trim().length < 10) {
            setError('Please provide a more detailed reason (at least 10 characters)');
            return;
        }

        onReject(reason.trim());
    };

    const handleClose = () => {
        setReason('');
        setError('');
        onClose();
    };

    if (!isOpen) return null;

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
                        <div className="p-2 rounded-lg bg-red-500/20">
                            <RotateCcw className="h-5 w-5 text-red-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100">Reject Task</h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                    >
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="text-sm text-slate-400">Task being rejected:</p>
                        <p className="font-medium text-slate-200 mt-1">{taskTitle}</p>
                    </div>

                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Rejection Reason <span className="text-red-400">*</span>
                        </label>
                        <textarea
                            value={reason}
                            onChange={(e) => {
                                setReason(e.target.value);
                                setError('');
                            }}
                            className="input-field min-h-[120px] resize-none"
                            placeholder="Please explain why this task is being rejected and what changes are needed..."
                            rows={4}
                            required
                        />
                        <p className="text-xs text-slate-500 mt-2">
                            This reason will be visible to the assignee
                        </p>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button
                            type="button"
                            onClick={handleClose}
                            className="flex-1 btn-secondary"
                            disabled={loading}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={loading || !reason.trim()}
                            className="flex-1 btn-danger flex items-center justify-center gap-2 disabled:opacity-50"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <RotateCcw className="h-5 w-5" />
                                    Reject Task
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
};

export default RejectionModal;
