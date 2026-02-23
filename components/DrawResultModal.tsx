'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Trophy, X, PartyPopper, Frown, Loader2 } from 'lucide-react';
import { Button } from './ui/Button';
import confetti from 'canvas-confetti';

interface DrawResult {
    id: string;
    weekId: string;
    winningTicketNumber: number;
    totalTickets: number;
    prizeAmount: number;
    createdAt: string;
    winnerHint: string | null;
    isYou: boolean;
    payoutStatus: string | null;
}

interface DrawResultModalProps {
    onOpenPayoutSettings: () => void;
}

const SEEN_DRAW_KEY = 'lottoads-last-seen-draw';

function useCountUp(target: number, duration: number, active: boolean): number {
    const [value, setValue] = useState(0);
    const rafRef = useRef<number | null>(null);

    useEffect(() => {
        if (!active) return;
        const start = performance.now();

        const tick = (now: number) => {
            const elapsed = now - start;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setValue(Math.round(eased * target));
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(tick);
            }
        };

        rafRef.current = requestAnimationFrame(tick);
        return () => {
            if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
        };
    }, [active, target, duration]);

    return value;
}

export function DrawResultModal({ onOpenPayoutSettings }: DrawResultModalProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [result, setResult] = useState<DrawResult | null>(null);
    // Winner reveal phases: 'reveal' → 'result'
    const [phase, setPhase] = useState<'reveal' | 'result'>('reveal');

    const fetchLatestDraw = useCallback(async () => {
        try {
            const res = await fetch('/api/draw/results?limit=1');
            if (!res.ok) return;
            const data = await res.json();

            const latest = data.results?.[0];
            if (!latest) return;

            // Check if user has already seen this draw
            const lastSeen = localStorage.getItem(SEEN_DRAW_KEY);
            if (lastSeen === latest.id) return;

            setPhase('reveal');
            setResult(latest);
            setIsOpen(true);
        } catch {
            // Non-critical, fail silently
        }
    }, []);

    useEffect(() => {
        // Small delay so it doesn't compete with initial page load
        const timer = setTimeout(fetchLatestDraw, 2000);
        return () => clearTimeout(timer);
    }, [fetchLatestDraw]);

    // Winner confetti + phase transition
    useEffect(() => {
        if (!isOpen || !result?.isYou) return;

        // After 1.5s reveal spinner, fire confetti and switch to result phase
        const phaseTimer = setTimeout(() => {
            setPhase('result');

            confetti({
                particleCount: 150,
                spread: 70,
                origin: { y: 0.4 },
                colors: ['#FFD700', '#FFF', '#FF6B6B', '#4CAF50'],
            });

            // Second burst at 500ms
            setTimeout(() => {
                confetti({
                    particleCount: 80,
                    spread: 55,
                    origin: { y: 0.35 },
                    colors: ['#FFD700', '#FFF176', '#FFEB3B'],
                });
            }, 500);
        }, 1500);

        return () => clearTimeout(phaseTimer);
    }, [isOpen, result?.isYou]);

    const displayAmount = useCountUp(
        result?.prizeAmount ?? 0,
        1200,
        phase === 'result' && result?.isYou === true
    );

    const handleClose = () => {
        if (result) {
            localStorage.setItem(SEEN_DRAW_KEY, result.id);
        }
        setIsOpen(false);
    };

    const handleClaimPrize = () => {
        handleClose();
        onOpenPayoutSettings();
    };

    if (!result) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
                >
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0, y: 30 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.9, opacity: 0, y: -20 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-yellow-500/30 bg-[#0a0a0a] shadow-2xl shadow-yellow-500/10"
                    >
                        {/* Close button */}
                        <button
                            onClick={handleClose}
                            className="absolute top-4 right-4 z-10 text-gray-500 hover:text-white transition-colors"
                        >
                            <X className="h-5 w-5" />
                        </button>

                        {result.isYou ? (
                            /* WINNER VIEW */
                            <div className="relative">
                                {/* Gold gradient header */}
                                <div className="relative overflow-hidden bg-gradient-to-b from-yellow-600/30 via-yellow-900/20 to-transparent px-6 pt-8 pb-6 text-center">
                                    <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-yellow-500/5 via-yellow-300/10 to-yellow-500/5" />

                                    <AnimatePresence mode="wait">
                                        {phase === 'reveal' ? (
                                            /* REVEAL PHASE: spinner */
                                            <motion.div
                                                key="reveal"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                exit={{ opacity: 0, scale: 0.8 }}
                                                className="relative flex flex-col items-center gap-4"
                                            >
                                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20 ring-2 ring-yellow-500/40">
                                                    <Loader2 className="h-10 w-10 text-yellow-400 animate-spin" />
                                                </div>
                                                <p className="text-lg font-semibold text-yellow-200">Checking results…</p>
                                            </motion.div>
                                        ) : (
                                            /* RESULT PHASE: trophy + YOU WON */
                                            <motion.div
                                                key="result"
                                                initial={{ opacity: 0, scale: 0.8 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                                transition={{ type: 'spring', stiffness: 200 }}
                                                className="relative"
                                            >
                                                <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-yellow-500/20 ring-2 ring-yellow-500/40">
                                                    <PartyPopper className="h-10 w-10 text-yellow-400" />
                                                </div>
                                                <h2 className="text-2xl font-black text-yellow-300">
                                                    YOU WON!
                                                </h2>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>

                                <AnimatePresence>
                                    {phase === 'result' && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 16 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 0.4 }}
                                            className="px-6 pb-6 space-y-4"
                                        >
                                            <div className="text-center">
                                                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-yellow-100 to-yellow-500">
                                                    {'\u00A5'}{displayAmount.toLocaleString()}
                                                </span>
                                                <p className="mt-1 text-sm text-gray-400">
                                                    Week {result.weekId} &middot; #{String(result.winningTicketNumber).padStart(7, '0')} of {result.totalTickets.toLocaleString()}
                                                </p>
                                            </div>

                                            {result.payoutStatus === 'ready' ? (
                                                <>
                                                    <div className="rounded-lg bg-green-500/10 border border-green-500/20 p-3 text-sm text-green-200 text-center">
                                                        Your payout is ready — we&apos;ll send it to your registered account!
                                                    </div>
                                                    <Button
                                                        variant="gold"
                                                        size="lg"
                                                        onClick={handleClose}
                                                        className="w-full"
                                                    >
                                                        Awesome!
                                                    </Button>
                                                </>
                                            ) : (
                                                <>
                                                    <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-3 text-sm text-amber-200 text-center">
                                                        Set up your payout method to claim your prize!
                                                    </div>
                                                    <Button
                                                        variant="gold"
                                                        size="lg"
                                                        onClick={handleClaimPrize}
                                                        className="w-full"
                                                    >
                                                        Claim Your Prize
                                                    </Button>
                                                    <button
                                                        onClick={handleClose}
                                                        className="w-full text-center text-sm text-gray-500 hover:text-gray-300 transition-colors"
                                                    >
                                                        I&apos;ll do it later
                                                    </button>
                                                </>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        ) : (
                            /* NON-WINNER VIEW — unchanged */
                            <div className="relative">
                                <div className="relative overflow-hidden bg-gradient-to-b from-gray-800/30 to-transparent px-6 pt-8 pb-6 text-center">
                                    <motion.div
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ delay: 0.2, type: 'spring', stiffness: 200 }}
                                    >
                                        <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gray-700/30 ring-2 ring-gray-600/30">
                                            <Frown className="h-10 w-10 text-gray-400" />
                                        </div>
                                        <h2 className="text-xl font-bold text-gray-200">
                                            Draw Complete
                                        </h2>
                                    </motion.div>
                                </div>

                                <div className="px-6 pb-6 space-y-4">
                                    <div className="text-center space-y-2">
                                        <p className="text-sm text-gray-400">
                                            Week {result.weekId} &middot; Prize Pool
                                        </p>
                                        <span className="text-3xl font-black text-white">
                                            {'\u00A5'}{result.prizeAmount.toLocaleString()}
                                        </span>
                                        <p className="text-sm text-gray-500">
                                            #{String(result.winningTicketNumber).padStart(7, '0')} of {result.totalTickets.toLocaleString()}
                                        </p>
                                        <p className="text-xs text-gray-600">
                                            Winner: {result.winnerHint}
                                        </p>
                                    </div>

                                    <div className="rounded-lg bg-white/5 border border-white/10 p-3 text-sm text-gray-300 text-center">
                                        Better luck next week! Keep watching ads and earning tickets.
                                    </div>

                                    <Button
                                        variant="secondary"
                                        size="lg"
                                        onClick={handleClose}
                                        className="w-full bg-white/10 text-white hover:bg-white/15 border border-white/10"
                                    >
                                        <Trophy className="h-4 w-4 mr-2" />
                                        Keep Playing
                                    </Button>
                                </div>
                            </div>
                        )}
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
