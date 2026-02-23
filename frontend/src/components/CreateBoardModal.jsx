import { useState, useEffect } from 'react';
import { X, Users, Lock, Palette, AlertCircle, ShieldAlert } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useCreateBoard } from '../hooks/useBoards';
import { BOARD_COLORS, BOARD_ICONS } from '../constants/boardColors';
import { hasPermission } from '../auth/permissions';
import { useAuth } from '../context/AuthContext';

const CreateBoardModal = ({ isOpen, onClose, defaultBoardType = 'TEAM', limits }) => {
    const { user } = useAuth();
    const canCreateTeamBoard = hasPermission(user, 'CREATE_TEAM_BOARD');

    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [boardType, setBoardType] = useState(canCreateTeamBoard ? defaultBoardType : 'PERSONAL');
    const [boardColor, setBoardColor] = useState(BOARD_COLORS[0].value);
    const [boardIcon, setBoardIcon] = useState('');
    const [setAsDefault, setSetAsDefault] = useState(false);
    const createMutation = useCreateBoard();

    useEffect(() => {
        if (isOpen) {
            setBoardType(canCreateTeamBoard ? defaultBoardType : 'PERSONAL');
            setName('');
            setDescription('');
            setBoardColor(BOARD_COLORS[0].value);
            setBoardIcon('');
            setSetAsDefault(false);
        }
    }, [isOpen, defaultBoardType]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await createMutation.mutateAsync({
            name: name.trim(),
            description: description.trim(),
            boardType,
            boardColor,
            boardIcon,
            isDefault: boardType === 'PERSONAL' ? setAsDefault : false,
        });
        onClose();
    };

    if (!isOpen) return null;

    const canCreate = boardType === 'TEAM'
        ? (limits?.canCreateTeamBoard ?? true)
        : (limits?.canCreatePersonalBoard ?? true);

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155', maxWidth: 672, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #334155', position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9' }}>Create New Board</h2>
                    <button onClick={onClose} style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: '#94a3b8' }}>
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Limit Warning */}
                    {!canCreate && (
                        <div style={{ padding: '1rem', background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', borderRadius: '0.5rem', display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
                            <AlertCircle style={{ width: 20, height: 20, color: '#f87171', flexShrink: 0, marginTop: 2 }} />
                            <div>
                                <h3 style={{ fontWeight: 600, color: '#fecaca' }}>Cannot Create Board</h3>
                                <p style={{ fontSize: '0.875rem', color: '#fca5a5', marginTop: 4 }}>
                                    {boardType === 'PERSONAL'
                                        ? `You've reached your limit of ${limits?.personalBoardsLimit} personal boards. Delete unused boards first.`
                                        : 'Only admins and managers can create team boards.'
                                    }
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Board Type */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1' }}>Board Type</label>
                        <div style={{ display: 'grid', gridTemplateColumns: canCreateTeamBoard ? '1fr 1fr' : '1fr', gap: '0.75rem' }}>
                            {canCreateTeamBoard && (
                                <button
                                    type="button"
                                    onClick={() => setBoardType('TEAM')}
                                    style={{
                                        padding: '1rem', borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s',
                                        border: `2px solid ${boardType === 'TEAM' ? '#3b82f6' : '#334155'}`,
                                        background: boardType === 'TEAM' ? 'rgba(59,130,246,0.1)' : 'transparent',
                                        textAlign: 'center'
                                    }}
                                >
                                    <Users style={{ width: 24, height: 24, margin: '0 auto 0.5rem', color: boardType === 'TEAM' ? '#60a5fa' : '#94a3b8' }} />
                                    <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>Team Board</div>
                                    <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>Shared with organization</div>
                                </button>
                            )}
                            <button
                                type="button"
                                onClick={() => setBoardType('PERSONAL')}
                                style={{
                                    padding: '1rem', borderRadius: '0.5rem', cursor: 'pointer', transition: 'all 0.2s',
                                    border: `2px solid ${boardType === 'PERSONAL' ? '#8b5cf6' : '#334155'}`,
                                    background: boardType === 'PERSONAL' ? 'rgba(139,92,246,0.1)' : 'transparent',
                                    textAlign: 'center'
                                }}
                            >
                                <Lock style={{ width: 24, height: 24, margin: '0 auto 0.5rem', color: boardType === 'PERSONAL' ? '#a78bfa' : '#94a3b8' }} />
                                <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#e2e8f0' }}>Personal Board</div>
                                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 4 }}>
                                    Private {limits ? `(${limits.personalBoardsRemaining} left)` : ''}
                                </div>
                            </button>
                        </div>
                        {!canCreateTeamBoard && (
                            <p style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.8125rem', color: '#94a3b8' }}>
                                <ShieldAlert style={{ width: 14, height: 14, flexShrink: 0 }} />
                                Only admins or managers can create team boards
                            </p>
                        )}
                    </div>

                    {/* Name */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1' }}>
                            Board Name <span style={{ color: '#f87171' }}>*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder={boardType === 'PERSONAL' ? 'My Personal Tasks' : 'Project Board'}
                            style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' }}
                            required
                            minLength={3}
                            maxLength={100}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1' }}>Description (Optional)</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="What's this board for?"
                            style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f1f5f9', outline: 'none', resize: 'none', boxSizing: 'border-box' }}
                            rows="3"
                            maxLength={500}
                        />
                    </div>

                    {/* Color Picker */}
                    <div>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1' }}>
                            <Palette style={{ width: 16, height: 16 }} />
                            Board Color
                        </label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '0.5rem' }}>
                            {BOARD_COLORS.map((color) => (
                                <button
                                    key={color.value}
                                    type="button"
                                    onClick={() => setBoardColor(color.value)}
                                    style={{
                                        width: 36, height: 36, borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                                        background: color.value, transition: 'transform 0.15s',
                                        transform: boardColor === color.value ? 'scale(1.15)' : 'scale(1)',
                                        outline: boardColor === color.value ? '2px solid #fff' : 'none',
                                        outlineOffset: 2
                                    }}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Icon Picker */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1' }}>Board Icon (Optional)</label>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(10, 1fr)', gap: '0.5rem' }}>
                            {BOARD_ICONS.map((icon) => {
                                const IconComp = LucideIcons[icon.icon];
                                return (
                                    <button
                                        key={icon.icon}
                                        type="button"
                                        onClick={() => setBoardIcon(boardIcon === icon.icon ? '' : icon.icon)}
                                        style={{
                                            width: 36, height: 36, borderRadius: '0.5rem', border: 'none', cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.15s',
                                            background: boardIcon === icon.icon ? 'rgba(59,130,246,0.2)' : 'rgba(51,65,85,0.3)',
                                            color: boardIcon === icon.icon ? '#60a5fa' : '#94a3b8',
                                            outline: boardIcon === icon.icon ? '2px solid #3b82f6' : 'none'
                                        }}
                                        title={icon.name}
                                    >
                                        {IconComp && <IconComp style={{ width: 18, height: 18 }} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Set as Default (Personal only) */}
                    {boardType === 'PERSONAL' && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="setDefault"
                                checked={setAsDefault}
                                onChange={(e) => setSetAsDefault(e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: '#3b82f6' }}
                            />
                            <label htmlFor="setDefault" style={{ fontSize: '0.875rem', color: '#cbd5e1', cursor: 'pointer' }}>
                                Set as my default board for quick task creation
                            </label>
                        </div>
                    )}

                    {/* Info Box */}
                    <div style={{
                        padding: '1rem', borderRadius: '0.5rem',
                        background: boardType === 'PERSONAL' ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)',
                        border: `1px solid ${boardType === 'PERSONAL' ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)'}`
                    }}>
                        <p style={{ fontSize: '0.875rem', color: '#cbd5e1', display: 'flex', alignItems: 'flex-start', gap: '0.25rem' }}>
                            {boardType === 'PERSONAL' ? (
                                <>
                                    <Lock style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
                                    Only you will be able to see and access this board. Perfect for personal todos, learning goals, or side projects.
                                </>
                            ) : (
                                <>
                                    <Users style={{ width: 16, height: 16, flexShrink: 0, marginTop: 2 }} />
                                    All members of your organization will be able to see this board. Great for team projects and collaboration.
                                </>
                            )}
                        </p>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#334155', border: 'none', color: '#e2e8f0', cursor: 'pointer', transition: 'background 0.2s' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={createMutation.isPending || !canCreate}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', color: '#fff', cursor: createMutation.isPending || !canCreate ? 'not-allowed' : 'pointer',
                                background: boardType === 'PERSONAL' ? '#7c3aed' : '#2563eb', transition: 'background 0.2s',
                                opacity: createMutation.isPending || !canCreate ? 0.5 : 1
                            }}
                        >
                            {createMutation.isPending ? 'Creating...' : 'Create Board'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default CreateBoardModal;
