import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

// Mock API
vi.mock('../api/axiosConfig', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
    },
}));

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

// Mock useBoards to avoid needing a QueryClientProvider in tests
vi.mock('../hooks/useBoards', () => ({
    useBoards: () => ({
        data: [
            { id: 1, name: 'My Board', isDefault: true, boardType: 'PERSONAL' }
        ]
    }),
}));

// Mock AuthContext (CreateTaskModal uses useAuth for canManageProjects)
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { role: 'ADMIN', username: 'admin', userId: 1 },
        canManageProjects: () => true,
    }),
}));

import CreateTaskModal from '../components/CreateTaskModal';
import api from '../api/axiosConfig';

describe('CreateTaskModal Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        api.get.mockImplementation((url) => {
            if (url === '/projects') return Promise.resolve({ data: [] });
            if (url === '/users') return Promise.resolve({ data: [] });
            if (url === '/task-templates') return Promise.resolve({ data: [] });
            return Promise.resolve({ data: [] });
        });
    });

    it('does not render when closed', () => {
        const { container } = render(
            <CreateTaskModal isOpen={false} onClose={vi.fn()} onTaskCreated={vi.fn()} />
        );
        expect(container.innerHTML).toBe('');
    });

    it('renders when open', async () => {
        render(
            <CreateTaskModal isOpen={true} onClose={vi.fn()} onTaskCreated={vi.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByText('Create New Task')).toBeInTheDocument();
        });
    });

    it('renders form fields', async () => {
        render(
            <CreateTaskModal isOpen={true} onClose={vi.fn()} onTaskCreated={vi.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/enter task title/i)).toBeInTheDocument();
            expect(screen.getByPlaceholderText(/enter task description/i)).toBeInTheDocument();
        });
    });

    it('shows template selector when templates exist', async () => {
        api.get.mockImplementation((url) => {
            if (url === '/task-templates') {
                return Promise.resolve({
                    data: [{
                        id: 1,
                        name: 'Bug Report',
                        defaultTitle: '[BUG] - ',
                        defaultDescription: 'Steps to reproduce:',
                        defaultPriority: 'HIGH',
                    }],
                });
            }
            return Promise.resolve({ data: [] });
        });

        render(
            <CreateTaskModal isOpen={true} onClose={vi.fn()} onTaskCreated={vi.fn()} />
        );

        await waitFor(() => {
            expect(screen.getByText('Use Template')).toBeInTheDocument();
            expect(screen.getByText('Bug Report')).toBeInTheDocument();
        });
    });

    it('submits form with task data', async () => {
        api.get.mockImplementation((url) => {
            if (url === '/projects') return Promise.resolve({ data: [] });
            if (url === '/users') return Promise.resolve({ data: [] });
            if (url === '/task-templates') return Promise.resolve({ data: [] });
            return Promise.resolve({ data: [] });
        });
        api.post.mockResolvedValue({ data: { id: 1, title: 'New Task' } });

        const mockCreated = vi.fn();
        const mockClose = vi.fn();

        render(
            <CreateTaskModal isOpen={true} onClose={mockClose} onTaskCreated={mockCreated} />
        );

        await waitFor(() => {
            expect(screen.getByPlaceholderText(/enter task title/i)).toBeInTheDocument();
        });

        fireEvent.change(screen.getByPlaceholderText(/enter task title/i), {
            target: { value: 'New Task' },
        });

        fireEvent.click(screen.getByText('Create Task'));

        await waitFor(() => {
            expect(api.post).toHaveBeenCalledWith('/tasks', expect.objectContaining({
                title: 'New Task',
                priority: 'MEDIUM',
            }));
        });
    });
});
