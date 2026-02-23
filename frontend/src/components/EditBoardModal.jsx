import { useState, useEffect } from 'react';
import { X, Palette } from 'lucide-react';
import * as LucideIcons from 'lucide-react';
import { useUpdateBoard } from '../hooks/useBoards';
import { BOARD_COLORS, BOARD_ICONS } from '../constants/boardColors';

const EditBoardModal = ({ isOpen, onClose, board }) => {
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [boardColor, setBoardColor] = useState(BOARD_COLORS[0].value);
    const [boardIcon, setBoardIcon] = useState('');
    const [isDefault, setIsDefault] = useState(false);
    const updateMutation = useUpdateBoard();

    useEffect(() => {
        if (isOpen && board) {
            setName(board.name || '');
            setDescription(board.description || '');
            setBoardColor(board.boardColor || BOARD_COLORS[0].value);
            setBoardIcon(board.boardIcon || '');
            setIsDefault(board.isDefault || false);
        }
    }, [isOpen, board]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        await updateMutation.mutateAsync({
            boardId: board.id,
            data: {
                name: name.trim(),
                description: description.trim(),
                boardType: board.boardType,
                boardColor,
                boardIcon,
                isDefault: board.boardType === 'PERSONAL' ? isDefault : false,
                displayOrder: board.displayOrder || 0,
            }
        });
        onClose();
    };

    if (!isOpen || !board) return null;

    const isPersonal = board.boardType === 'PERSONAL';

    return (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: '1rem' }}>
            <div style={{ background: '#1e293b', borderRadius: '0.75rem', border: '1px solid #334155', maxWidth: 672, width: '100%', maxHeight: '90vh', overflowY: 'auto' }}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid #334155', position: 'sticky', top: 0, background: '#1e293b', zIndex: 10 }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#f1f5f9' }}>Edit Board</h2>
                    <button onClick={onClose} style={{ padding: 8, background: 'transparent', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', color: '#94a3b8' }}>
                        <X style={{ width: 20, height: 20 }} />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                    {/* Board Type (read-only) */}
                    <div style={{
                        padding: '0.75rem 1rem', borderRadius: '0.5rem',
                        background: isPersonal ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)',
                        border: `1px solid ${isPersonal ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)'}`,
                        fontSize: '0.875rem', color: '#cbd5e1'
                    }}>
                        {isPersonal ? '🔒 Personal Board' : '👥 Team Board'} — type cannot be changed
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
                            style={{ width: '100%', padding: '0.75rem 1rem', background: 'rgba(15,23,42,0.5)', border: '1px solid #334155', borderRadius: '0.5rem', color: '#f1f5f9', outline: 'none', boxSizing: 'border-box' }}
                            required
                            minLength={3}
                            maxLength={100}
                        />
                    </div>

                    {/* Description */}
                    <div>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1' }}>Description</label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
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
                        <label style={{ display: 'block', marginBottom: '0.75rem', fontSize: '0.875rem', fontWeight: 500, color: '#cbd5e1' }}>Board Icon</label>
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
                    {isPersonal && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <input
                                type="checkbox"
                                id="editDefault"
                                checked={isDefault}
                                onChange={(e) => setIsDefault(e.target.checked)}
                                style={{ width: 16, height: 16, accentColor: '#3b82f6' }}
                            />
                            <label htmlFor="editDefault" style={{ fontSize: '0.875rem', color: '#cbd5e1', cursor: 'pointer' }}>
                                Set as my default board
                            </label>
                        </div>
                    )}

                    {/* Actions */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', paddingTop: '0.5rem' }}>
                        <button
                            type="button"
                            onClick={onClose}
                            style={{ padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#334155', border: 'none', color: '#e2e8f0', cursor: 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={updateMutation.isPending}
                            style={{
                                padding: '0.5rem 1rem', borderRadius: '0.5rem', border: 'none', color: '#fff',
                                cursor: updateMutation.isPending ? 'not-allowed' : 'pointer',
                                background: isPersonal ? '#7c3aed' : '#2563eb', transition: 'background 0.2s',
                                opacity: updateMutation.isPending ? 0.5 : 1
                            }}
                        >
                            {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditBoardModal;
