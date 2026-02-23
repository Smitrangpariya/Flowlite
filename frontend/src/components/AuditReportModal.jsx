import { useState } from 'react';
import { X, FileText, Download, Clock, User, CheckCircle, RotateCcw, MessageSquare, FileSpreadsheet, File } from 'lucide-react';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import TaskCommentSection from './TaskCommentSection';

const AuditReportModal = ({ isOpen, onClose, taskId }) => {
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [exporting, setExporting] = useState({ excel: false, pdf: false });
    const [activeTab, setActiveTab] = useState('audit');

    const fetchReport = async () => {
        if (!taskId) return;

        setLoading(true);
        setError('');

        try {
            const response = await api.get(`/tasks/${taskId}/audit-report`);
            setReport(response.data);
        } catch (err) {
            setError(err.response?.data?.message || 'Failed to load audit report');
            toast.error('Failed to load audit report');
        } finally {
            setLoading(false);
        }
    };

    // Fetch report when modal opens
    if (isOpen && !report && !loading && !error) {
        fetchReport();
    }

    const handleClose = () => {
        setReport(null);
        setError('');
        setActiveTab('audit');
        onClose();
    };

    const getCommentIcon = (type) => {
        switch (type) {
            case 'REJECTION':
                return <RotateCcw className="h-4 w-4 text-red-400" />;
            case 'APPROVAL':
                return <CheckCircle className="h-4 w-4 text-green-400" />;
            default:
                return <MessageSquare className="h-4 w-4 text-slate-400" />;
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString();
    };

    const canExport = report && (report.finalStatus === 'DONE' || report.finalStatus === 'ARCHIVED');

    const handleExportExcel = async () => {
        if (!canExport) return;
        setExporting(prev => ({ ...prev, excel: true }));
        try {
            const response = await api.get(`/tasks/${taskId}/audit-report/excel`, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], {
                type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
            });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `task-${taskId}-audit-report.xlsx`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('Excel report downloaded!');
        } catch (err) {
            toast.error('Failed to export Excel report');
        } finally {
            setExporting(prev => ({ ...prev, excel: false }));
        }
    };

    const handleExportPdf = async () => {
        if (!canExport) return;
        setExporting(prev => ({ ...prev, pdf: true }));
        try {
            const response = await api.get(`/tasks/${taskId}/audit-report/pdf`, {
                responseType: 'blob'
            });
            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `task-${taskId}-audit-report.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(url);
            toast.success('PDF report downloaded!');
        } catch (err) {
            toast.error('Failed to export PDF report');
        } finally {
            setExporting(prev => ({ ...prev, pdf: false }));
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Modal */}
            {/* Modal — flex-col layout: fixed header + tabs, scrollable body */}
            <div className="relative w-full max-w-2xl h-[80vh] flex flex-col glass rounded-2xl shadow-2xl animate-slide-up">
                {/* Sticky Header */}
                <div className="shrink-0 flex items-center justify-between p-6 border-b border-slate-700/50">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary-500/20">
                            <FileText className="h-5 w-5 text-primary-400" />
                        </div>
                        <h2 className="text-xl font-semibold text-slate-100">Audit Report</h2>
                    </div>
                    <div className="flex items-center gap-2">
                        {canExport && (
                            <>
                                <button
                                    onClick={handleExportExcel}
                                    disabled={exporting.excel}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-400 transition-colors text-sm disabled:opacity-50"
                                    title="Export as Excel"
                                >
                                    {exporting.excel ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-green-400"></div>
                                    ) : (
                                        <FileSpreadsheet className="h-4 w-4" />
                                    )}
                                    <span className="hidden sm:inline">Excel</span>
                                </button>
                                <button
                                    onClick={handleExportPdf}
                                    disabled={exporting.pdf}
                                    className="flex items-center gap-2 px-3 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-colors text-sm disabled:opacity-50"
                                    title="Export as PDF"
                                >
                                    {exporting.pdf ? (
                                        <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-red-400"></div>
                                    ) : (
                                        <File className="h-4 w-4" />
                                    )}
                                    <span className="hidden sm:inline">PDF</span>
                                </button>
                            </>
                        )}
                        <button
                            onClick={handleClose}
                            className="p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                        >
                            <X className="h-5 w-5 text-slate-400" />
                        </button>
                    </div>
                </div>

                {/* Sticky Tabs */}
                <div className="shrink-0 flex border-b border-slate-700/50">
                    <button
                        onClick={() => setActiveTab('audit')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'audit' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                        Audit Trail
                    </button>
                    <button
                        onClick={() => setActiveTab('comments')}
                        className={`px-6 py-3 text-sm font-medium transition-colors ${activeTab === 'comments' ? 'text-primary-400 border-b-2 border-primary-500' : 'text-slate-400 hover:text-slate-300'}`}
                    >
                        Comments
                    </button>
                </div>

                {/* Scrollable Body */}
                <div className="flex-1 overflow-y-auto min-h-0 p-6">
                    {activeTab === 'audit' && (
                        <>
                            {loading && (
                                <div className="flex items-center justify-center py-12">
                                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
                                </div>
                            )}

                            {error && (
                                <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-400 text-center">
                                    {error}
                                </div>
                            )}

                            {report && (
                                <div className="space-y-6">
                                    {/* Task Details */}
                                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <h3 className="font-semibold text-slate-200 mb-3">Task Details</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div>
                                                <p className="text-slate-400">Title</p>
                                                <p className="text-slate-100 font-medium">{report.taskTitle}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Priority</p>
                                                <p className="text-slate-100">{report.priority}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Project</p>
                                                <p className="text-slate-100">{report.projectName || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Final Status</p>
                                                <span className="inline-flex items-center gap-1 text-green-400">
                                                    <CheckCircle className="h-4 w-4" />
                                                    {report.finalStatus}
                                                </span>
                                            </div>
                                        </div>
                                        {report.taskDescription && (
                                            <div className="mt-4">
                                                <p className="text-slate-400">Description</p>
                                                <p className="text-slate-100">{report.taskDescription}</p>
                                            </div>
                                        )}
                                    </div>

                                    {/* People */}
                                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <h3 className="font-semibold text-slate-200 mb-3">People</h3>
                                        <div className="grid grid-cols-3 gap-4 text-sm">
                                            <div>
                                                <p className="text-slate-400">Created By</p>
                                                <p className="text-slate-100">{report.createdBy || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Assigned To</p>
                                                <p className="text-slate-100">{report.assignedTo || 'N/A'}</p>
                                            </div>
                                            <div>
                                                <p className="text-slate-400">Approved By</p>
                                                <p className="text-slate-100">{report.approvedBy || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Timeline */}
                                    <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                        <h3 className="font-semibold text-slate-200 mb-3">Timeline</h3>
                                        <div className="grid grid-cols-2 gap-4 text-sm">
                                            <div className="flex items-center gap-2">
                                                <Clock className="h-4 w-4 text-slate-400" />
                                                <div>
                                                    <p className="text-slate-400">Created</p>
                                                    <p className="text-slate-100">{formatDate(report.createdAt)}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <CheckCircle className="h-4 w-4 text-green-400" />
                                                <div>
                                                    <p className="text-slate-400">Completed</p>
                                                    <p className="text-slate-100">{formatDate(report.completedAt)}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Comments / History */}
                                    {report.comments && report.comments.length > 0 && (
                                        <div className="p-4 bg-slate-800/50 rounded-xl border border-slate-700/50">
                                            <h3 className="font-semibold text-slate-200 mb-3">Activity History</h3>
                                            <div className="space-y-3">
                                                {report.comments.map((comment, index) => (
                                                    <div key={index} className="flex gap-3 p-3 bg-slate-700/30 rounded-lg">
                                                        {getCommentIcon(comment.type)}
                                                        <div className="flex-1">
                                                            <div className="flex items-center gap-2 text-sm">
                                                                <span className="font-medium text-slate-200">{comment.author}</span>
                                                                <span className={`text-xs px-2 py-0.5 rounded-full ${comment.type === 'REJECTION' ? 'bg-red-500/20 text-red-400' :
                                                                    comment.type === 'APPROVAL' ? 'bg-green-500/20 text-green-400' :
                                                                        'bg-slate-600/50 text-slate-400'
                                                                    }`}>
                                                                    {comment.type}
                                                                </span>
                                                            </div>
                                                            <p className="text-sm text-slate-300 mt-1">{comment.comment}</p>
                                                            <p className="text-xs text-slate-500 mt-1">{formatDate(comment.timestamp)}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </>
                    )}

                    {activeTab === 'comments' && (
                        <TaskCommentSection taskId={taskId} />
                    )}
                </div>
            </div>
        </div>
    );
};

export default AuditReportModal;
