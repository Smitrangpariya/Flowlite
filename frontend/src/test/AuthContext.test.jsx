import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../context/AuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock API
vi.mock('../api/axiosConfig', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        interceptors: {
            request: { use: vi.fn() },
            response: { use: vi.fn() },
        },
    },
}));

// A test consumer component
const TestConsumer = () => {
    const auth = useAuth();
    return (
        <div>
            <span data-testid="authenticated">{String(auth.isAuthenticated)}</span>
            <span data-testid="user">{auth.user?.username || 'null'}</span>
        </div>
    );
};

describe('AuthContext', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    it('provides unauthenticated state initially', async () => {
        await act(async () => {
            render(
                <BrowserRouter>
                    <AuthProvider>
                        <TestConsumer />
                    </AuthProvider>
                </BrowserRouter>
            );
        });

        expect(screen.getByTestId('authenticated').textContent).toBe('false');
        expect(screen.getByTestId('user').textContent).toBe('null');
    });

    it('restores user from localStorage', async () => {
        // Create a proper JWT-like token with base64-encoded payload
        const payload = btoa(JSON.stringify({ sub: 'testuser', role: 'ROLE_ADMIN', exp: Math.floor(Date.now() / 1000) + 3600 }));
        const fakeToken = `eyJhbGciOiJIUzI1NiJ9.${payload}.fakesignature`;
        localStorage.setItem('token', fakeToken);
        localStorage.setItem('user', JSON.stringify({
            username: 'testuser',
            role: 'ADMIN',
            userId: 1,
        }));

        await act(async () => {
            render(
                <BrowserRouter>
                    <AuthProvider>
                        <TestConsumer />
                    </AuthProvider>
                </BrowserRouter>
            );
        });

        expect(screen.getByTestId('authenticated').textContent).toBe('true');
        expect(screen.getByTestId('user').textContent).toBe('testuser');
    });

    it('throws error when useAuth used outside provider', () => {
        // Suppress console.error for this test
        const spy = vi.spyOn(console, 'error').mockImplementation(() => { });

        expect(() => render(<TestConsumer />)).toThrow(
            'useAuth must be used within an AuthProvider'
        );

        spy.mockRestore();
    });
});
