import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, RotateCcw, X, Folder, Calendar, Loader2, AlertTriangle } from 'lucide-react';
import api from '../api/axiosConfig';

const TrashModal = ({ isOpen, onClose }) => {
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(false);
    const [restoringId, setRestoringId] = useState(null);
    const [emptyingTrash, setEmptyingTrash] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [toast, setToast] = useState(null);
    const modalRef = useRef(null);

    useEffect(() => {
        if (isOpen) {
            fetchDeletedTasks();
            setShowConfirm(false);
        }
    }, [isOpen]);

    // Close on Escape key
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                if (showConfirm) {
                    setShowConfirm(false);
                } else {
                    onClose();
                }
            }
        };
        if (isOpen) {
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        }
    }, [isOpen, onClose, showConfirm]);

    const fetchDeletedTasks = async () => {
        setLoading(true);
        try {
            const response = await api.get('/tasks/trash');
            setTasks(response.data);
        } catch (err) {
            console.error('Failed to fetch deleted tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (taskId, taskTitle) => {
        setRestoringId(taskId);
        try {
            await api.put(`/tasks/${taskId}/undo-delete`);
            setTasks(prev => prev.filter(t => t.id !== taskId));
            showToast(`"${taskTitle}" restored successfully`);
        } catch (err) {
            console.error('Failed to restore task:', err);
            showToast('Failed to restore task', true);
        } finally {
            setRestoringId(null);
        }
    };

    const handleEmptyTrash = async () => {
        setEmptyingTrash(true);
        try {
            await api.delete('/tasks/trash');
            const count = tasks.length;
            setTasks([]);
            setShowConfirm(false);
            showToast(`Trash emptied — ${count} task${count !== 1 ? 's' : ''} permanently deleted`);
        } catch (err) {
            console.error('Failed to empty trash:', err);
            const msg = err.response?.status === 403
                ? 'Only admins or managers can empty the trash'
                : 'Failed to empty trash';
            showToast(msg, true);
        } finally {
            setEmptyingTrash(false);
        }
    };

    const showToast = (message, isError = false) => {
        setToast({ message, isError });
        setTimeout(() => setToast(null), 3000);
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const getPriorityColor = (priority) => {
        const colors = {
            HIGH: 'text-red-400 bg-red-500/10 border-red-500/20',
            MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
            LOW: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        };
        return colors[priority] || 'text-slate-400 bg-slate-500/10 border-slate-500/20';
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            {/* Backdrop */}
            <motion.div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
            >
                {/* Modal */}
                <motion.div
                    ref={modalRef}
                    className="glass w-full max-w-2xl max-h-[80vh] rounded-2xl border border-slate-600/50 shadow-2xl flex flex-col overflow-hidden"
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                >
                    {/* Header */}
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20">
                                <Trash2 className="h-5 w-5 text-red-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-semibold text-white">Recycle Bin</h2>
                                <p className="text-xs text-slate-400">
                                    {tasks.length} deleted {tasks.length === 1 ? 'task' : 'tasks'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            {tasks.length > 0 && (
                                <button
                                    onClick={() => setShowConfirm(true)}
                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 bg-red-500/10 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all"
                                >
                                    <Trash2 className="h-3.5 w-3.5" />
                                    Empty Trash
                                </button>
                            )}
                            <button
                                onClick={onClose}
                                className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                            >
                                <X className="h-5 w-5 text-slate-400" />
                            </button>
                        </div>
                    </div>

                    {/* Confirmation Banner */}
                    <AnimatePresence>
                        {showConfirm && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="mx-4 mt-3 p-4 rounded-xl bg-red-500/10 border border-red-500/30">
                                    <div className="flex items-start gap-3">
                                        <AlertTriangle className="h-5 w-5 text-red-400 mt-0.5 shrink-0" />
                                        <div className="flex-1">
                                            <p className="text-sm font-medium text-red-300">
                                                Permanently delete {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}?
                                            </p>
                                            <p className="text-xs text-red-400/70 mt-1">
                                                This action cannot be undone. All tasks in the trash will be permanently removed.
                                            </p>
                                            <div className="flex items-center gap-2 mt-3">
                                                <button
                                                    onClick={handleEmptyTrash}
                                                    disabled={emptyingTrash}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-all disabled:opacity-50"
                                                >
                                                    {emptyingTrash ? (
                                                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="h-3.5 w-3.5" />
                                                    )}
                                                    {emptyingTrash ? 'Deleting...' : 'Yes, delete all'}
                                                </button>
                                                <button
                                                    onClick={() => setShowConfirm(false)}
                                                    className="px-3 py-1.5 text-xs font-medium text-slate-300 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-all"
                                                >
                                                    Cancel
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <Loader2 className="h-8 w-8 animate-spin mb-3" />
                                <p className="text-sm">Loading deleted tasks...</p>
                            </div>
                        ) : tasks.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                                <Trash2 className="h-12 w-12 mb-3 opacity-30" />
                                <p className="text-sm font-medium">Recycle bin is empty</p>
                                <p className="text-xs mt-1 opacity-70">Deleted tasks will appear here</p>
                            </div>
                        ) : (
                            tasks.map((task) => (
                                <motion.div
                                    key={task.id}
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: 10, height: 0 }}
                                    className="group flex items-center gap-4 p-4 rounded-xl bg-slate-800/40 border border-slate-700/40 hover:border-slate-600/60 transition-all duration-200"
                                >
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-sm font-medium text-slate-200 truncate">
                                                {task.title}
                                            </h3>
                                            <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getPriorityColor(task.priority)}`}>
                                                {task.priority}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-400">
                                            {task.projectName && (
                                                <span className="flex items-center gap-1">
                                                    <Folder className="h-3 w-3" />
                                                    {task.projectName}
                                                </span>
                                            )}
                                            {task.boardName && (
                                                <span className="flex items-center gap-1">
                                                    {task.boardName}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Calendar className="h-3 w-3" />
                                                Deleted {formatDate(task.deletedAt)}
                                            </span>
                                        </div>
                                    </div>

                                    <button
                                        onClick={() => handleRestore(task.id, task.title)}
                                        disabled={restoringId === task.id}
                                        className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg hover:bg-emerald-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {restoringId === task.id ? (
                                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                        ) : (
                                            <RotateCcw className="h-3.5 w-3.5" />
                                        )}
                                        Restore
                                    </button>
                                </motion.div>
                            ))
                        )}
                    </div>
                </motion.div>
            </motion.div>

            {/* Toast */}
            {toast && (
                <motion.div
                    className={`fixed bottom-6 left-1/2 z-[60] px-4 py-3 rounded-xl border shadow-lg text-sm font-medium ${toast.isError
                            ? 'bg-red-500/20 border-red-500/30 text-red-300'
                            : 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300'
                        }`}
                    initial={{ opacity: 0, y: 20, x: '-50%' }}
                    animate={{ opacity: 1, y: 0, x: '-50%' }}
                    exit={{ opacity: 0, y: 20 }}
                >
                    {toast.message}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default TrashModal;
