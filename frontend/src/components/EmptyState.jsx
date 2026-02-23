import { FileQuestion, Plus } from 'lucide-react';

const EmptyState = ({
    icon: Icon = FileQuestion,
    title,
    description,
    actionLabel,
    onAction
}) => (
    <div className="flex flex-col items-center justify-center py-12 px-4">
        <div className="p-4 rounded-full bg-slate-800/50 border border-slate-700 mb-4">
            <Icon className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="text-lg font-semibold text-slate-200 mb-2">{title}</h3>
        <p className="text-sm text-slate-400 text-center max-w-sm mb-6">{description}</p>
        {actionLabel && onAction && (
            <button onClick={onAction} className="btn-primary flex items-center gap-2">
                <Plus className="h-4 w-4" />
                {actionLabel}
            </button>
        )}
    </div>
);

export default EmptyState;
