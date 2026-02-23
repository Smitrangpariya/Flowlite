import { useQuery, useInfiniteQuery } from '@tanstack/react-query';
import { fetchAllTasks, fetchArchivedTasks, fetchCancelledTasks, fetchTasksPaginated, fetchBoardTasks } from '../api/taskApi';

/**
 * Hook to fetch all tasks for a specific board
 */
export const useBoardTasks = (boardId, options = {}) => {
    return useQuery({
        queryKey: ['board-tasks', boardId],
        queryFn: () => fetchBoardTasks(boardId),
        enabled: !!boardId,
        refetchOnMount: true,
        staleTime: 5000,
        refetchOnWindowFocus: true,
        retry: 2,
        ...options
    });
};


/**
 * Hook to fetch all active tasks with auto-refresh
 */
export const useTasks = (options = {}) => {
    return useQuery({
        queryKey: ['tasks', 'active'],
        queryFn: fetchAllTasks,
        refetchInterval: 30000, // Auto-refresh every 30 seconds
        staleTime: 5000,
        refetchOnWindowFocus: true, // Refresh when user returns to tab
        retry: 2,
        ...options
    });
};

/**
 * Hook to fetch archived tasks
 */
export const useArchivedTasks = (options = {}) => {
    return useQuery({
        queryKey: ['tasks', 'archived'],
        queryFn: fetchArchivedTasks,
        refetchInterval: 30000,
        staleTime: 5000,
        refetchOnWindowFocus: true,
        retry: 2,
        ...options
    });
};

/**
 * Hook to fetch cancelled tasks
 */
export const useCancelledTasks = (options = {}) => {
    return useQuery({
        queryKey: ['tasks', 'cancelled'],
        queryFn: fetchCancelledTasks,
        refetchInterval: 30000,
        staleTime: 5000,
        refetchOnWindowFocus: true,
        retry: 2,
        ...options
    });
};

/**
 * Hook for infinite scroll with pagination
 * Returns paginated tasks with fetchNextPage/hasNextPage helpers
 */
export const useInfiniteTasksQuery = (options = {}) => {
    return useInfiniteQuery({
        queryKey: ['tasks', 'paginated'],
        queryFn: ({ pageParam = 0 }) => fetchTasksPaginated({ pageParam, size: 10 }),
        getNextPageParam: (lastPage) => {
            // Spring Page response has 'last' boolean and 'number' (current page)
            return lastPage.last ? undefined : lastPage.number + 1;
        },
        staleTime: 5000,
        refetchOnWindowFocus: true,
        retry: 2,
        ...options
    });
};
