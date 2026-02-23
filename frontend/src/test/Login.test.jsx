import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Login from '../pages/Login';

// Mock AuthContext
const mockLogin = vi.fn();
vi.mock('../context/AuthContext', () => ({
    useAuth: () => ({
        login: mockLogin,
        isAuthenticated: false,
    }),
}));

// Mock react-router-dom navigate
const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => {
    const actual = await vi.importActual('react-router-dom');
    return { ...actual, useNavigate: () => mockNavigate };
});

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
    default: { success: vi.fn(), error: vi.fn() },
}));

const renderLogin = () =>
    render(
        <BrowserRouter>
            <Login />
        </BrowserRouter>
    );

describe('Login Page', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders login form', () => {
        renderLogin();
        expect(screen.getByPlaceholderText(/username/i)).toBeInTheDocument();
        expect(screen.getByPlaceholderText(/password/i)).toBeInTheDocument();
        expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
    });

    it('shows validation for empty fields', async () => {
        renderLogin();
        const submitBtn = screen.getByRole('button', { name: /sign in/i });
        fireEvent.click(submitBtn);
        // The HTML5 required attribute should prevent submission
        const usernameInput = screen.getByPlaceholderText(/username/i);
        expect(usernameInput).toBeRequired();
    });

    it('calls login on form submission', async () => {
        mockLogin.mockResolvedValue({ success: true });
        renderLogin();

        fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'admin' } });
        fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'password123' } });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(mockLogin).toHaveBeenCalledWith('admin', 'password123');
        });
    });

    it('displays error message on failed login', async () => {
        mockLogin.mockResolvedValue({ success: false, error: 'Invalid credentials' });
        renderLogin();

        fireEvent.change(screen.getByPlaceholderText(/username/i), { target: { value: 'admin' } });
        fireEvent.change(screen.getByPlaceholderText(/password/i), { target: { value: 'wrong' } });
        fireEvent.click(screen.getByRole('button', { name: /sign in/i }));

        await waitFor(() => {
            expect(screen.getByText(/invalid credentials/i)).toBeInTheDocument();
        });
    });
});
