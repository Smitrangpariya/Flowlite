import SockJS from 'sockjs-client/dist/sockjs';
import { Client } from '@stomp/stompjs';

let stompClient = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * WebSocket client for real-time task updates (org-scoped)
 * Subscribes to /topic/org/{orgId}/tasks to prevent cross-tenant leaks
 */
export const connectWebSocket = (orgId, onTaskEvent, onConnectionChange) => {
    if (!orgId) {
        console.warn('Cannot connect WebSocket: no orgId');
        return null;
    }

    stompClient = new Client({
        webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
        // Send JWT token in STOMP CONNECT headers for server-side auth
        connectHeaders: {
            Authorization: `Bearer ${localStorage.getItem('token') || ''}`,
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 10000,
        heartbeatOutgoing: 10000,
        debug: (str) => {
            if (import.meta.env.DEV) {
                console.debug('[STOMP]', str);
            }
        },
        onConnect: () => {
            console.log('WebSocket connected');
            reconnectAttempts = 0;
            onConnectionChange?.(true);

            // Subscribe to org-scoped topic
            stompClient.subscribe(`/topic/org/${orgId}/tasks`, (message) => {
                const event = JSON.parse(message.body);
                console.log('Task event received:', event);
                onTaskEvent?.(event);
            });
        },
        onStompError: (frame) => {
            console.error('STOMP error:', frame.headers['message']);
            onConnectionChange?.(false);
        },
        onDisconnect: () => {
            console.log('WebSocket disconnected');
            onConnectionChange?.(false);
        },
        onWebSocketClose: () => {
            reconnectAttempts++;
            if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
                console.warn('Max reconnect attempts reached');
                stompClient.deactivate();
            }
        }
    });

    stompClient.activate();
    return stompClient;
};

/**
 * Disconnect WebSocket
 */
export const disconnectWebSocket = () => {
    if (stompClient) {
        stompClient.deactivate();
        stompClient = null;
    }
};

/**
 * Check if WebSocket is connected
 */
export const isWebSocketConnected = () => {
    return stompClient?.connected || false;
};
