const TaskCardSkeleton = () => (
    <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 animate-pulse">
        {/* Header: ID + Priority + Status */}
        <div className="flex items-center gap-2 mb-3">
            <div className="h-4 w-10 bg-slate-700 rounded" />
            <div className="h-5 w-5 bg-slate-700 rounded" />
            <div className="h-5 w-16 bg-slate-700 rounded-md" />
        </div>
        {/* Title */}
        <div className="h-4 bg-slate-700 rounded mb-2 w-full" />
        <div className="h-4 bg-slate-700 rounded mb-3 w-3/4" />
        {/* Description */}
        <div className="h-3 bg-slate-700/60 rounded mb-4 w-5/6" />
        {/* Footer: Assignee + Meta */}
        <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
                <div className="h-6 w-6 bg-slate-700 rounded-full" />
                <div className="h-3 w-16 bg-slate-700 rounded" />
            </div>
            <div className="h-3 w-14 bg-slate-700 rounded" />
        </div>
    </div>
);

export default TaskCardSkeleton;
