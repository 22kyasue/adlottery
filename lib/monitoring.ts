/**
 * Error monitoring and alerting utility.
 * Uses Sentry for error tracking when NEXT_PUBLIC_SENTRY_DSN is configured,
 * falls back to console logging otherwise.
 */

import * as Sentry from '@sentry/nextjs';

type Severity = 'info' | 'warning' | 'error' | 'fatal';

interface ErrorContext {
    userId?: string;
    route?: string;
    extra?: Record<string, unknown>;
}

function toSentryScope(context?: ErrorContext): (scope: Sentry.Scope) => void {
    return (scope) => {
        if (context?.userId) scope.setUser({ id: context.userId });
        if (context?.route) scope.setTag('route', context.route);
        if (context?.extra) {
            for (const [key, value] of Object.entries(context.extra)) {
                scope.setExtra(key, value);
            }
        }
    };
}

const SEVERITY_MAP: Record<Severity, Sentry.SeverityLevel> = {
    info: 'info',
    warning: 'warning',
    error: 'error',
    fatal: 'fatal',
};

export function captureError(error: Error | string, context?: ErrorContext): void {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    // Always log to console for local dev / log drains
    console.error(`[monitor] ERROR: ${message}`, {
        ...context,
        stack,
        timestamp: new Date().toISOString(),
    });

    if (error instanceof Error) {
        Sentry.withScope((scope) => {
            toSentryScope(context)(scope);
            Sentry.captureException(error);
        });
    } else {
        Sentry.withScope((scope) => {
            toSentryScope(context)(scope);
            Sentry.captureMessage(message, 'error');
        });
    }
}

export function captureEvent(message: string, severity: Severity = 'info', context?: ErrorContext): void {
    const logFn = severity === 'error' || severity === 'fatal' ? console.error : console.warn;
    logFn(`[monitor] ${severity.toUpperCase()}: ${message}`, {
        ...context,
        timestamp: new Date().toISOString(),
    });

    Sentry.withScope((scope) => {
        toSentryScope(context)(scope);
        Sentry.captureMessage(message, SEVERITY_MAP[severity]);
    });
}

/**
 * Alert for critical failures that need immediate attention.
 * Sends to Sentry with fatal severity so it triggers alert rules.
 */
export function alertCritical(message: string, context?: ErrorContext): void {
    console.error(`[CRITICAL ALERT] ${message}`, {
        ...context,
        timestamp: new Date().toISOString(),
    });

    Sentry.withScope((scope) => {
        toSentryScope(context)(scope);
        scope.setLevel('fatal');
        scope.setTag('alert', 'critical');
        Sentry.captureMessage(message, 'fatal');
    });
}
