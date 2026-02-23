import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useBoardTasks } from '../hooks/useTasks';
import { useBoards } from '../hooks/useBoards';
import { useArchiveTask, useDeleteTask } from '../hooks/useTaskMutations';
import { useQueryClient } from '@tanstack/react-query';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import TaskCard from '../components/TaskCard';
import TaskCardSkeleton from '../components/TaskCardSkeleton';
import EmptyState from '../components/EmptyState';
import CreateTaskModal from '../components/CreateTaskModal';
import EditTaskModal from '../components/EditTaskModal';
import AuditReportModal from '../components/AuditReportModal';
import {
    ArrowLeft,
    Plus,
    RefreshCw,
    AlertCircle,
    Clock,
    Eye,
    CheckCircle,
    ListTodo,
    Search,
    Users,
    Lock,
} from 'lucide-react';

const BoardTasks = () => {
    const { boardId } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const queryClient = useQueryClient();

    // Fetch tasks for this board
    const { data: tasks = [], isLoading, error, isFetching } = useBoardTasks(boardId);

    // Get board info
    const { data: boards = [] } = useBoards();
    const board = boards.find(b => b.id === Number(boardId));

    // Mutations
    const archiveMutation = useArchiveTask();
    const deleteMutation = useDeleteTask();

    // Local UI state
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [editTask, setEditTask] = useState(null);
    const [auditTaskId, setAuditTaskId] = useState(null);
    const [searchQuery, setSearchQuery] = useState('');

    const columns = [
        {
            id: 'TODO', title: 'To Do', statuses: ['CREATED', 'ASSIGNED'],
            icon: ListTodo, bgClass: 'bg-slate-500/10', iconColor: 'text-slate-400', colorClass: 'status-created',
        },
        {
            id: 'IN_PROGRESS', title: 'In Progress', statuses: ['IN_PROGRESS'],
            icon: Clock, bgClass: 'bg-primary-500/10', iconColor: 'text-primary-400', colorClass: 'status-in-progress',
        },
        {
            id: 'REVIEW', title: 'Review', statuses: ['REVIEW'],
            icon: Eye, bgClass: 'bg-amber-500/10', iconColor: 'text-amber-400', colorClass: 'status-review',
        },
        {
            id: 'DONE', title: 'Done', statuses: ['DONE'],
            icon: CheckCircle, bgClass: 'bg-green-500/10', iconColor: 'text-green-400', colorClass: 'status-done',
        },
    ];

    const getTasksForColumn = (column) => {
        if (!Array.isArray(tasks)) return [];
        let filtered = tasks.filter(task => column.statuses.includes(task.status));
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(t =>
                t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
            );
        }
        return filtered;
    };

    const handleStatusChange = async (taskId, newStatus, comment = null) => {
        try {
            const payload = { newStatus };
            if (comment) payload.comment = comment;

            await api.patch(`/tasks/${taskId}/status`, payload);
            queryClient.invalidateQueries({ queryKey: ['board-tasks', boardId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });

            if (newStatus === 'REVIEW') toast.success('Task submitted for review');
            else if (newStatus === 'DONE') toast.success('Task approved!');
            else if (newStatus === 'IN_PROGRESS' && comment) toast.success('Task rejected and sent back');
            else if (newStatus === 'IN_PROGRESS') toast.success('Task started');
            else toast.success('Status updated');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update task status');
        }
    };

    const handleCancelTask = async (taskId, reason) => {
        try {
            await api.post(`/tasks/${taskId}/cancel`, { reason });
            queryClient.invalidateQueries({ queryKey: ['board-tasks', boardId] });
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            toast.success('Task cancelled');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to cancel task');
        }
    };

    const handleArchiveTask = (taskId) => archiveMutation.mutate(taskId);
    const handleDeleteTask = (taskOrId) => {
        const taskId = typeof taskOrId === 'object' ? taskOrId.id : taskOrId;
        deleteMutation.mutate(taskId);
    };
    const handleViewAudit = (taskId) => setAuditTaskId(taskId);
    const handleEditTask = (task) => setEditTask(task);

    const handleTaskCreated = () => {
        queryClient.invalidateQueries({ queryKey: ['board-tasks', boardId] });
        queryClient.invalidateQueries({ queryKey: ['tasks'] });
    };

    const handleRefresh = async () => {
        await queryClient.invalidateQueries({ queryKey: ['board-tasks', boardId] });
        toast.success('Board refreshed');
    };

    const isPersonal = board?.boardType === 'PERSONAL';

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto mb-4" />
                    <p className="text-slate-400">Loading board tasks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/boards')}
                        style={{
                            padding: '0.5rem', borderRadius: '0.5rem', background: 'rgba(51,65,85,0.5)',
                            border: '1px solid rgba(71,85,105,0.5)', color: '#94a3b8', cursor: 'pointer',
                            transition: 'all 0.2s', display: 'flex', alignItems: 'center',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(71,85,105,0.5)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'rgba(51,65,85,0.5)'}
                    >
                        <ArrowLeft style={{ width: 20, height: 20 }} />
                    </button>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <h1 className="text-2xl font-bold text-slate-100">
                                {board?.name || 'Board Tasks'}
                            </h1>
                            {board && (
                                <span style={{
                                    fontSize: '0.75rem', padding: '0.25rem 0.625rem', borderRadius: '9999px',
                                    background: isPersonal ? 'rgba(139,92,246,0.15)' : 'rgba(59,130,246,0.15)',
                                    color: isPersonal ? '#a78bfa' : '#60a5fa',
                                    border: `1px solid ${isPersonal ? 'rgba(139,92,246,0.3)' : 'rgba(59,130,246,0.3)'}`,
                                    display: 'flex', alignItems: 'center', gap: '0.25rem',
                                }}>
                                    {isPersonal ? <Lock style={{ width: 12, height: 12 }} /> : <Users style={{ width: 12, height: 12 }} />}
                                    {isPersonal ? 'Personal' : 'Team'}
                                </span>
                            )}
                        </div>
                        {board?.description && (
                            <p className="text-slate-400 mt-1 text-sm">{board.description}</p>
                        )}
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 sm:justify-end">
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                        <input
                            type="text"
                            placeholder="Search tasks..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-9 pr-4 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500/50 w-48"
                        />
                    </div>
                    <button
                        onClick={handleRefresh}
                        disabled={isFetching}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw className={`h-4 w-4 ${isFetching ? 'animate-spin' : ''}`} />
                        Refresh
                    </button>
                    <button
                        onClick={() => setIsCreateModalOpen(true)}
                        className="btn-primary flex items-center gap-2"
                    >
                        <Plus className="h-4 w-4" />
                        New Task
                    </button>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="flex items-center gap-2 p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm animate-fade-in">
                    <AlertCircle className="h-5 w-5 shrink-0" />
                    {error.message || 'Failed to load tasks'}
                </div>
            )}

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                {columns.map(column => {
                    const count = getTasksForColumn(column).length;
                    const Icon = column.icon;
                    return (
                        <div key={column.id} className={`glass rounded-xl p-4 ${column.colorClass}`}>
                            <div className="flex items-center gap-3">
                                <div className={`p-2 rounded-lg ${column.bgClass}`}>
                                    <Icon className={`h-5 w-5 ${column.iconColor}`} />
                                </div>
                                <div>
                                    <p className="text-2xl font-bold text-slate-100">{count}</p>
                                    <p className="text-sm text-slate-400">{column.title}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Kanban Board */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {columns.map(column => {
                    const columnTasks = getTasksForColumn(column);
                    const Icon = column.icon;

                    return (
                        <div key={column.id} className={`glass rounded-xl p-4 ${column.colorClass}`}>
                            <div className="flex items-center gap-2 mb-4">
                                <Icon className={`h-5 w-5 ${column.iconColor}`} />
                                <h2 className="font-semibold text-slate-200">{column.title}</h2>
                                <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-slate-700/50 text-slate-300 rounded-full">
                                    {columnTasks.length}
                                </span>
                            </div>

                            <div className="space-y-3 min-h-[200px]">
                                {isLoading ? (
                                    Array(2).fill(0).map((_, i) => <TaskCardSkeleton key={i} />)
                                ) : columnTasks.length === 0 ? (
                                    <EmptyState
                                        icon={column.icon}
                                        title="No tasks"
                                        description={`No ${column.title.toLowerCase()} tasks in this board`}
                                        actionLabel={column.id === 'TODO' ? 'Create Task' : undefined}
                                        onAction={column.id === 'TODO' ? () => setIsCreateModalOpen(true) : undefined}
                                    />
                                ) : (
                                    columnTasks.map(task => (
                                        <TaskCard
                                            key={task.id}
                                            task={task}
                                            onStatusChange={handleStatusChange}
                                            onViewAudit={handleViewAudit}
                                            onCancel={handleCancelTask}
                                            onArchive={handleArchiveTask}
                                            onDelete={handleDeleteTask}
                                            onEdit={handleEditTask}
                                        />
                                    ))
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modals */}
            <CreateTaskModal
                isOpen={isCreateModalOpen}
                onClose={() => setIsCreateModalOpen(false)}
                onTaskCreated={handleTaskCreated}
                defaultBoardId={Number(boardId)}
            />

            <EditTaskModal
                isOpen={editTask !== null}
                onClose={() => setEditTask(null)}
                task={editTask}
            />

            <AuditReportModal
                isOpen={auditTaskId !== null}
                onClose={() => setAuditTaskId(null)}
                taskId={auditTaskId}
            />
        </div>
    );
};

export default BoardTasks;
