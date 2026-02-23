/**
 * Error monitoring and alerting utility.
 * Currently logs to console — replace with Sentry, DataDog, or similar.
 *
 * Integration steps for production:
 * 1. Install SDK: npm install @sentry/nextjs
 * 2. Add SENTRY_DSN to env
 * 3. Replace captureError/captureEvent with Sentry.captureException/captureMessage
 */

type Severity = 'info' | 'warning' | 'error' | 'fatal';

interface ErrorContext {
    userId?: string;
    route?: string;
    extra?: Record<string, unknown>;
}

export function captureError(error: Error | string, context?: ErrorContext): void {
    const message = error instanceof Error ? error.message : error;
    const stack = error instanceof Error ? error.stack : undefined;

    // TODO: Replace with Sentry.captureException() or similar
    console.error(`[monitor] ERROR: ${message}`, {
        ...context,
        stack,
        timestamp: new Date().toISOString(),
    });
}

export function captureEvent(message: string, severity: Severity = 'info', context?: ErrorContext): void {
    // TODO: Replace with Sentry.captureMessage() or similar
    const logFn = severity === 'error' || severity === 'fatal' ? console.error : console.warn;
    logFn(`[monitor] ${severity.toUpperCase()}: ${message}`, {
        ...context,
        timestamp: new Date().toISOString(),
    });
}

/**
 * Alert for critical failures that need immediate attention.
 * In production, this should page on-call or send to Slack/PagerDuty.
 */
export function alertCritical(message: string, context?: ErrorContext): void {
    // TODO: Integrate with PagerDuty, Slack webhook, or similar
    console.error(`[CRITICAL ALERT] ${message}`, {
        ...context,
        timestamp: new Date().toISOString(),
    });
}
