import { useEffect, useState, useContext } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { connectWebSocket, disconnectWebSocket } from '../api/websocket';
import { AuthContext } from '../context/AuthContext';

/**
 * Hook to connect to WebSocket and auto-invalidate task queries on events.
 * Subscribes to the current user's org-scoped topic.
 */
export const useTaskWebSocket = () => {
    const queryClient = useQueryClient();
    const { user } = useContext(AuthContext);
    const [isConnected, setIsConnected] = useState(false);

    useEffect(() => {
        const orgId = user?.organization?.id;
        if (!orgId) return;

        const handleTaskEvent = (event) => {
            console.log('Task WebSocket event:', event.type, event.task?.id);

            // ✅ FIX: Invalidate all task-related query keys explicitly.
            //    Previously ['board-tasks'] was invalidated as a prefix which is
            //    correct, but we also need 'dashboard' stats to re-fetch.
            //    Using { exact: false } on the base key covers all sub-keys.
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['board-tasks'] });
            queryClient.invalidateQueries({ queryKey: ['dashboard'] });
            queryClient.invalidateQueries({ queryKey: ['myTasks'] });
            queryClient.invalidateQueries({ queryKey: ['boards'] }); // refresh task counts on board cards
        };

        const handleConnectionChange = (connected) => {
            setIsConnected(connected);
        };

        connectWebSocket(orgId, handleTaskEvent, handleConnectionChange);

        return () => {
            disconnectWebSocket();
        };
    }, [queryClient, user?.organization?.id]);

    return { isConnected };
};
