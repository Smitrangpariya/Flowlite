import { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Calendar } from 'lucide-react';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { useQueryClient } from '@tanstack/react-query';

const EditTaskModal = ({ isOpen, onClose, task }) => {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [priority, setPriority] = useState('MEDIUM');
    const [dueDate, setDueDate] = useState('');
    const [projectId, setProjectId] = useState('');
    const [assigneeId, setAssigneeId] = useState('');
    const [approverId, setApproverId] = useState('');
    const [projects, setProjects] = useState([]);
    const [users, setUsers] = useState([]);
    const [approvers, setApprovers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [loadingData, setLoadingData] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (isOpen && task) {
            setTitle(task.title || '');
            setDescription(task.description || '');
            setPriority(task.priority || 'MEDIUM');
            setDueDate(task.dueDate || '');
            setProjectId(task.projectId ? String(task.projectId) : '');
            setAssigneeId(task.assigneeId ? String(task.assigneeId) : '');
            setApproverId(task.approverId ? String(task.approverId) : '');
            fetchData();
        }
    }, [isOpen, task]);

    const fetchData = async () => {
        setLoadingData(true);
        try {
            const [projectsRes, usersRes] = await Promise.all([
                api.get('/projects'),
                api.get('/users')
            ]);
            setProjects(Array.isArray(projectsRes.data) ? projectsRes.data : []);
            const allUsers = Array.isArray(usersRes.data) ? usersRes.data : [];
            setUsers(allUsers);
            setApprovers(allUsers.filter(u => u.role === 'TEAM_LEAD' || u.role === 'ADMIN'));
        } catch (err) {
            console.error('Error loading data:', err);
        } finally {
            setLoadingData(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!title.trim()) {
            setError('Title is required');
            return;
        }

        setLoading(true);
        try {
            const taskData = {
                title: title.trim(),
                description: description.trim(),
                priority,
                dueDate: dueDate || null,
                projectId: projectId ? parseInt(projectId) : null,
                assigneeId: assigneeId ? parseInt(assigneeId) : null,
                approverId: approverId ? parseInt(approverId) : null,
            };

            await api.put(`/tasks/${task.id}`, taskData);
            toast.success('Task updated successfully!');
            queryClient.invalidateQueries({ queryKey: ['tasks'] });
            queryClient.invalidateQueries({ queryKey: ['myTasks'] });
            handleClose();
        } catch (err) {
            if (err.response?.status === 409) {
                toast.error('This task was updated by someone else. Please refresh and try again.');
                setError('Conflict: task was modified by another user.');
            } else {
                const errorMessage = err.response?.data?.message || 'Failed to update task';
                setError(errorMessage);
                toast.error(errorMessage);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        setError('');
        onClose();
    };

    if (!isOpen || !task) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-hidden glass rounded-2xl shadow-2xl">
                <div className="flex items-center justify-between p-6 border-b border-slate-700/50">
                    <h2 className="text-xl font-semibold text-slate-100">Edit Task</h2>
                    <button onClick={handleClose} className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors">
                        <X className="h-5 w-5 text-slate-400" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-5 overflow-y-auto max-h-[calc(90vh-140px)]">
                    {error && (
                        <div className="flex items-center gap-2 p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            <AlertCircle className="h-5 w-5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Title */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            Title <span className="text-red-400">*</span>
                        </label>
                        <input type="text" value={title} onChange={(e) => setTitle(e.target.value)}
                            className="input-field" placeholder="Enter task title" required disabled={loadingData} />
                    </div>

                    {/* Description */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                        <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                            className="input-field min-h-[100px] resize-none" placeholder="Enter task description"
                            rows={3} disabled={loadingData} />
                    </div>

                    {/* Priority */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Priority</label>
                        <div className="flex gap-3">
                            {[
                                { value: 'LOW', label: 'Low', color: 'bg-green-500/20 border-green-500/50 text-green-400' },
                                { value: 'MEDIUM', label: 'Medium', color: 'bg-amber-500/20 border-amber-500/50 text-amber-400' },
                                { value: 'HIGH', label: 'High', color: 'bg-red-500/20 border-red-500/50 text-red-400' },
                            ].map((p) => (
                                <button key={p.value} type="button" onClick={() => setPriority(p.value)} disabled={loadingData}
                                    className={`flex-1 px-4 py-2 rounded-lg border font-medium transition-all ${priority === p.value ? p.color : 'bg-slate-800/50 border-slate-600/50 text-slate-400 hover:border-slate-500'} disabled:opacity-50`}>
                                    {p.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Due Date */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                            <Calendar className="inline h-4 w-4 mr-1" /> Due Date
                        </label>
                        <input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)}
                            className="input-field" disabled={loadingData} />
                    </div>

                    {/* Project */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Project</label>
                        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} className="input-field" disabled={loadingData}>
                            <option value="">No project</option>
                            {projects.map((project) => (
                                <option key={project.id} value={project.id}>{project.name}</option>
                            ))}
                        </select>
                    </div>

                    {/* Assignee */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Assignee</label>
                        <select value={assigneeId} onChange={(e) => setAssigneeId(e.target.value)} className="input-field" disabled={loadingData}>
                            <option value="">Unassigned</option>
                            {users.map((user) => (
                                <option key={user.id} value={user.id}>{user.username} ({user.role})</option>
                            ))}
                        </select>
                    </div>

                    {/* Approver */}
                    <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">Approver</label>
                        <select value={approverId} onChange={(e) => setApproverId(e.target.value)} className="input-field" disabled={loadingData}>
                            <option value="">No approver</option>
                            {approvers.map((user) => (
                                <option key={user.id} value={user.id}>{user.username} ({user.role})</option>
                            ))}
                        </select>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-3 pt-4">
                        <button type="button" onClick={handleClose} className="flex-1 btn-secondary" disabled={loading}>Cancel</button>
                        <button type="submit" disabled={loading || !title.trim() || loadingData}
                            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50">
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <Save className="h-5 w-5" />
                                    Save Changes
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditTaskModal;
