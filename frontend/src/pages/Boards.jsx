import { useState } from 'react';
import { useBoards, useBoardLimits, useDeleteBoard, useSetDefaultBoard } from '../hooks/useBoards';
import { Plus, Trash2, Users, Lock, Grid, Star, AlertCircle, Palette } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import CreateBoardModal from '../components/CreateBoardModal';
import EditBoardModal from '../components/EditBoardModal';
import { useNavigate } from 'react-router-dom';

const Boards = () => {
    const navigate = useNavigate();
    const { data: boards = [], isLoading } = useBoards();
    const { data: limits } = useBoardLimits();
    const deleteMutation = useDeleteBoard();
    const setDefaultMutation = useSetDefaultBoard();
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [selectedBoardType, setSelectedBoardType] = useState('TEAM');
    const [editingBoard, setEditingBoard] = useState(null);

    const teamBoards = boards.filter(b => b.boardType === 'TEAM');
    const personalBoards = boards.filter(b => b.boardType === 'PERSONAL');

    const handleCreateBoard = (type) => {
        if (type === 'PERSONAL' && limits && !limits.canCreatePersonalBoard) {
            return;
        }
        setSelectedBoardType(type);
        setShowCreateModal(true);
    };

    const handleEditBoard = (board) => {
        setEditingBoard(board);
        setShowEditModal(true);
    };

    const handleDeleteBoard = (board) => {
        if (window.confirm(`Delete board "${board.name}"? Tasks on this board will remain but become unassigned from a board.`)) {
            deleteMutation.mutate(board.id);
        }
    };

    const handleSetDefault = (board) => {
        setDefaultMutation.mutate(board.id);
    };

    const handleBoardClick = (boardId) => {
        navigate(`/boards/${boardId}/tasks`);
    };

    if (isLoading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500" />
            </div>
        );
    }

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div
                className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8"
                style={{ marginBottom: '2rem' }}
            >
                <div>
                    <h1 style={{ fontSize: '1.875rem', fontWeight: 700, color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                        <Grid style={{ width: 32, height: 32, color: '#60a5fa' }} />
                        Boards
                    </h1>
                    <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>Organize your work with team and personal boards</p>
                </div>
            </div>

            {/* Personal Boards Limit Warning */}
            {limits && limits.limitsEnforced && limits.personalBoardsRemaining <= 1 && (
                <div style={{
                    marginBottom: '1.5rem', padding: '1rem', background: 'rgba(245,158,11,0.1)',
                    border: '1px solid rgba(245,158,11,0.2)', borderRadius: '0.75rem',
                    display: 'flex', alignItems: 'flex-start', gap: '0.75rem'
                }}>
                    <AlertCircle style={{ width: 20, height: 20, color: '#fbbf24', flexShrink: 0, marginTop: 2 }} />
                    <div>
                        <h3 style={{ fontWeight: 600, color: '#fde68a' }}>Personal Board Limit</h3>
                        <p style={{ fontSize: '0.875rem', color: '#fcd34d', marginTop: 4 }}>
                            You've used {limits.personalBoardsUsed} of {limits.personalBoardsLimit} personal boards.
                            {limits.personalBoardsRemaining === 0
                                ? ' Delete unused boards to create new ones.'
                                : ` You have ${limits.personalBoardsRemaining} remaining.`
                            }
                        </p>
                    </div>
                </div>
            )}

            {/* Team Boards Section */}
            <div style={{ marginBottom: '3rem' }}>
                <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"
                    style={{ marginBottom: '1rem' }}
                >
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <Users style={{ width: 20, height: 20, color: '#60a5fa' }} />
                        Team Boards
                        <span style={{ fontSize: '0.875rem', color: '#64748b' }}>({teamBoards.length})</span>
                    </h2>
                    <button
                        onClick={() => handleCreateBoard('TEAM')}
                        disabled={limits && !limits.canCreateTeamBoard}
                        className="btn-primary"
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', opacity: limits && !limits.canCreateTeamBoard ? 0.5 : 1, cursor: limits && !limits.canCreateTeamBoard ? 'not-allowed' : 'pointer' }}
                        title={limits && !limits.canCreateTeamBoard ? 'Only admins can create team boards' : ''}
                    >
                        <Plus style={{ width: 16, height: 16 }} />
                        New Team Board
                    </button>
                </div>

                {teamBoards.length === 0 ? (
                    <div className="glass" style={{ borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                        <Users style={{ width: 64, height: 64, margin: '0 auto 1rem', color: '#475569' }} />
                        <p style={{ color: '#94a3b8' }}>No team boards yet</p>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>Create a team board to collaborate with your organization</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {teamBoards.map((board) => (
                            <BoardCard
                                key={board.id}
                                board={board}
                                onDelete={handleDeleteBoard}
                                onEdit={handleEditBoard}
                                onClick={() => handleBoardClick(board.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Personal Boards Section */}
            <div>
                <div
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4"
                    style={{ marginBottom: '1rem' }}
                >
                    <div className="flex items-center gap-3">
                        <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#e2e8f0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <Lock style={{ width: 20, height: 20, color: '#a78bfa' }} />
                            Personal Boards
                            <span style={{ fontSize: '0.875rem', color: '#64748b' }}>({personalBoards.length})</span>
                        </h2>
                        {limits && (
                            <span style={{
                                fontSize: '0.75rem', padding: '0.25rem 0.5rem', borderRadius: '9999px',
                                background: 'rgba(51,65,85,0.5)', color: '#94a3b8'
                            }}>
                                {limits.personalBoardsUsed} / {limits.personalBoardsLimit} used
                            </span>
                        )}
                    </div>
                    <button
                        onClick={() => handleCreateBoard('PERSONAL')}
                        disabled={limits && !limits.canCreatePersonalBoard}
                        style={{
                            padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#7c3aed',
                            color: '#fff', border: 'none', cursor: limits && !limits.canCreatePersonalBoard ? 'not-allowed' : 'pointer',
                            display: 'flex', alignItems: 'center', gap: '0.5rem', transition: 'background 0.2s',
                            opacity: limits && !limits.canCreatePersonalBoard ? 0.5 : 1
                        }}
                        title={limits && !limits.canCreatePersonalBoard ? `Limit reached (${limits.personalBoardsLimit} max)` : ''}
                        onMouseEnter={e => { if (!(limits && !limits.canCreatePersonalBoard)) e.target.style.background = '#6d28d9'; }}
                        onMouseLeave={e => e.target.style.background = '#7c3aed'}
                    >
                        <Plus style={{ width: 16, height: 16 }} />
                        New Personal Board
                    </button>
                </div>

                {personalBoards.length === 0 ? (
                    <div className="glass" style={{ borderRadius: '0.75rem', padding: '2rem', textAlign: 'center' }}>
                        <Lock style={{ width: 64, height: 64, margin: '0 auto 1rem', color: '#475569' }} />
                        <p style={{ color: '#94a3b8' }}>No personal boards yet</p>
                        <p style={{ fontSize: '0.875rem', color: '#64748b', marginTop: 4 }}>Create a personal board for your private tasks and projects</p>
                    </div>
                ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '1rem' }}>
                        {personalBoards.map((board) => (
                            <BoardCard
                                key={board.id}
                                board={board}
                                onDelete={handleDeleteBoard}
                                onEdit={handleEditBoard}
                                onSetDefault={handleSetDefault}
                                onClick={() => handleBoardClick(board.id)}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Modals */}
            <CreateBoardModal
                isOpen={showCreateModal}
                onClose={() => setShowCreateModal(false)}
                defaultBoardType={selectedBoardType}
                limits={limits}
            />

            <EditBoardModal
                isOpen={showEditModal}
                onClose={() => {
                    setShowEditModal(false);
                    setEditingBoard(null);
                }}
                board={editingBoard}
            />
        </div>
    );
};

const BoardCard = ({ board, onDelete, onEdit, onSetDefault, onClick }) => {
    const isPersonal = board.boardType === 'PERSONAL';
    const [hovered, setHovered] = useState(false);

    // Get icon component dynamically
    const IconComponent = board.boardIcon ? LucideIcons[board.boardIcon] : null;

    return (
        <div
            className="glass"
            style={{
                borderRadius: '0.75rem', padding: '1.5rem', cursor: 'pointer',
                position: 'relative', overflow: 'hidden', transition: 'box-shadow 0.2s, transform 0.2s',
                transform: hovered ? 'translateY(-2px)' : 'none',
                boxShadow: hovered ? '0 8px 25px rgba(0,0,0,0.3)' : 'none'
            }}
            onClick={onClick}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Color accent bar */}
            {board.boardColor && (
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: 3,
                    background: board.boardColor
                }} />
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {IconComponent ? (
                        <IconComponent style={{ width: 20, height: 20, color: board.boardColor || (isPersonal ? '#a78bfa' : '#60a5fa') }} />
                    ) : isPersonal ? (
                        <Lock style={{ width: 20, height: 20, color: '#a78bfa' }} />
                    ) : (
                        <Users style={{ width: 20, height: 20, color: '#60a5fa' }} />
                    )}
                    <span style={{
                        fontSize: '0.75rem', padding: '0.125rem 0.5rem', borderRadius: '9999px',
                        background: isPersonal ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)',
                        color: isPersonal ? '#a78bfa' : '#60a5fa',
                        border: `1px solid ${isPersonal ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)'}`
                    }}>
                        {isPersonal ? 'Personal' : 'Team'}
                    </span>
                    {board.isDefault && (
                        <Star style={{ width: 16, height: 16, color: '#facc15', fill: '#facc15' }} title="Default board" />
                    )}
                </div>
                <div style={{ display: 'flex', gap: 4, opacity: hovered ? 1 : 0, transition: 'opacity 0.2s' }}>
                    {isPersonal && !board.isDefault && onSetDefault && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onSetDefault(board); }}
                            style={{ padding: 6, background: 'transparent', border: 'none', borderRadius: '0.5rem', color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s' }}
                            title="Set as default"
                            onMouseEnter={e => e.currentTarget.style.color = '#facc15'}
                            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                        >
                            <Star style={{ width: 16, height: 16 }} />
                        </button>
                    )}
                    <button
                        onClick={(e) => { e.stopPropagation(); onEdit(board); }}
                        style={{ padding: 6, background: 'transparent', border: 'none', borderRadius: '0.5rem', color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s' }}
                        title="Edit board"
                        onMouseEnter={e => e.currentTarget.style.color = '#60a5fa'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <Palette style={{ width: 16, height: 16 }} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(board); }}
                        style={{ padding: 6, background: 'transparent', border: 'none', borderRadius: '0.5rem', color: '#94a3b8', cursor: 'pointer', transition: 'color 0.2s' }}
                        title="Delete board"
                        onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
                        onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
                    >
                        <Trash2 style={{ width: 16, height: 16 }} />
                    </button>
                </div>
            </div>

            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, color: '#f1f5f9', marginBottom: '0.5rem' }}>{board.name}</h3>

            {board.description && (
                <p style={{ fontSize: '0.875rem', color: '#94a3b8', marginBottom: '1rem', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                    {board.description}
                </p>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', fontSize: '0.75rem', color: '#64748b' }}>
                <span>{board.taskCount ?? 0} tasks</span>
                {isPersonal && board.ownerName && (
                    <span>Owner: {board.ownerName}</span>
                )}
            </div>
        </div>
    );
};

export default Boards;
