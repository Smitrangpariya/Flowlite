import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import RejectionModal from './RejectionModal';
import DeleteTaskModal from './DeleteTaskModal';
import CancelTaskModal from './CancelTaskModal';
import ArchiveTaskModal from './ArchiveTaskModal';
import {
    CheckCircle,
    Clock,
    ArrowRight,
    ArrowUp,
    ArrowDown,
    Minus,
    RotateCcw,
    User,
    Folder,
    Shield,
    FileText,
    MessageSquare,
    Trash2,
    XCircle,
    Archive,
    Calendar,
    Pencil,
    MoreVertical
} from 'lucide-react';

// Priority config with visual indicators
const priorityConfig = {
    HIGH: {
        icon: ArrowUp,
        color: 'text-red-400',
        bg: 'bg-red-500/10',
        border: 'border-red-500/30',
        borderClass: 'priority-border-high',
        label: 'High'
    },
    MEDIUM: {
        icon: Minus,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/30',
        borderClass: 'priority-border-medium',
        label: 'Medium'
    },
    LOW: {
        icon: ArrowDown,
        color: 'text-green-400',
        bg: 'bg-green-500/10',
        border: 'border-green-500/30',
        borderClass: 'priority-border-low',
        label: 'Low'
    }
};

// Status badge config
const statusConfig = {
    CREATED: { label: 'New', color: 'bg-slate-500/20 text-slate-300 border-slate-500/30' },
    ASSIGNED: { label: 'Assigned', color: 'bg-violet-500/20 text-violet-300 border-violet-500/30' },
    IN_PROGRESS: { label: 'In Progress', color: 'bg-sky-500/20 text-sky-300 border-sky-500/30' },
    REVIEW: { label: 'Review', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
    DONE: { label: 'Done', color: 'bg-green-500/20 text-green-300 border-green-500/30' }
};

const TaskCard = ({ task, onStatusChange, onViewAudit, onCancel, onArchive, onDelete, onEdit }) => {
    const { user } = useAuth();
    const [showRejectionModal, setShowRejectionModal] = useState(false);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [showCancelModal, setShowCancelModal] = useState(false);
    const [showArchiveModal, setShowArchiveModal] = useState(false);
    const [showActions, setShowActions] = useState(false);
    const [loading, setLoading] = useState(false);

    const priorityInfo = priorityConfig[task.priority] || priorityConfig.MEDIUM;
    const PriorityIcon = priorityInfo.icon;
    const statusInfo = statusConfig[task.status] || statusConfig.CREATED;

    // STRICT OWNERSHIP CHECKS (preserved exactly)
    const isAdmin = user?.role === 'ADMIN';
    const isManager = user?.role === 'PRODUCT_MANAGER';
    const isAssignee = task.assigneeId && task.assigneeId === user?.userId;
    const isApprover = task.approverId && task.approverId === user?.userId;
    const isCreator = task.createdById && task.createdById === user?.userId;
    const canApproveRole = user?.role === 'TEAM_LEAD' || user?.role === 'ADMIN';

    // Button visibility based on STRICT rules (preserved exactly)
    const canStartTask = () => {
        return task.status === 'ASSIGNED' && (isAssignee || isAdmin);
    };

    const canSubmitForReview = () => {
        return task.status === 'IN_PROGRESS' && (isAssignee || isAdmin);
    };

    const canApproveOrReject = () => {
        return task.status === 'REVIEW' && (isApprover || isAdmin) && canApproveRole;
    };

    const canDelete = () => {
        return task.status === 'CREATED' && (isCreator || isAdmin);
    };

    const canCancel = () => {
        const validStatuses = ['ASSIGNED', 'IN_PROGRESS', 'REVIEW'];
        return validStatuses.includes(task.status) && (isCreator || isManager || isAdmin);
    };

    const canArchive = () => {
        return task.status === 'DONE' && (isManager || isAdmin);
    };

    // Handlers (preserved exactly)
    const handleStartTask = async () => {
        setLoading(true);
        await onStatusChange(task.id, 'IN_PROGRESS');
        setLoading(false);
    };

    const handleSubmitForReview = async () => {
        setLoading(true);
        await onStatusChange(task.id, 'REVIEW');
        setLoading(false);
    };

    const handleApprove = async () => {
        setLoading(true);
        await onStatusChange(task.id, 'DONE', 'Task approved');
        setLoading(false);
    };

    const handleReject = async (reason) => {
        setLoading(true);
        await onStatusChange(task.id, 'IN_PROGRESS', reason);
        setShowRejectionModal(false);
        setLoading(false);
    };

    const handleDelete = () => setShowDeleteModal(true);
    const confirmDelete = async () => {
        setLoading(true);
        await onDelete(task.id);
        setLoading(false);
        setShowDeleteModal(false);
    };

    const handleCancel = () => setShowCancelModal(true);
    const confirmCancel = async (reason) => {
        setLoading(true);
        await onCancel(task.id, reason);
        setLoading(false);
        setShowCancelModal(false);
    };

    const handleArchive = () => setShowArchiveModal(true);
    const confirmArchive = async () => {
        setLoading(true);
        await onArchive(task.id);
        setLoading(false);
        setShowArchiveModal(false);
    };

    // Don't render cancelled/archived tasks in main view
    if (task.status === 'CANCELLED' || task.status === 'ARCHIVED') {
        return null;
    }

    return (
        <>
            <motion.div
                layout
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                onMouseEnter={() => setShowActions(true)}
                onMouseLeave={() => setShowActions(false)}
                className={`group relative glass rounded-xl p-4 hover:border-slate-600 
                          hover:bg-slate-800/70 transition-all cursor-default
                          hover:shadow-lg hover:shadow-black/20 ${priorityInfo.borderClass}`}
            >
                {/* Header: ID + Priority + Status */}
                <div className="flex items-center gap-2 mb-3">
                    {/* Task ID */}
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-800/60 px-1.5 py-0.5 rounded">
                        #{task.id}
                    </span>

                    {/* Priority Badge */}
                    <div className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${priorityInfo.bg} border ${priorityInfo.border}`}>
                        <PriorityIcon className={`h-3 w-3 ${priorityInfo.color}`} />
                        <span className={`text-[10px] font-semibold ${priorityInfo.color}`}>{priorityInfo.label}</span>
                    </div>

                    {/* Status Badge */}
                    <span className={`text-[11px] px-2 py-0.5 rounded-md border font-medium ${statusInfo.color}`}>
                        {statusInfo.label}
                    </span>

                    <div className="flex-1" />

                    {/* Quick Edit - Show on Hover */}
                    <AnimatePresence>
                        {showActions && onEdit && task.status !== 'DONE' && task.status !== 'CANCELLED' && task.status !== 'ARCHIVED' && (
                            <motion.button
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.1 }}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onEdit(task);
                                }}
                                className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200 transition-colors"
                            >
                                <MoreVertical className="h-4 w-4" />
                            </motion.button>
                        )}
                    </AnimatePresence>
                </div>

                {/* Task Title */}
                <h3 className="font-semibold text-slate-100 mb-2 line-clamp-2 group-hover:text-white transition-colors text-sm">
                    {task.title}
                </h3>

                {/* Description */}
                {task.description && (
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{task.description}</p>
                )}

                {/* Meta Info - Compact Row */}
                <div className="flex flex-wrap items-center gap-2 mb-3 text-xs">
                    {task.assigneeName && (
                        <div className="flex items-center gap-1.5 text-slate-400" title="Assignee">
                            <div className="h-5 w-5 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center shrink-0">
                                <User className="h-3 w-3 text-primary-400" />
                            </div>
                            <span className="truncate max-w-[80px]">
                                {task.assigneeName}
                            </span>
                            {isAssignee && <span className="text-primary-400">(You)</span>}
                        </div>
                    )}
                    {task.approverName && (
                        <div className="flex items-center gap-1.5 text-amber-400" title="Approver">
                            <div className="h-5 w-5 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                                <Shield className="h-3 w-3 text-amber-400" />
                            </div>
                            <span className="truncate max-w-[80px]">
                                {task.approverName}
                            </span>
                            {isApprover && <span className="text-amber-300">(You)</span>}
                        </div>
                    )}
                    {task.projectName && (
                        <div className="flex items-center gap-1 px-2 py-0.5 bg-slate-800/50 rounded-lg text-slate-400" title="Project">
                            <Folder className="h-3 w-3" />
                            <span className="truncate max-w-[80px]">{task.projectName}</span>
                        </div>
                    )}
                </div>

                {/* Due Date */}
                {task.dueDate && (() => {
                    const today = new Date().toISOString().split('T')[0];
                    const isOverdue = task.dueDate < today && task.status !== 'DONE';
                    const isDueToday = task.dueDate === today;
                    const dueDateClass = isOverdue ? 'text-red-400 bg-red-500/10' : isDueToday ? 'text-amber-400 bg-amber-500/10' : 'text-slate-400 bg-slate-800/50';
                    return (
                        <div className={`flex items-center gap-1 px-2 py-1 rounded-lg text-xs mb-3 w-fit ${dueDateClass}`}>
                            <Calendar className="h-3 w-3" />
                            {isOverdue ? 'Overdue: ' : isDueToday ? 'Due today: ' : 'Due: '}
                            {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                    );
                })()}

                {/* Comments indicator */}
                {task.comments && task.comments.length > 0 && (
                    <div className="flex items-center gap-1 text-xs text-slate-500 mb-3">
                        <MessageSquare className="h-3 w-3" />
                        {task.comments.length} comment{task.comments.length !== 1 ? 's' : ''}
                    </div>
                )}

                {/* Edit + Action Buttons */}
                <div className="flex flex-wrap gap-2">
                    {/* EDIT TASK */}
                    {onEdit && task.status !== 'DONE' && task.status !== 'CANCELLED' && task.status !== 'ARCHIVED' && (
                        <button
                            onClick={() => onEdit(task)}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50 rounded-lg hover:bg-slate-600/50 transition-colors"
                        >
                            <Pencil className="h-3 w-3" />
                            Edit
                        </button>
                    )}
                    {/* START TASK */}
                    {canStartTask() && (
                        <button
                            onClick={handleStartTask}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-primary-500/20 text-primary-400 border border-primary-500/30 rounded-lg hover:bg-primary-500/30 transition-colors disabled:opacity-50"
                        >
                            <Clock className="h-3 w-3" />
                            Start Task
                        </button>
                    )}

                    {/* SUBMIT FOR REVIEW */}
                    {canSubmitForReview() && (
                        <button
                            onClick={handleSubmitForReview}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-500/30 transition-colors disabled:opacity-50"
                        >
                            <ArrowRight className="h-3 w-3" />
                            Submit for Review
                        </button>
                    )}

                    {/* APPROVE/REJECT */}
                    {canApproveOrReject() && (
                        <>
                            <button
                                onClick={handleApprove}
                                disabled={loading}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg hover:bg-green-500/30 transition-colors disabled:opacity-50"
                            >
                                <CheckCircle className="h-3 w-3" />
                                Approve
                            </button>
                            <button
                                onClick={() => setShowRejectionModal(true)}
                                disabled={loading}
                                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg hover:bg-red-500/30 transition-colors disabled:opacity-50"
                            >
                                <RotateCcw className="h-3 w-3" />
                                Reject
                            </button>
                        </>
                    )}

                    {/* DONE - Show audit and archive */}
                    {task.status === 'DONE' && (
                        <>
                            <div className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-green-400">
                                <CheckCircle className="h-3 w-3" />
                                Completed
                            </div>
                            {onViewAudit && (
                                <button
                                    onClick={() => onViewAudit(task.id)}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50 rounded-lg hover:bg-slate-600/50 transition-colors"
                                >
                                    <FileText className="h-3 w-3" />
                                    Audit Report
                                </button>
                            )}
                            {canArchive() && (
                                <button
                                    onClick={handleArchive}
                                    disabled={loading}
                                    className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-700/50 text-slate-300 border border-slate-600/50 rounded-lg hover:bg-slate-600/50 transition-colors disabled:opacity-50"
                                >
                                    <Archive className="h-3 w-3" />
                                    Archive
                                </button>
                            )}
                        </>
                    )}

                    {/* DELETE (only CREATED) */}
                    {canDelete() && (
                        <button
                            onClick={handleDelete}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-colors disabled:opacity-50"
                        >
                            <Trash2 className="h-3 w-3" />
                            Delete
                        </button>
                    )}

                    {/* CANCEL (after assignment, before DONE) */}
                    {canCancel() && (
                        <button
                            onClick={handleCancel}
                            disabled={loading}
                            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium bg-slate-700/50 text-slate-400 border border-slate-600/50 rounded-lg hover:bg-slate-600/50 transition-colors disabled:opacity-50"
                        >
                            <XCircle className="h-3 w-3" />
                            Cancel
                        </button>
                    )}

                    {/* Status hints for read-only users */}
                    {task.status === 'ASSIGNED' && !canStartTask() && task.assigneeName && (
                        <span className="text-xs text-slate-500 italic">
                            Waiting for {task.assigneeName} to start
                        </span>
                    )}

                    {task.status === 'IN_PROGRESS' && !canSubmitForReview() && task.assigneeName && (
                        <span className="text-xs text-slate-500 italic">
                            In progress by {task.assigneeName}
                        </span>
                    )}

                    {task.status === 'REVIEW' && !canApproveOrReject() && task.approverName && (
                        <span className="text-xs text-slate-500 italic">
                            Awaiting review by {task.approverName}
                        </span>
                    )}
                </div>
            </motion.div>

            {/* Rejection Modal */}
            <RejectionModal
                isOpen={showRejectionModal}
                onClose={() => setShowRejectionModal(false)}
                onReject={handleReject}
                taskTitle={task.title}
                loading={loading}
            />

            {/* Delete Modal */}
            <DeleteTaskModal
                isOpen={showDeleteModal}
                onClose={() => setShowDeleteModal(false)}
                onConfirm={confirmDelete}
                taskTitle={task.title}
                loading={loading}
            />

            {/* Cancel Modal */}
            <CancelTaskModal
                isOpen={showCancelModal}
                onClose={() => setShowCancelModal(false)}
                onConfirm={confirmCancel}
                taskTitle={task.title}
                loading={loading}
            />

            {/* Archive Modal */}
            <ArchiveTaskModal
                isOpen={showArchiveModal}
                onClose={() => setShowArchiveModal(false)}
                onConfirm={confirmArchive}
                taskTitle={task.title}
                loading={loading}
            />
        </>
    );
};

export default TaskCard;
