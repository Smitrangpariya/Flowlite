import { useState, useEffect } from 'react';
import { MessageSquare, Send, Trash2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axiosConfig';
import toast from 'react-hot-toast';
import { formatDistanceToNow } from 'date-fns';

const TaskCommentSection = ({ taskId }) => {
    const { user } = useAuth();
    const [comments, setComments] = useState([]);
    const [newComment, setNewComment] = useState('');
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (taskId) {
            fetchComments();
        }
    }, [taskId]);

    const fetchComments = async () => {
        setLoading(true);
        try {
            const response = await api.get(`/tasks/${taskId}/comments`);
            setComments(response.data);
        } catch (error) {
            console.error('Failed to fetch comments:', error);
            toast.error('Failed to load comments');
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!newComment.trim()) return;

        setSubmitting(true);
        try {
            await api.post(`/tasks/${taskId}/comments`, {
                content: newComment.trim()
            });
            setNewComment('');
            await fetchComments();
            toast.success('Comment added');
        } catch (error) {
            console.error('Failed to add comment:', error);
            toast.error('Failed to add comment');
        } finally {
            setSubmitting(false);
        }
    };

    const handleDelete = async (commentId) => {
        try {
            await api.delete(`/tasks/comments/${commentId}`);
            await fetchComments();
            toast.success('Comment deleted');
        } catch (error) {
            console.error('Failed to delete comment:', error);
            toast.error('Failed to delete comment');
        }
    };

    const getInitials = (name) => {
        if (!name) return '?';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-primary-500"></div>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="h-5 w-5 text-primary-400" />
                <h3 className="text-lg font-semibold text-slate-100">
                    Comments ({comments.length})
                </h3>
            </div>

            {/* Comment List */}
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
                {comments.length === 0 ? (
                    <div className="text-center py-8 text-slate-500">
                        <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-50" />
                        <p>No comments yet. Be the first to comment!</p>
                    </div>
                ) : (
                    comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 p-3 bg-slate-800/30 rounded-xl border border-slate-700/30">
                            {/* Avatar */}
                            <div className="shrink-0">
                                <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400">
                                    {getInitials(comment.commenterName)}
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between gap-2 mb-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-slate-200 text-sm">
                                            {comment.commenterName}
                                        </span>
                                        {comment.commenterId === user?.userId && (
                                            <span className="text-xs text-primary-400">(You)</span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs text-slate-500">
                                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                        </span>
                                        {comment.commenterId === user?.userId && (
                                            <button
                                                onClick={() => handleDelete(comment.id)}
                                                className="p-1 hover:bg-red-500/10 rounded text-slate-400 hover:text-red-400 transition-colors"
                                                title="Delete comment"
                                            >
                                                <Trash2 className="h-3 w-3" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <p className="text-sm text-slate-300 whitespace-pre-wrap break-words">
                                    {comment.content}
                                </p>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Add Comment Form */}
            <form onSubmit={handleSubmit} className="flex gap-3 pt-2 border-t border-slate-700/50">
                <div className="shrink-0 mt-1">
                    <div className="w-8 h-8 rounded-full bg-primary-500/20 flex items-center justify-center text-xs font-bold text-primary-400">
                        {getInitials(user?.username)}
                    </div>
                </div>
                <div className="flex-1 space-y-2">
                    <textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment..."
                        className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-slate-100 placeholder-slate-500 resize-none text-sm"
                        rows="3"
                        disabled={submitting}
                    />
                    <div className="flex justify-end">
                        <button
                            type="submit"
                            disabled={submitting || !newComment.trim()}
                            className="btn-primary flex items-center gap-2 text-sm disabled:opacity-50"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Posting...
                                </>
                            ) : (
                                <>
                                    <Send className="h-4 w-4" />
                                    Post Comment
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
};

export default TaskCommentSection;
