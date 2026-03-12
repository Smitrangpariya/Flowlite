import { Check, X, Mail } from 'lucide-react';
import { useEmailValidator } from '../hooks/useEmailValidator';

/**
 * EmailStrengthMeter
 *
 * Drop-in companion to any email <input>.
 * Renders a progress bar + per-rule checklist that updates as the user types —
 * mirroring the password-strength pattern already in the app.
 *
 * Props:
 *   email      {string}  - controlled input value (required)
 *   show       {boolean} - whether to render at all (default: true)
 *               Tip: pass `show={email.length > 0}` to hide until the user starts typing
 */
const EmailStrengthMeter = ({ email = '', show = true }) => {
    const { checks, status, label, color, barColor, barWidth, isValid } =
        useEmailValidator(email);

    if (!show || !email) return null;

    return (
        <div className="mt-2 space-y-2 animate-fade-in">
            {/* ── Progress bar + label ── */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <Mail className={`h-3.5 w-3.5 ${color}`} />
                    <span className={`text-xs font-semibold tracking-wide ${color}`}>
                        {label}
                    </span>
                </div>
                {isValid && (
                    <span className="text-xs text-green-400 font-medium flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        Valid email
                    </span>
                )}
            </div>

            {/* Segmented bar — one segment per rule */}
            <div className="flex gap-0.5 h-1.5 rounded-full overflow-hidden">
                {checks.map((check) => (
                    <div
                        key={check.key}
                        className={`flex-1 rounded-full transition-all duration-300 ${
                            check.pass ? barColor : 'bg-slate-700'
                        }`}
                    />
                ))}
            </div>

            {/* ── Per-rule checklist ── only show failing rules when not yet valid */}
            {!isValid && (
                <ul className="space-y-1 pt-1">
                    {checks.map((check) => (
                        <li
                            key={check.key}
                            className={`flex items-center gap-2 text-xs transition-all duration-200 ${
                                check.pass ? 'text-slate-500 line-through' : 'text-slate-400'
                            }`}
                        >
                            {check.pass ? (
                                <Check className="h-3 w-3 text-green-500 shrink-0" />
                            ) : (
                                <X className="h-3 w-3 text-slate-600 shrink-0" />
                            )}
                            {check.label}
                        </li>
                    ))}
                </ul>
            )}

            {/* All valid — compact success note */}
            {isValid && (
                <p className="text-xs text-slate-500">
                    All checks passed — ready to use.
                </p>
            )}
        </div>
    );
};

export default EmailStrengthMeter;
