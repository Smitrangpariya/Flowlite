import { useState, useEffect, useRef } from 'react';
import { Search, Hash, FolderKanban, Users, Settings, LogOut, Plus, FileText, LayoutDashboard } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';

const CommandPalette = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [results, setResults] = useState([]);
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef(null);
    const navigate = useNavigate();
    const { logout, canManageUsers } = useAuth();

    // Global keyboard shortcut: Cmd+K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault();
                setIsOpen(prev => !prev);
            }

            if (e.key === 'Escape') {
                setIsOpen(false);
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setSelectedIndex(0);
            setResults(getDefaultActions());
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Search across entities
    useEffect(() => {
        if (!isOpen) return;

        if (!query.trim()) {
            setResults(getDefaultActions());
            return;
        }

        const searchEntities = async () => {
            try {
                const [tasksRes, boardsRes] = await Promise.allSettled([
                    api.get(`/tasks/search?search=${encodeURIComponent(query)}&size=5`),
                    api.get(`/boards`)
                ]);

                const taskResults = (tasksRes.status === 'fulfilled'
                    ? (tasksRes.value.data.content || tasksRes.value.data || [])
                    : []
                ).slice(0, 5).map(task => ({
                    type: 'task',
                    icon: Hash,
                    title: task.title,
                    subtitle: `#${task.id} · ${task.status?.replace('_', ' ')}`,
                    action: () => {
                        navigate('/');
                        setIsOpen(false);
                    }
                }));

                const allBoards = boardsRes.status === 'fulfilled'
                    ? (boardsRes.value.data || [])
                    : [];

                const boardResults = allBoards
                    .filter(board =>
                        board.name.toLowerCase().includes(query.toLowerCase())
                    )
                    .slice(0, 3)
                    .map(board => ({
                        type: 'board',
                        icon: FolderKanban,
                        title: board.name,
                        subtitle: `${board.boardType === 'PERSONAL' ? '🔒 Personal' : '👥 Team'} Board`,
                        action: () => {
                            navigate(`/boards/${board.id}/tasks`);
                            setIsOpen(false);
                        }
                    }));

                const filteredDefaults = getDefaultActions().filter(a =>
                    a.title.toLowerCase().includes(query.toLowerCase())
                );

                setResults([...taskResults, ...boardResults, ...filteredDefaults]);
                setSelectedIndex(0);

            } catch (error) {
                console.error('Search failed:', error);
            }
        };

        const debounce = setTimeout(searchEntities, 300);
        return () => clearTimeout(debounce);
    }, [query, isOpen]);

    // Default quick actions
    const getDefaultActions = () => {
        const actions = [
            {
                type: 'nav',
                icon: LayoutDashboard,
                title: 'Dashboard',
                subtitle: 'Go to task board',
                action: () => { navigate('/'); setIsOpen(false); }
            },
            {
                type: 'nav',
                icon: FolderKanban,
                title: 'Boards',
                subtitle: 'View all boards',
                action: () => { navigate('/boards'); setIsOpen(false); }
            },
            {
                type: 'nav',
                icon: FileText,
                title: 'Templates',
                subtitle: 'Task templates',
                action: () => { navigate('/templates'); setIsOpen(false); }
            },
            {
                type: 'nav',
                icon: Settings,
                title: 'Profile',
                subtitle: 'Account settings',
                action: () => { navigate('/profile'); setIsOpen(false); }
            },
        ];

        if (canManageUsers()) {
            actions.splice(3, 0, {
                type: 'nav',
                icon: Users,
                title: 'User Management',
                subtitle: 'Admin · Manage users and roles',
                action: () => { navigate('/admin/users'); setIsOpen(false); }
            });
        }

        actions.push({
            type: 'action',
            icon: LogOut,
            title: 'Sign Out',
            subtitle: '',
            action: () => { logout(); setIsOpen(false); }
        });

        return actions;
    };

    // Keyboard navigation
    const handleKeyDown = (e) => {
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setSelectedIndex(prev => (prev + 1) % Math.max(results.length, 1));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setSelectedIndex(prev => (prev - 1 + results.length) % Math.max(results.length, 1));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            results[selectedIndex]?.action();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-start justify-center pt-32 px-4 animate-fade-in">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={() => setIsOpen(false)}
            />

            {/* Command Palette */}
            <div className="relative w-full max-w-2xl bg-slate-800 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden animate-slide-in">
                {/* Search Input */}
                <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-700">
                    <Search className="h-5 w-5 text-slate-400 shrink-0" />
                    <input
                        ref={inputRef}
                        type="text"
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search tasks, boards, or type a command..."
                        className="flex-1 bg-transparent text-slate-100 placeholder-slate-500 outline-none text-sm"
                        autoFocus
                    />
                    <kbd className="px-2 py-1 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-700 rounded shrink-0">
                        Esc
                    </kbd>
                </div>

                {/* Results */}
                <div className="max-h-96 overflow-y-auto custom-scrollbar">
                    {results.length === 0 ? (
                        <div className="px-4 py-8 text-center text-slate-400 text-sm">
                            No results found for "{query}"
                        </div>
                    ) : (
                        results.map((result, index) => {
                            const Icon = result.icon;
                            const isSelected = index === selectedIndex;

                            return (
                                <button
                                    key={`${result.type}-${result.title}-${index}`}
                                    onClick={result.action}
                                    onMouseEnter={() => setSelectedIndex(index)}
                                    className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                                              ${isSelected ? 'bg-primary-500/20' : 'hover:bg-slate-700/50'}`}
                                >
                                    <div className={`p-2 rounded-lg shrink-0 ${isSelected ? 'bg-primary-500/20' : 'bg-slate-900'}`}>
                                        <Icon className={`h-4 w-4 ${isSelected ? 'text-primary-400' : 'text-slate-400'}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-medium text-slate-100 truncate">
                                            {result.title}
                                        </div>
                                        {result.subtitle && (
                                            <div className="text-xs text-slate-400 truncate">
                                                {result.subtitle}
                                            </div>
                                        )}
                                    </div>
                                    {isSelected && (
                                        <kbd className="px-2 py-1 text-xs font-mono text-slate-400 bg-slate-900 border border-slate-700 rounded shrink-0">
                                            ↵
                                        </kbd>
                                    )}
                                </button>
                            );
                        })
                    )}
                </div>

                {/* Footer Help */}
                <div className="flex items-center justify-between px-4 py-2 border-t border-slate-700 text-xs text-slate-400">
                    <span>
                        <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded">↑↓</kbd> navigate
                    </span>
                    <span>
                        <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded">↵</kbd> select
                    </span>
                    <span>
                        <kbd className="px-1 py-0.5 bg-slate-900 border border-slate-700 rounded">Ctrl+K</kbd> toggle
                    </span>
                </div>
            </div>
        </div>
    );
};

export default CommandPalette;
