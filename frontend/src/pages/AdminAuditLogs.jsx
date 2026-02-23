import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, User, Trash2, Plus, LogIn, LogOut, Mail, Key, Clock, FileText } from 'lucide-react';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';

const AdminAuditLogs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [days, setDays] = useState(7);
    const { organization } = useAuth();

    useEffect(() => {
        fetchLogs();
    }, [days]);

    const fetchLogs = async () => {
        try {
            setLoading(true);
            const response = await api.get(`/admin/audit-logs?days=${days}`);
            setLogs(response.data);
        } catch (error) {
            console.error('Failed to fetch audit logs', error);
            toast.error('Failed to load audit logs');
        } finally {
            setLoading(false);
        }
    };

    const getActionIcon = (action) => {
        if (action === 'USER_REGISTRATION') {
            return <Plus className="h-4 w-4 text-green-400" />;
        }
        if (action === 'USER_LOGIN') {
            return <LogIn className="h-4 w-4 text-blue-400" />;
        }
        if (action === 'USER_LOGOUT') {
            return <LogOut className="h-4 w-4 text-slate-400" />;
        }
        if (action === 'PASSWORD_RESET_REQUEST' || action === 'PASSWORD_RESET_COMPLETE') {
            return <Key className="h-4 w-4 text-yellow-400" />;
        }
        if (action === 'EMAIL_VERIFIED') {
            return <Mail className="h-4 w-4 text-green-400" />;
        }
        if (action === 'TASK_CREATED' || action === 'TASK_UPDATED' || action === 'TASK_STATUS_CHANGED') {
            return <FileText className="h-4 w-4 text-primary-400" />;
        }
        if (action === 'TASK_DELETED') {
            return <Trash2 className="h-4 w-4 text-red-400" />;
        }
        if (action === 'PROJECT_CREATED') {
            return <Plus className="h-4 w-4 text-accent-400" />;
        }
        return <Shield className="h-4 w-4 text-slate-400" />;
    };

    const getActionColor = (action) => {
        if (action.includes('DELETE')) return 'text-red-400';
        if (action.includes('CREATE') || action.includes('REGISTRATION')) return 'text-green-400';
        if (action.includes('LOGIN')) return 'text-blue-400';
        if (action.includes('PASSWORD')) return 'text-yellow-400';
        return 'text-slate-300';
    };

    const formatAction = (action) => {
        return action.replace(/_/g, ' ');
    };

    const formatDate = (timestamp) => {
        return new Date(timestamp).toLocaleString();
    };

    return (
        <div className="container mx-auto px-4 py-8">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
                        <Shield className="h-6 w-6 text-primary-400" />
                        Audit Logs
                    </h1>
                    <p className="text-slate-400 mt-1">
                        Track all security and admin actions in {organization?.name || 'your organization'}
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <select
                        value={days}
                        onChange={(e) => setDays(Number(e.target.value))}
                        className="input-field py-2 px-3 text-sm"
                    >
                        <option value={1}>Last 24 hours</option>
                        <option value={7}>Last 7 days</option>
                        <option value={30}>Last 30 days</option>
                        <option value={90}>Last 90 days</option>
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-12">
                    <div className="inline-block w-8 h-8 border-2 border-primary-400 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-400 mt-4">Loading audit logs...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="text-center py-12 glass rounded-xl">
                    <Shield className="h-12 w-12 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400">No audit logs found for the selected period</p>
                </div>
            ) : (
                <div className="glass rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-slate-800/50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Action
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Entity
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Details
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">
                                        Time
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-700/50">
                                {logs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                {getActionIcon(log.action)}
                                                <span className={`text-sm font-medium ${getActionColor(log.action)}`}>
                                                    {formatAction(log.action)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="px-2 py-1 text-xs rounded-full bg-slate-700/50 text-slate-300">
                                                {log.entity}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-2">
                                                <User className="h-4 w-4 text-slate-500" />
                                                <span className="text-sm text-slate-300">
                                                    {log.username || 'System'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="text-sm text-slate-400 line-clamp-1">
                                                {log.details || '-'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-sm text-slate-400">
                                                {formatDate(log.timestamp)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    <div className="px-6 py-3 bg-slate-800/30 border-t border-slate-700/50">
                        <p className="text-xs text-slate-500">
                            Showing {logs.length} log entries from the last {days} day{days > 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminAuditLogs;
