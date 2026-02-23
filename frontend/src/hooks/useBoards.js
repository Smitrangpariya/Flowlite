import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
    fetchBoardLimits,
    fetchAllBoards,
    fetchTeamBoards,
    fetchPersonalBoards,
    createBoard,
    updateBoard,
    deleteBoard,
    setDefaultBoard,
    reorderBoards
} from '../api/boardApi';
import toast from 'react-hot-toast';

export const useBoardLimits = () => {
    return useQuery({
        queryKey: ['boards', 'limits'],
        queryFn: fetchBoardLimits,
        staleTime: 60000,
    });
};

export const useBoards = () => {
    return useQuery({
        queryKey: ['boards', 'all'],
        queryFn: fetchAllBoards,
        staleTime: 30000,
    });
};

export const useTeamBoards = () => {
    return useQuery({
        queryKey: ['boards', 'team'],
        queryFn: fetchTeamBoards,
        staleTime: 30000,
    });
};

export const usePersonalBoards = () => {
    return useQuery({
        queryKey: ['boards', 'personal'],
        queryFn: fetchPersonalBoards,
        staleTime: 30000,
    });
};

export const useCreateBoard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: createBoard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boards'] });
            toast.success('Board created successfully');
        },
        onError: (error) => {
            const code = error.response?.data?.code;
            const message = error.response?.data?.message || 'Failed to create board';
            if (code === 'ACCESS_DENIED') {
                toast.error(message, { duration: 5000 });
            } else {
                toast.error(message);
            }
        },
    });
};

export const useUpdateBoard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: ({ boardId, data }) => updateBoard(boardId, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boards'] });
            toast.success('Board updated successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to update board');
        },
    });
};

export const useDeleteBoard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: deleteBoard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boards'] });
            toast.success('Board deleted successfully');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to delete board');
        },
    });
};

export const useSetDefaultBoard = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: setDefaultBoard,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boards'] });
            toast.success('Default board updated');
        },
        onError: (error) => {
            toast.error(error.response?.data?.message || 'Failed to set default board');
        },
    });
};

export const useReorderBoards = () => {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: reorderBoards,
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['boards'] });
        },
        onError: () => {
            toast.error('Failed to reorder boards');
        },
    });
};
