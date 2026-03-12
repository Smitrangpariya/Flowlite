/**
 * useEmailValidator.js
 *
 * Real-time email validation hook.
 * Returns a structured result with per-rule pass/fail breakdown,
 * an overall status, and a color/label for UI rendering —
 * exactly like a password-strength meter but for email format.
 *
 * Usage:
 *   const { checks, status, color, label, isValid } = useEmailValidator(email);
 */

/**
 * All rules that a valid email must satisfy.
 * Each rule has:
 *   - key:     unique identifier
 *   - label:   human-readable description shown in the UI
 *   - test:    function that receives the raw email string and returns boolean
 */
const EMAIL_RULES = [
    {
        key: 'has_content',
        label: 'Email is not empty',
        test: (v) => v.trim().length > 0,
    },
    {
        key: 'has_at',
        label: 'Contains @ symbol',
        test: (v) => v.includes('@'),
    },
    {
        key: 'has_local',
        label: 'Has username before @',
        test: (v) => {
            const [local] = v.split('@');
            return local && local.trim().length > 0;
        },
    },
    {
        key: 'has_domain',
        label: 'Has domain after @',
        test: (v) => {
            const parts = v.split('@');
            const domain = parts[1];
            return domain && domain.trim().length > 0;
        },
    },
    {
        key: 'has_dot_in_domain',
        label: 'Domain contains a dot (e.g. .com)',
        test: (v) => {
            const parts = v.split('@');
            const domain = parts[1];
            if (!domain) return false;
            const dotIndex = domain.lastIndexOf('.');
            return dotIndex > 0 && dotIndex < domain.length - 1;
        },
    },
    {
        key: 'no_spaces',
        label: 'No spaces',
        test: (v) => !/\s/.test(v),
    },
    {
        key: 'valid_local_chars',
        label: 'No invalid characters',
        test: (v) => {
            const [local] = v.split('@');
            if (!local) return false;
            // RFC 5321 allowed characters in the local part
            return /^[a-zA-Z0-9._%+\-]+$/.test(local);
        },
    },
    {
        key: 'tld_length',
        label: 'Valid top-level domain (e.g. .com, .in)',
        test: (v) => {
            const parts = v.split('@');
            const domain = parts[1];
            if (!domain) return false;
            const dotIndex = domain.lastIndexOf('.');
            const tld = domain.slice(dotIndex + 1);
            return tld.length >= 2 && tld.length <= 24 && /^[a-zA-Z]+$/.test(tld);
        },
    },
];

/**
 * Derives the overall email quality status from how many rules pass.
 * Only returns a meaningful status when the user has started typing.
 *
 * @param {string}  email      - raw email string from input
 * @param {number}  passCount  - number of rules currently passing
 * @returns {{ status: string, label: string, color: string }}
 */
const deriveStatus = (email, passCount) => {
    const total = EMAIL_RULES.length;

    if (!email) {
        return { status: 'empty', label: '', color: '' };
    }

    // "invalid" bucket — first basic rules not yet passing
    if (passCount <= 2) {
        return {
            status: 'invalid',
            label: 'Invalid',
            color: 'text-red-400',
            barColor: 'bg-red-500',
            barWidth: `${(passCount / total) * 100}%`,
        };
    }

    if (passCount <= 4) {
        return {
            status: 'incomplete',
            label: 'Incomplete',
            color: 'text-amber-400',
            barColor: 'bg-amber-500',
            barWidth: `${(passCount / total) * 100}%`,
        };
    }

    if (passCount <= 6) {
        return {
            status: 'almost',
            label: 'Almost valid',
            color: 'text-yellow-400',
            barColor: 'bg-yellow-500',
            barWidth: `${(passCount / total) * 100}%`,
        };
    }

    if (passCount === total) {
        return {
            status: 'valid',
            label: 'Looks good!',
            color: 'text-green-400',
            barColor: 'bg-green-500',
            barWidth: '100%',
        };
    }

    return {
        status: 'almost',
        label: 'Almost valid',
        color: 'text-yellow-400',
        barColor: 'bg-yellow-400',
        barWidth: `${(passCount / total) * 100}%`,
    };
};

/**
 * useEmailValidator
 *
 * @param {string} email - controlled input value
 * @returns {{
 *   checks:  Array<{ key: string, label: string, pass: boolean }>,
 *   status:  string,   // 'empty' | 'invalid' | 'incomplete' | 'almost' | 'valid'
 *   label:   string,   // human-readable summary label
 *   color:   string,   // tailwind text color class
 *   barColor:string,   // tailwind bg color class for the progress bar
 *   barWidth:string,   // CSS width string e.g. '62.5%'
 *   isValid: boolean,  // true only when ALL rules pass
 * }}
 */
export const useEmailValidator = (email = '') => {
    const checks = EMAIL_RULES.map((rule) => ({
        key:   rule.key,
        label: rule.label,
        pass:  rule.test(email),
    }));

    const passCount = checks.filter((c) => c.pass).length;
    const { status, label, color, barColor, barWidth } = deriveStatus(email, passCount);
    const isValid = passCount === EMAIL_RULES.length;

    return { checks, status, label, color, barColor, barWidth, isValid };
};
