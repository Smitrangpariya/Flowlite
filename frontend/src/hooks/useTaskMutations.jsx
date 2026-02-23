import { useMutation, useQueryClient } from '@tanstack/react-query';
import { archiveTask, cancelTask, restoreTask, deleteTask, undoDelete } from '../api/taskApi';
import toast from 'react-hot-toast';

/**
 * Invalidate all task-related queries — explicit keys to ensure archived/cancelled always refresh
 */
const invalidateAllTaskQueries = (queryClient) => {
    queryClient.invalidateQueries({ queryKey: ['tasks', 'active'] });
    queryClient.invalidateQueries({ queryKey: ['tasks', 'archived'] });
    queryClient.invalidateQueries({ queryKey: ['tasks', 'cancelled'] });
    queryClient.invalidateQueries({ queryKey: ['tasks', 'paginated'] });
    queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
};

/**
 * Archive task mutation with optimistic update
 */
export const useArchiveTask = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: archiveTask,
        onMutate: async (taskId) => {
            await queryClient.cancelQueries({ queryKey: ['tasks', 'active'] });

            const previousActive = queryClient.getQueryData(['tasks', 'active']);
            const previousArchived = queryClient.getQueryData(['tasks', 'archived']);

            // Find the task being archived from active cache
            const archivedTask = previousActive?.find((task) => task.id === taskId);

            // Optimistic: remove from active
            queryClient.setQueryData(['tasks', 'active'], (old) =>
                old ? old.filter((task) => task.id !== taskId) : []
            );

            // Optimistic: add to archived list if found in active cache
            if (archivedTask) {
                queryClient.setQueryData(['tasks', 'archived'], (old) => [
                    { ...archivedTask, status: 'ARCHIVED', archivedAt: new Date().toISOString() },
                    ...(old || [])
                ]);
            }

            // Also remove from any board-tasks caches
            queryClient.getQueriesData({ queryKey: ['board-tasks'] }).forEach(([key, data]) => {
                if (Array.isArray(data)) {
                    queryClient.setQueryData(key, data.filter((task) => task.id !== taskId));
                }
            });

            return { previousActive, previousArchived };
        },
        onError: (err, taskId, context) => {
            if (context?.previousActive) {
                queryClient.setQueryData(['tasks', 'active'], context.previousActive);
            }
            if (context?.previousArchived) {
                queryClient.setQueryData(['tasks', 'archived'], context.previousArchived);
            }
            toast.error(err.response?.data?.message || 'Failed to archive task');
        },
        onSuccess: (data) => {
            // Use the ACTUAL server response to guarantee the task is in the archived cache
            if (data && data.id) {
                queryClient.setQueryData(['tasks', 'archived'], (old) => {
                    const existing = old || [];
                    // Avoid duplicates
                    const filtered = existing.filter((t) => t.id !== data.id);
                    return [data, ...filtered];
                });
            }
            toast.success('Task archived');
            invalidateAllTaskQueries(queryClient);
        }
    });
};

/**
 * Restore task mutation with optimistic update
 */
export const useRestoreTask = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: restoreTask,
        onMutate: async (taskId) => {
            await queryClient.cancelQueries({ queryKey: ['tasks', 'archived'] });
            await queryClient.cancelQueries({ queryKey: ['tasks', 'cancelled'] });
            const previousArchived = queryClient.getQueryData(['tasks', 'archived']);
            const previousCancelled = queryClient.getQueryData(['tasks', 'cancelled']);

            // Optimistic update - remove from archived/cancelled
            queryClient.setQueryData(['tasks', 'archived'], (old) =>
                old ? old.filter((task) => task.id !== taskId) : []
            );
            queryClient.setQueryData(['tasks', 'cancelled'], (old) =>
                old ? old.filter((task) => task.id !== taskId) : []
            );

            return { previousArchived, previousCancelled };
        },
        onError: (err, taskId, context) => {
            if (context?.previousArchived) {
                queryClient.setQueryData(['tasks', 'archived'], context.previousArchived);
            }
            if (context?.previousCancelled) {
                queryClient.setQueryData(['tasks', 'cancelled'], context.previousCancelled);
            }
            toast.error(err.response?.data?.message || 'Failed to restore task');
        },
        onSuccess: () => {
            toast.success('Task restored');
            invalidateAllTaskQueries(queryClient);
        }
    });
};

/**
 * Undo delete mutation
 */
export const useUndoDelete = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: undoDelete,
        onSuccess: () => {
            invalidateAllTaskQueries(queryClient);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to undo delete');
        }
    });
};

/**
 * Delete task mutation with undo toast
 */
export const useDeleteTask = () => {
    const queryClient = useQueryClient();
    const undoMutation = useUndoDelete();

    return useMutation({
        mutationFn: deleteTask,
        onMutate: async (taskId) => {
            await queryClient.cancelQueries({ queryKey: ['tasks', 'active'] });
            await queryClient.cancelQueries({ queryKey: ['tasks', 'archived'] });
            await queryClient.cancelQueries({ queryKey: ['tasks', 'cancelled'] });
            const previousActive = queryClient.getQueryData(['tasks', 'active']);
            const previousArchived = queryClient.getQueryData(['tasks', 'archived']);
            const previousCancelled = queryClient.getQueryData(['tasks', 'cancelled']);

            // Optimistic update - remove from all lists
            queryClient.setQueryData(['tasks', 'active'], (old) =>
                old ? old.filter((task) => task.id !== taskId) : []
            );
            queryClient.setQueryData(['tasks', 'archived'], (old) =>
                old ? old.filter((task) => task.id !== taskId) : []
            );
            queryClient.setQueryData(['tasks', 'cancelled'], (old) =>
                old ? old.filter((task) => task.id !== taskId) : []
            );

            return { previousActive, previousArchived, previousCancelled };
        },
        onError: (err, taskId, context) => {
            // Rollback on error
            if (context?.previousActive) {
                queryClient.setQueryData(['tasks', 'active'], context.previousActive);
            }
            if (context?.previousArchived) {
                queryClient.setQueryData(['tasks', 'archived'], context.previousArchived);
            }
            if (context?.previousCancelled) {
                queryClient.setQueryData(['tasks', 'cancelled'], context.previousCancelled);
            }
            toast.error(err.response?.data?.message || 'Failed to delete task');
        },
        onSuccess: (deletedTask) => {
            // Show undo toast with 8 second timer
            toast(
                (t) => (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <span>Task deleted</span>
                        <button
                            onClick={() => {
                                undoMutation.mutate(deletedTask.id);
                                toast.dismiss(t.id);
                                toast.success('Delete undone');
                            }}
                            style={{
                                background: '#3b82f6',
                                color: 'white',
                                border: 'none',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                cursor: 'pointer',
                                fontWeight: '500'
                            }}
                        >
                            Undo
                        </button>
                    </div>
                ),
                { duration: 8000, icon: '🗑️' }
            );
            invalidateAllTaskQueries(queryClient);
        }
    });
};

/**
 * Cancel task mutation
 */
export const useCancelTask = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ taskId, reason }) => cancelTask(taskId, reason),
        onSuccess: () => {
            toast.success('Task cancelled');
            invalidateAllTaskQueries(queryClient);
        },
        onError: (err) => {
            toast.error(err.response?.data?.message || 'Failed to cancel task');
        }
    });
};
