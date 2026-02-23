'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface PendingPayout {
    id: string;
    week_id: string;
    amount: number;
    status: string;
    expires_at: string;
    created_at: string;
}

interface PendingPayoutAlertProps {
    onOpenPayoutSettings: () => void;
}

function formatCountdown(ms: number): string {
    if (ms <= 0) return 'Expired';
    const totalSeconds = Math.floor(ms / 1000);
    const days = Math.floor(totalSeconds / 86400);
    const hours = Math.floor((totalSeconds % 86400) / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    const parts: string[] = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0 || days > 0) parts.push(`${hours}h`);
    parts.push(`${minutes}m`);
    parts.push(`${seconds}s`);
    return parts.join(' ');
}

export function PendingPayoutAlert({ onOpenPayoutSettings }: PendingPayoutAlertProps) {
    const [payouts, setPayouts] = useState<PendingPayout[]>([]);
    const [countdown, setCountdown] = useState('');
    const [dismissed, setDismissed] = useState(false);

    const fetchPayouts = useCallback(async () => {
        try {
            const res = await fetch('/api/user/pending-payouts');
            if (!res.ok) return;
            const data = await res.json();
            setPayouts(data.payouts ?? []);
        } catch {
            // Silently fail — not critical for page load
        }
    }, []);

    useEffect(() => {
        fetchPayouts();
    }, [fetchPayouts]);

    // Live countdown ticker
    useEffect(() => {
        if (payouts.length === 0) return;

        const earliest = payouts.reduce((a, b) =>
            new Date(a.expires_at).getTime() < new Date(b.expires_at).getTime() ? a : b
        );

        const tick = () => {
            const remaining = new Date(earliest.expires_at).getTime() - Date.now();
            setCountdown(formatCountdown(remaining));
            if (remaining <= 0) {
                setPayouts([]);
            }
        };

        tick();
        const interval = setInterval(tick, 1000);
        return () => clearInterval(interval);
    }, [payouts]);

    const totalAmount = payouts.reduce((sum, p) => sum + p.amount, 0);
    const visible = payouts.length > 0 && !dismissed;

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0, y: -20, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: 'auto' }}
                    exit={{ opacity: 0, y: -20, height: 0 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="relative z-40 mb-4"
                >
                    <button
                        onClick={onOpenPayoutSettings}
                        className="group w-full text-left"
                    >
                        <div className="relative overflow-hidden rounded-xl border border-red-500/30 bg-gradient-to-r from-red-950/80 via-red-900/60 to-amber-950/80 p-4 shadow-lg shadow-red-500/10 transition-all duration-300 group-hover:border-yellow-500/50 group-hover:shadow-yellow-500/20">
                            {/* Animated glow pulse */}
                            <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-red-500/5 via-yellow-500/10 to-red-500/5 pointer-events-none" />

                            <div className="relative flex items-center gap-3">
                                <div className="flex-shrink-0 rounded-full bg-red-500/20 p-2">
                                    <AlertTriangle className="h-5 w-5 text-yellow-400" />
                                </div>

                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-bold text-yellow-300">
                                        You Won {'\u00A5'}{totalAmount.toLocaleString()}!
                                    </p>
                                    {payouts.some(p => p.status === 'pending') ? (
                                        <p className="text-xs text-red-200/80 mt-0.5">
                                            Set up your payout method within{' '}
                                            <span className="font-mono font-bold text-yellow-400">
                                                {countdown}
                                            </span>
                                            {' '}to claim your prize.
                                        </p>
                                    ) : (
                                        <p className="text-xs text-green-200/80 mt-0.5">
                                            Payout ready! Processing within{' '}
                                            <span className="font-mono font-bold text-green-400">
                                                {countdown}
                                            </span>
                                        </p>
                                    )}
                                </div>

                                <div className="flex-shrink-0 text-xs font-medium text-yellow-400/70 group-hover:text-yellow-300 transition-colors">
                                    {payouts.some(p => p.status === 'pending') ? 'Set up now \u2192' : 'View details \u2192'}
                                </div>
                            </div>
                        </div>
                    </button>

                    {/* Dismiss button */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            setDismissed(true);
                        }}
                        className="absolute top-1 right-1 p-1 text-gray-500 hover:text-white transition-colors rounded-full"
                        aria-label="Dismiss"
                    >
                        <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
