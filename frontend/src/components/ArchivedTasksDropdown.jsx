import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Archive,
    XCircle,
    ChevronDown,
    Eye,
    RotateCcw,
    Trash2,
    Folder,
    User,
    Calendar
} from 'lucide-react';

/**
 * ArchivedTasksDropdown - Collapsible dropdown for archived and cancelled tasks
 * 
 * Props:
 * - archivedTasks: Array of archived task objects
 * - cancelledTasks: Array of cancelled task objects
 * - onRestore: Function(task) - Called when user clicks restore
 * - onDelete: Function(task) - Called when user clicks delete
 * - onView: Function(task) - Called when user clicks view
 */
const ArchivedTasksDropdown = ({
    archivedTasks = [],
    cancelledTasks = [],
    onRestore,
    onDelete,
    onView
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('archived');
    const dropdownRef = useRef(null);

    const totalCount = archivedTasks.length + cancelledTasks.length;
    const currentTasks = activeTab === 'archived' ? archivedTasks : cancelledTasks;

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Always render the dropdown trigger — show counts even when empty

    const getPriorityColor = (priority) => {
        switch (priority?.toUpperCase()) {
            case 'HIGH':
                return 'text-red-400 bg-red-500/10';
            case 'MEDIUM':
                return 'text-amber-400 bg-amber-500/10';
            case 'LOW':
                return 'text-green-400 bg-green-500/10';
            default:
                return 'text-slate-400 bg-slate-500/10';
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'Unknown';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    };

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Dropdown Trigger */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-3 glass rounded-xl hover:bg-slate-700/50 transition-all w-full group"
            >
                <div className="flex items-center gap-2">
                    <Archive className="h-5 w-5 text-slate-400" />
                    <span className="font-medium text-slate-200">Inactive Tasks</span>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                    {archivedTasks.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-purple-500/20 text-purple-300 rounded-full">
                            {archivedTasks.length}
                        </span>
                    )}
                    {cancelledTasks.length > 0 && (
                        <span className="px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-300 rounded-full">
                            {cancelledTasks.length}
                        </span>
                    )}
                    <motion.div
                        animate={{ rotate: isOpen ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <ChevronDown className="h-5 w-5 text-slate-400 group-hover:text-slate-300" />
                    </motion.div>
                </div>
            </button>

            {/* Dropdown Content */}
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10, height: 0 }}
                        animate={{ opacity: 1, y: 0, height: 'auto' }}
                        exit={{ opacity: 0, y: -10, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="absolute top-full left-0 right-0 mt-2 z-50 glass rounded-xl overflow-hidden shadow-xl border border-slate-600/30"
                    >
                        {/* Tabs */}
                        <div className="flex border-b border-slate-600/30">
                            <button
                                onClick={() => setActiveTab('archived')}
                                className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all ${activeTab === 'archived'
                                    ? 'text-purple-400 bg-purple-500/10 border-b-2 border-purple-500'
                                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                                    }`}
                            >
                                <Archive className="h-4 w-4" />
                                Archived ({archivedTasks.length})
                            </button>
                            <button
                                onClick={() => setActiveTab('cancelled')}
                                className={`flex-1 px-4 py-3 flex items-center justify-center gap-2 text-sm font-medium transition-all ${activeTab === 'cancelled'
                                    ? 'text-red-400 bg-red-500/10 border-b-2 border-red-500'
                                    : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/30'
                                    }`}
                            >
                                <XCircle className="h-4 w-4" />
                                Cancelled ({cancelledTasks.length})
                            </button>
                        </div>

                        {/* Task List */}
                        <div className="max-h-96 overflow-y-auto custom-scrollbar">
                            {currentTasks.length === 0 ? (
                                <div className="py-12 text-center text-slate-500">
                                    <div className="p-3 rounded-full bg-slate-700/30 w-fit mx-auto mb-3">
                                        {activeTab === 'archived' ? (
                                            <Archive className="h-6 w-6 opacity-50" />
                                        ) : (
                                            <XCircle className="h-6 w-6 opacity-50" />
                                        )}
                                    </div>
                                    <p>No {activeTab} tasks</p>
                                </div>
                            ) : (
                                <div className="p-3 space-y-2">
                                    {currentTasks.map((task) => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            activeTab={activeTab}
                                            getPriorityColor={getPriorityColor}
                                            formatDate={formatDate}
                                            onView={onView}
                                            onRestore={onRestore}
                                            onDelete={onDelete}
                                        />
                                    ))}
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

/**
 * TaskCard - Individual task item within the dropdown
 */
const TaskCard = ({
    task,
    activeTab,
    getPriorityColor,
    formatDate,
    onView,
    onRestore,
    onDelete
}) => {
    const [showActions, setShowActions] = useState(false);

    return (
        <div
            className="p-4 bg-slate-800/50 rounded-lg border border-slate-700/50 hover:border-slate-600/50 transition-all group"
            onMouseEnter={() => setShowActions(true)}
            onMouseLeave={() => setShowActions(false)}
        >
            {/* Header: Title + Priority */}
            <div className="flex items-start justify-between gap-3 mb-2">
                <h4 className="font-medium text-slate-200 truncate flex-1">
                    {task.title}
                </h4>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full shrink-0 ${getPriorityColor(task.priority)}`}>
                    {task.priority}
                </span>
            </div>

            {/* Description */}
            {task.description && (
                <p className="text-sm text-slate-400 line-clamp-2 mb-3">
                    {task.description}
                </p>
            )}

            {/* Meta Info */}
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                {/* Status Badge */}
                <span className={`px-2 py-0.5 rounded-full ${activeTab === 'archived'
                    ? 'bg-purple-500/10 text-purple-400'
                    : 'bg-red-500/10 text-red-400'
                    }`}>
                    {activeTab === 'archived' ? 'Archived' : 'Cancelled'}
                </span>

                {/* Project */}
                {task.projectName && (
                    <span className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400"></span>
                        <Folder className="h-3 w-3" />
                        {task.projectName}
                    </span>
                )}

                {/* Assignee */}
                {task.assigneeName && (
                    <span className="flex items-center gap-1">
                        <User className="h-3 w-3" />
                        {task.assigneeName}
                    </span>
                )}

                {/* Date */}
                <span className="flex items-center gap-1 ml-auto">
                    <Calendar className="h-3 w-3" />
                    {formatDate(task.archivedAt || task.cancelledAt || task.createdAt)}
                </span>
            </div>

            {/* Action Buttons (on hover) */}
            <AnimatePresence>
                {showActions && (
                    <motion.div
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className="flex items-center gap-2 mt-3 pt-3 border-t border-slate-700/50"
                    >
                        {onView && (
                            <button
                                onClick={() => onView(task)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-slate-300 hover:bg-slate-700/50 transition-colors"
                                title="View Details"
                            >
                                <Eye className="h-3.5 w-3.5" />
                                View
                            </button>
                        )}
                        {onRestore && (
                            <button
                                onClick={() => onRestore(task)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-green-400 hover:bg-green-500/10 transition-colors"
                                title="Restore Task"
                            >
                                <RotateCcw className="h-3.5 w-3.5" />
                                Restore
                            </button>
                        )}
                        {onDelete && (
                            <button
                                onClick={() => onDelete(task)}
                                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-red-400 hover:bg-red-500/10 transition-colors ml-auto"
                                title="Delete Permanently"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                                Delete
                            </button>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ArchivedTasksDropdown;
