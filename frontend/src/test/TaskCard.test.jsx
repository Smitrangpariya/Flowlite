import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TaskCard from '../components/TaskCard';

// Mock AuthContext (TaskCard uses useAuth internally)
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        user: { username: 'admin', role: 'ADMIN', userId: 1 },
        isAdmin: () => true,
        isTeamLead: () => false,
        isProductManager: () => false,
        canApprove: () => true,
        hasRole: (r) => r === 'ADMIN',
        hasAnyRole: (roles) => roles.includes('ADMIN'),
    }),
}));

// Mock modals
vi.mock('../components/DeleteTaskModal', () => ({
    default: ({ isOpen, onClose, onConfirm }) =>
        isOpen ? <div data-testid="delete-modal"><button onClick={onConfirm}>Confirm Delete</button></div> : null,
}));
vi.mock('../components/CancelTaskModal', () => ({
    default: ({ isOpen }) =>
        isOpen ? <div data-testid="cancel-modal">Cancel Modal</div> : null,
}));
vi.mock('../components/ArchiveTaskModal', () => ({
    default: ({ isOpen }) =>
        isOpen ? <div data-testid="archive-modal">Archive Modal</div> : null,
}));
vi.mock('../components/AuditReportModal', () => ({
    default: ({ isOpen }) =>
        isOpen ? <div data-testid="audit-modal">Audit Modal</div> : null,
}));

const defaultTask = {
    id: 1,
    title: 'Test Task',
    description: 'This is a test task',
    priority: 'HIGH',
    status: 'CREATED',
    assigneeName: 'Alice',
    approverName: 'Bob',
    projectName: 'Test Project',
    createdAt: '2024-01-01T00:00:00',
};

const defaultProps = {
    task: defaultTask,
    onDelete: vi.fn(),
    onCancel: vi.fn(),
    onArchive: vi.fn(),
    onStatusChange: vi.fn(),
    currentUser: { role: 'ADMIN', username: 'admin' },
    userRole: 'ADMIN',
};

describe('TaskCard Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders task title and priority badge', () => {
        render(<TaskCard {...defaultProps} />);
        expect(screen.getByText('Test Task')).toBeInTheDocument();
        expect(screen.getByText('High')).toBeInTheDocument();
    });

    it('renders assignee info', () => {
        render(<TaskCard {...defaultProps} />);
        expect(screen.getByText('Alice')).toBeInTheDocument();
    });

    it('renders description', () => {
        render(<TaskCard {...defaultProps} />);
        expect(screen.getByText('This is a test task')).toBeInTheDocument();
    });

    it('renders project name when present', () => {
        render(<TaskCard {...defaultProps} />);
        expect(screen.getByText('Test Project')).toBeInTheDocument();
    });

    it('renders with different priority styles', () => {
        const { rerender } = render(<TaskCard {...defaultProps} />);
        expect(screen.getByText('High')).toBeInTheDocument();

        rerender(<TaskCard {...defaultProps} task={{ ...defaultTask, priority: 'LOW' }} />);
        expect(screen.getByText('Low')).toBeInTheDocument();
    });
});
