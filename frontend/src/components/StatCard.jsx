import React from 'react';

const StatCard = ({ icon: Icon, title, value, percentage, gradient, iconColor }) => {
    return (
        <div className={`relative overflow-hidden rounded-xl p-4 ${gradient || 'bg-slate-800/50'} border border-slate-700/50 backdrop-blur-sm`}>
            {/* Background decoration */}
            <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/5 blur-2xl" />
            
            <div className="relative flex items-center gap-4">
                <div className={`p-3 rounded-xl bg-white/10 backdrop-blur-sm`}>
                    <Icon className={`h-6 w-6 ${iconColor || 'text-white'}`} />
                </div>
                <div className="flex-1">
                    <p className="text-sm text-slate-300 font-medium">{title}</p>
                    <div className="flex items-baseline gap-2">
                        <p className="text-2xl font-bold text-white">{value}</p>
                        {percentage !== undefined && (
                            <span className="text-xs text-slate-400">
                                {percentage}%
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StatCard;
