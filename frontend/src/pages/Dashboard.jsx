import { useState, useEffect, useCallback } from "react";
import { useAuth } from "../context/AuthContext";
import api from "../api/axiosConfig";
import toast from "react-hot-toast";
import TaskCard from "../components/TaskCard";
import TaskCardSkeleton from "../components/TaskCardSkeleton";
import EmptyState from "../components/EmptyState";
import CreateTaskModal from "../components/CreateTaskModal";
import EditTaskModal from "../components/EditTaskModal";
import AuditReportModal from "../components/AuditReportModal";
import ArchivedTasksDropdown from "../components/ArchivedTasksDropdown";
import { useTasks, useArchivedTasks, useCancelledTasks } from "../hooks/useTasks";
import { useRestoreTask, useDeleteTask, useArchiveTask } from "../hooks/useTaskMutations";
import { useBoards } from "../hooks/useBoards";
import { useKeyboardShortcuts } from "../hooks/useKeyboardShortcuts";
import { useQueryClient } from "@tanstack/react-query";
import {
  Plus,
  RefreshCw,
  AlertCircle,
  Clock,
  Eye,
  CheckCircle,
  ListTodo,
  Shield,
  Search,
  User as UserIcon,
  Hash,
  BarChart3,
} from "lucide-react";

const Dashboard = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // React Query hooks - auto-refresh every 30s
  const { data: tasks = [], isLoading: loading, error: tasksError, isFetching } = useTasks();
  const { data: archivedTasksList = [] } = useArchivedTasks();
  const { data: cancelledTasksList = [] } = useCancelledTasks();

  const refreshing = isFetching;

  // Mutation hooks with optimistic updates
  const restoreMutation = useRestoreTask();
  const deleteMutation = useDeleteTask();
  const archiveMutation = useArchiveTask();

  // Local UI state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [auditTaskId, setAuditTaskId] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showMyTasks, setShowMyTasks] = useState(false);
  const [selectedBoardId, setSelectedBoardId] = useState("all");

  const { data: boards = [] } = useBoards();

  const [dashboardStats, setDashboardStats] = useState(null);

  const error = tasksError?.message || "";

  // Keyboard shortcuts
  useKeyboardShortcuts([
    {
      key: 'n',
      meta: true,
      shift: true,
      action: () => setIsCreateModalOpen(true),
    },
    {
      key: '/',
      action: () => document.getElementById('dashboard-search')?.focus(),
    }
  ]);

  const columns = [
    {
      id: "TODO",
      title: "To Do",
      statuses: ["CREATED", "ASSIGNED"],
      icon: ListTodo,
      colorClass: "status-created",
      bgClass: "bg-slate-500/10",
      iconColor: "text-slate-400",
    },
    {
      id: "IN_PROGRESS",
      title: "In Progress",
      statuses: ["IN_PROGRESS"],
      icon: Clock,
      colorClass: "status-in-progress",
      bgClass: "bg-primary-500/10",
      iconColor: "text-primary-400",
    },
    {
      id: "REVIEW",
      title: "Review",
      statuses: ["REVIEW"],
      icon: Eye,
      colorClass: "status-review",
      bgClass: "bg-amber-500/10",
      iconColor: "text-amber-400",
    },
    {
      id: "DONE",
      title: "Done",
      statuses: ["DONE"],
      icon: CheckCircle,
      colorClass: "status-done",
      bgClass: "bg-green-500/10",
      iconColor: "text-green-400",
    },
  ];

  // ✅ FIX: Wrap in useCallback so it's a stable reference for useEffect deps.
  //    Previously defined inline in useEffect which prevented it being called
  //    from handleTaskCreated / handleRefresh without triggering re-renders.
  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await api.get("/dashboard/stats");
      setDashboardStats(response.data);
    } catch (err) {
      console.error("Error fetching dashboard stats:", err);
    }
  }, []);

  // ✅ FIX: Re-fetch stats whenever the tasks list re-fetches.
  //    Previously only fetched once on mount — so stats never updated after
  //    task creation, archiving, or status changes.
  useEffect(() => {
    fetchDashboardStats();
  }, [fetchDashboardStats, tasks]); // tasks changes → stats refresh

  const handleRefresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ['tasks'] });
    await queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    await fetchDashboardStats();
    toast.success("Dashboard refreshed");
  };

  const handleTaskCreated = () => {
    // ✅ FIX: Invalidate ALL task query keys so the board re-renders immediately
    //    after returning from BoardTasks → Dashboard.
    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
    fetchDashboardStats();
  };

  const handleStatusChange = async (taskId, newStatus, comment = null) => {
    try {
      const payload = { newStatus };
      if (comment) {
        payload.comment = comment;
      }

      await api.patch(`/tasks/${taskId}/status`, payload);

      // ✅ FIX: Invalidate both active AND archived/cancelled after any status
      //    change, because moving to DONE means the task could then be archived.
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
      fetchDashboardStats();

      if (newStatus === "REVIEW") {
        toast.success("Task submitted for review");
      } else if (newStatus === "DONE") {
        toast.success("Task approved!");
      } else if (newStatus === "IN_PROGRESS" && comment) {
        toast.success("Task rejected and sent back");
      } else if (newStatus === "IN_PROGRESS") {
        toast.success("Task started");
      } else {
        toast.success("Status updated");
      }
    } catch (err) {
      const errorMessage =
        err.response?.data?.message || "Failed to update task status";
      toast.error(errorMessage);
    }
  };

  const handleCancelTask = async (taskId, reason) => {
    try {
      // Optimistic: remove from active
      queryClient.setQueryData(['tasks', 'active'], (old) =>
        old ? old.filter(t => t.id !== taskId) : []
      );

      const response = await api.post(`/tasks/${taskId}/cancel`, { reason });

      // Use server response to guarantee the task is in the cancelled cache
      if (response.data && response.data.id) {
        queryClient.setQueryData(['tasks', 'cancelled'], (old) => {
          const existing = old || [];
          const filtered = existing.filter((t) => t.id !== response.data.id);
          return [response.data, ...filtered];
        });
      }

      // Refetch all lists to sync with server
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
      fetchDashboardStats();
      toast.success("Task cancelled");
    } catch (err) {
      // Rollback on error
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      const errorMessage =
        err.response?.data?.message || "Failed to cancel task";
      toast.error(errorMessage);
    }
  };

  const handleArchiveTask = async (taskId) => {
    archiveMutation.mutate(taskId);
  };

  const handleDeleteTask = (taskOrId) => {
    const taskId = typeof taskOrId === 'object' ? taskOrId.id : taskOrId;
    deleteMutation.mutate(taskId);
  };

  const handleViewAudit = (taskId) => {
    setAuditTaskId(taskId);
  };

  const handleRestoreTask = (task) => {
    restoreMutation.mutate(task.id);
  };

  const handleViewTask = (task) => {
    setAuditTaskId(task.id);
  };

  const getTasksForColumn = (column) => {
    if (!Array.isArray(tasks)) return [];
    let filtered = tasks.filter((task) => column.statuses.includes(task.status));
    if (selectedBoardId !== "all") {
      // ✅ FIX: Compare as numbers — task.boardId is a number, selectedBoardId
      //    from the <select> value is a string. Previously tasks were always
      //    filtered out when a board was selected in the dropdown.
      filtered = filtered.filter((t) => t.boardId === Number(selectedBoardId));
    }
    if (showMyTasks) {
      filtered = filtered.filter((t) => t.assigneeId === user?.userId);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter((t) =>
        t.title?.toLowerCase().includes(q) || t.description?.toLowerCase().includes(q)
      );
    }
    return filtered;
  };

  const handleEditTask = (task) => {
    setEditTask(task);
  };

  const safeTasks = Array.isArray(tasks) ? tasks : [];

  // Compute stats from tasks
  const totalTasks = safeTasks.filter(t => !['CANCELLED', 'ARCHIVED'].includes(t.status)).length;
  const inProgressCount = safeTasks.filter(t => t.status === 'IN_PROGRESS').length;
  const doneCount = safeTasks.filter(t => t.status === 'DONE').length;
  const completionRate = totalTasks > 0 ? (doneCount / totalTasks) * 100 : 0;
  const overdueCount = safeTasks.filter(t => {
    if (!t.dueDate || t.status === 'DONE' || t.status === 'CANCELLED' || t.status === 'ARCHIVED') return false;
    return t.dueDate < new Date().toISOString().split('T')[0];
  }).length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Task Board</h1>
          <p className="text-slate-400 mt-1">
            Welcome back,{" "}
            <span className="text-primary-400 font-medium">
              {user?.username}
            </span>
            <span className="ml-2 px-2 py-0.5 text-xs rounded-full bg-slate-700/50 text-slate-300">
              {user?.role?.replace("_", " ")}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 sm:justify-end">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              id="dashboard-search"
              type="text"
              placeholder="Search tasks... ( / )"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-primary-500/50 w-52"
            />
          </div>
          {/* My Tasks Toggle */}
          <button
            onClick={() => setShowMyTasks(!showMyTasks)}
            className={`flex items-center gap-2 px-3 py-2 text-sm rounded-lg border transition-colors ${showMyTasks
              ? 'bg-primary-500/20 border-primary-500/50 text-primary-400'
              : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
              }`}
          >
            <UserIcon className="h-4 w-4" />
            My Tasks
          </button>
          {/* Board Filter */}
          <select
            value={selectedBoardId}
            onChange={(e) => setSelectedBoardId(e.target.value)}
            className="px-3 py-2 text-sm bg-slate-800/50 border border-slate-700/50 rounded-lg text-slate-200 focus:outline-none focus:border-primary-500/50"
          >
            <option value="all">All Boards</option>
            {boards.map(board => (
              <option key={board.id} value={board.id}>
                {board.boardType === 'PERSONAL' ? '🔒' : '👥'} {board.name}
              </option>
            ))}
          </select>
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
            />
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

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-4 mb-6 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {error}
        </div>
      )}

      {/* Archived Tasks Dropdown */}
      <div className="mb-6">
        <ArchivedTasksDropdown
          archivedTasks={archivedTasksList}
          cancelledTasks={cancelledTasksList}
          onRestore={handleRestoreTask}
          onDelete={handleDeleteTask}
          onView={handleViewTask}
        />
      </div>

      {/* Dashboard Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Total Tasks */}
        <div className="glass rounded-xl p-6 border border-slate-700/50 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Total Tasks</h3>
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Hash className="h-4 w-4 text-primary-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">
              {loading ? '—' : totalTasks}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Active across all boards</p>
        </div>

        {/* In Progress */}
        <div className="glass rounded-xl p-6 border border-slate-700/50 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">In Progress</h3>
            <div className="p-2 rounded-lg bg-sky-500/10">
              <Clock className="h-4 w-4 text-sky-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">
              {loading ? '—' : inProgressCount}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-2">Currently being worked on</p>
        </div>

        {/* Completion Rate */}
        <div className="glass rounded-xl p-6 border border-slate-700/50 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Completion Rate</h3>
            <div className="p-2 rounded-lg bg-green-500/10">
              <BarChart3 className="h-4 w-4 text-green-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">
              {loading ? '—' : `${completionRate.toFixed(0)}%`}
            </span>
          </div>
          <div className="mt-2 h-1.5 w-full bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-green-500 to-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${loading ? 0 : completionRate}%` }}
            />
          </div>
        </div>

        {/* Overdue */}
        <div className="glass rounded-xl p-6 border border-slate-700/50 hover-lift">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-slate-400">Overdue</h3>
            <div className="p-2 rounded-lg bg-red-500/10">
              <AlertCircle className="h-4 w-4 text-red-400" />
            </div>
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold text-slate-100">
              {loading ? '—' : overdueCount}
            </span>
            {!loading && overdueCount > 0 && (
              <span className="flex items-center gap-1 text-xs text-red-400 font-medium animate-pulse-ring">
                Needs attention
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">Past due date</p>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {columns.map((column) => {
          const columnTasks = getTasksForColumn(column);
          const Icon = column.icon;

          return (
            <div
              key={column.id}
              className={`glass rounded-xl p-4 ${column.colorClass}`}
            >
              <div className="flex items-center gap-2 mb-4">
                <Icon className={`h-5 w-5 ${column.iconColor}`} />
                <h2 className="font-semibold text-slate-200">{column.title}</h2>
                <span className="ml-auto px-2 py-0.5 text-xs font-medium bg-slate-700/50 text-slate-300 rounded-full">
                  {loading ? '…' : columnTasks.length}
                </span>
              </div>

              <div className="space-y-3 min-h-[200px]">
                {loading ? (
                  Array(2).fill(0).map((_, i) => <TaskCardSkeleton key={i} />)
                ) : columnTasks.length === 0 ? (
                  <EmptyState
                    icon={column.icon}
                    title="No tasks"
                    description={`No ${column.title.toLowerCase()} tasks yet`}
                    actionLabel={column.id === 'TODO' ? 'Create Task' : undefined}
                    onAction={column.id === 'TODO' ? () => setIsCreateModalOpen(true) : undefined}
                  />
                ) : (
                  columnTasks.map((task) => (
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

      {/* Workflow Rules */}
      <div className="mt-8 glass rounded-xl p-6">
        <h3 className="text-lg font-semibold text-slate-200 mb-4 flex items-center gap-2">
          <Shield className="h-5 w-5 text-amber-400" />
          Workflow Rules (Strictly Enforced in Backend)
        </h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="flex items-start gap-3 p-4 bg-slate-800/30 rounded-xl">
            <div className="p-2 rounded-lg bg-emerald-500/10">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Assignee Actions</p>
              <p className="text-xs text-slate-400 mt-1">Start task · Submit for review</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-slate-800/30 rounded-xl">
            <div className="p-2 rounded-lg bg-amber-500/10">
              <Eye className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Approver Actions</p>
              <p className="text-xs text-slate-400 mt-1">Approve · Reject with reason</p>
            </div>
          </div>
          <div className="flex items-start gap-3 p-4 bg-slate-800/30 rounded-xl">
            <div className="p-2 rounded-lg bg-primary-500/10">
              <Shield className="h-5 w-5 text-primary-400" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-200">Manager / Admin</p>
              <p className="text-xs text-slate-400 mt-1">Archive · Restore · Cancel any task</p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals */}
      <CreateTaskModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onTaskCreated={handleTaskCreated}
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

export default Dashboard;