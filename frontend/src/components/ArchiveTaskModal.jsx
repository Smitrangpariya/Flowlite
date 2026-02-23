import { createPortal } from 'react-dom';
import { X, Archive } from 'lucide-react';

// ✅ FIX: Render via React Portal into document.body.
//
// ROOT CAUSE: TaskCard wraps everything in a framer-motion <motion.div>.
// Framer-motion applies CSS `transform` on animated elements, which creates
// a NEW stacking context. Any `position: fixed` child is then positioned
// relative to that transformed ancestor instead of the viewport — so the
// modal gets clipped and mis-positioned inside the card.
//
// createPortal() moves the modal's DOM node to document.body, completely
// outside the stacking context, so `fixed inset-0` covers the full screen.

const ArchiveTaskModal = ({ isOpen, onClose, onConfirm, taskTitle, loading }) => {
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
                        <div className="p-2 rounded-lg bg-blue-500/20">
                            <Archive className="h-5 w-5 text-blue-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100">Archive Task</h2>
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
                        Archive this completed task?
                    </p>
                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                        <p className="font-medium text-slate-200">{taskTitle}</p>
                    </div>
                    <div className="flex items-start gap-2 p-3 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                        <Archive className="h-4 w-4 text-blue-400 mt-0.5 shrink-0" />
                        <p className="text-sm text-blue-300">
                            Archived tasks can be viewed in the "Inactive Tasks" dropdown and restored if needed.
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
                        className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-medium py-2 px-4 rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        {loading ? (
                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <>
                                <Archive className="h-4 w-4" />
                                Archive Task
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default ArchiveTaskModal;
