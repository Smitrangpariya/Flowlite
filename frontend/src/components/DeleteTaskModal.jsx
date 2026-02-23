import { createPortal } from 'react-dom';
import { X, AlertTriangle } from 'lucide-react';

// ✅ FIX: React Portal — see ArchiveTaskModal.jsx for full explanation.
// Framer-motion's CSS transform on TaskCard creates a stacking context that
// traps fixed-position children. Portal teleports to document.body to escape it.

const DeleteTaskModal = ({ isOpen, onClose, onConfirm, taskTitle, loading }) => {
    if (!isOpen) return null;

    return createPortal(
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
                        <div className="p-2 rounded-lg bg-red-500/20">
                            <AlertTriangle className="h-5 w-5 text-red-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100">Delete Task</h2>
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
                    <p className="text-slate-300">
                        Are you sure you want to delete this task?
                    </p>
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="font-medium text-slate-200">{taskTitle}</p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-red-300">
                            Warning: This action cannot be undone. The task will be permanently deleted.
                        </p>
                    </div>
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
                        className="flex-1 btn-danger flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            'Delete Task'
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default DeleteTaskModal;
