import { useState, useEffect } from 'react';
import { Plus, Trash2, FileText, RefreshCw, AlertCircle, X } from 'lucide-react';
import api from '../api/axiosConfig';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import ConfirmModal from '../components/ConfirmModal';

const TaskTemplates = () => {
    const { isAdmin, isProductManager } = useAuth();
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const canManage = isAdmin() || isProductManager();

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            setLoading(true);
            const response = await api.get('/templates');
            setTemplates(Array.isArray(response.data) ? response.data : []);
        } catch (err) {
            toast.error('Failed to load templates');
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = (template) => {
        setDeleteTarget(template);
    };

    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeleteLoading(true);
        try {
            await api.delete(`/templates/${deleteTarget.id}`);
            toast.success('Template deleted');
            fetchTemplates();
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to delete template');
        } finally {
            setDeleteLoading(false);
            setDeleteTarget(null);
        }
    };

    const getPriorityBadge = (priority) => {
        const styles = {
            LOW: 'bg-green-500/20 text-green-400 border-green-500/30',
            MEDIUM: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
            HIGH: 'bg-red-500/20 text-red-400 border-red-500/30',
        };
        return styles[priority] || 'bg-slate-500/20 text-slate-400';
    };

    if (loading) {
        return (
            <div className="min-h-[60vh] flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
                        <FileText className="h-7 w-7 text-primary-400" />
                        Task Templates
                    </h1>
                    <p className="text-slate-400 mt-1">Reusable templates for rapid task creation</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={fetchTemplates}
                        className="btn-secondary flex items-center gap-2"
                    >
                        <RefreshCw className="h-4 w-4" />
                        Refresh
                    </button>
                    {canManage && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="btn-primary flex items-center gap-2"
                        >
                            <Plus className="h-4 w-4" />
                            New Template
                        </button>
                    )}
                </div>
            </div>

            {/* Templates Grid */}
            {templates.length === 0 ? (
                <div className="glass rounded-xl p-12 text-center">
                    <FileText className="h-12 w-12 text-slate-500 mx-auto mb-3" />
                    <h3 className="text-lg font-medium text-slate-300 mb-1">No Templates</h3>
                    <p className="text-slate-500">
                        {canManage ? 'Create your first template to speed up task creation.' : 'No templates available yet.'}
                    </p>
                </div>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {templates.map((template) => (
                        <div key={template.id} className="glass rounded-xl p-5 border border-slate-700/50 hover:border-slate-600/50 transition-colors">
                            <div className="flex items-start justify-between mb-3">
                                <h3 className="font-semibold text-slate-100 text-lg">{template.name}</h3>
                                {canManage && (
                                    <button
                                        onClick={() => handleDelete(template)}
                                        className="p-1.5 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                                        title="Delete template"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </button>
                                )}
                            </div>
                            <div className="space-y-2">
                                <div>
                                    <p className="text-xs text-slate-500">Default Title</p>
                                    <p className="text-sm text-slate-300">{template.defaultTitle}</p>
                                </div>
                                {template.defaultDescription && (
                                    <div>
                                        <p className="text-xs text-slate-500">Description</p>
                                        <p className="text-sm text-slate-400 line-clamp-2">{template.defaultDescription}</p>
                                    </div>
                                )}
                                <div className="flex items-center justify-between pt-2 border-t border-slate-700/50">
                                    <span className={`text-xs px-2 py-1 rounded-full border ${getPriorityBadge(template.defaultPriority)}`}>
                                        {template.defaultPriority}
                                    </span>
                                    <span className="text-xs text-slate-500">
                                        by {template.createdByName}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create Modal */}
            {showCreateModal && (
                <CreateTemplateModal
                    onClose={() => setShowCreateModal(false)}
                    onCreated={() => { setShowCreateModal(false); fetchTemplates(); }}
                />
            )}

            {/* Delete Confirm Modal */}
            <ConfirmModal
                isOpen={!!deleteTarget}
                onClose={() => setDeleteTarget(null)}
                onConfirm={confirmDelete}
                title="Delete Template"
                message="Are you sure you want to delete this template?"
                itemName={deleteTarget?.name}
                confirmText="Delete Template"
                loading={deleteLoading}
            />
        </div>
    );
};

const CreateTemplateModal = ({ onClose, onCreated }) => {
    const [name, setName] = useState('');
    const [defaultTitle, setDefaultTitle] = useState('');
    const [defaultDescription, setDefaultDescription] = useState('');
    const [defaultPriority, setDefaultPriority] = useState('MEDIUM');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            await api.post('/templates', {
                name: name.trim(),
                defaultTitle: defaultTitle.trim(),
                defaultDescription: defaultDescription.trim(),
                defaultPriority,
            });
            toast.success('Template created!');
            onCreated();
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to create template');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md glass rounded-2xl shadow-2xl animate-slide-up">
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <h2 className="text-xl font-semibold text-slate-100">Create Template</h2>
                    <button onClick={onClose} className="p-2 hover:bg-slate-700/50 rounded-lg">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            <AlertCircle className="h-5 w-5" />
                            {error}
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Template Name <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="input-field"
                            placeholder="e.g. Bug Report, Feature Request"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Default Title <span className="text-red-400">*</span>
                        </label>
                        <input
                            type="text"
                            value={defaultTitle}
                            onChange={(e) => setDefaultTitle(e.target.value)}
                            className="input-field"
                            placeholder="e.g. [BUG] - "
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Default Description</label>
                        <textarea
                            value={defaultDescription}
                            onChange={(e) => setDefaultDescription(e.target.value)}
                            className="input-field min-h-[100px] resize-none"
                            placeholder="Default description for tasks created from this template"
                            rows={3}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Default Priority <span className="text-red-400">*</span>
                        </label>
                        <div className="flex gap-3">
                            {[
                                { value: 'LOW', label: 'Low', color: 'bg-green-500/20 border-green-500/50 text-green-400' },
                                { value: 'MEDIUM', label: 'Medium', color: 'bg-amber-500/20 border-amber-500/50 text-amber-400' },
                                { value: 'HIGH', label: 'High', color: 'bg-red-500/20 border-red-500/50 text-red-400' },
                            ].map((p) => (
                                <button
                                    key={p.value}
                                    type="button"
                                    onClick={() => setDefaultPriority(p.value)}
                                    className={`flex-1 px-4 py-2 rounded-lg border font-medium transition-all ${defaultPriority === p.value
                                        ? p.color
                                        : 'bg-slate-800/50 border-slate-600/50 text-slate-400 hover:border-slate-500'
                                        }`}
                                >
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={onClose} className="flex-1 btn-secondary">
                            Cancel
                        </button>
                        <button type="submit" disabled={loading || !name.trim() || !defaultTitle.trim()} className="flex-1 btn-primary disabled:opacity-50">
                            {loading ? 'Creating...' : 'Create Template'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default TaskTemplates;
