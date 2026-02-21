'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { useGame } from '@/lib/GameContext';
import { playWinChime, playLoseThud } from '@/lib/audio';
import type { ScratchResult } from '@/lib/GameContext';

interface ScratchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

type Phase = 'idle' | 'scratching' | 'result';

const OUTCOME_LABELS: Record<string, { label: string; color: string }> = {
    lose: { label: 'No Prize', color: 'text-gray-400' },
    win_5_coins: { label: '+5 Vibe Coins', color: 'text-amber-400' },
    win_15_chips: { label: '+15 Vibe Chips', color: 'text-purple-400' },
    win_25_coins: { label: '+25 Vibe Coins', color: 'text-amber-400' },
    win_50_chips: { label: '+50 Vibe Chips', color: 'text-purple-400' },
    win_200_coins: { label: '+200 Vibe Coins', color: 'text-yellow-300' },
};

export function ScratchOverlay({ isOpen, onClose }: ScratchOverlayProps) {
    const { state, playScratch } = useGame();
    const [phase, setPhase] = useState<Phase>('idle');
    const [result, setResult] = useState<ScratchResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [scratchProgress, setScratchProgress] = useState(0);
    const cancelledRef = useRef(false);
    const rafRef = useRef<number>(0);
    const revealTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

    useEffect(() => {
        if (isOpen) {
            cancelledRef.current = false;
            setPhase('idle');
            setResult(null);
            setError(null);
            setScratchProgress(0);
        } else {
            cancelledRef.current = true;
            cancelAnimationFrame(rafRef.current);
            clearTimeout(revealTimerRef.current);
        }
        return () => {
            cancelledRef.current = true;
            cancelAnimationFrame(rafRef.current);
            clearTimeout(revealTimerRef.current);
        };
    }, [isOpen]);

    const handleScratch = async () => {
        if (state.vibeChips < 10 || phase !== 'idle') return;
        setPhase('scratching');
        setError(null);
        setScratchProgress(0);

        const scratchResult = await playScratch();

        if (cancelledRef.current) return;

        if (!scratchResult.success) {
            setError(scratchResult.error ?? 'Something went wrong');
            setPhase('idle');
            return;
        }

        setResult(scratchResult);

        const duration = 1200;
        const start = Date.now();
        const animate = () => {
            if (cancelledRef.current) return;
            const elapsed = Date.now() - start;
            const progress = Math.min(1, elapsed / duration);
            setScratchProgress(progress);
            if (progress < 1) {
                rafRef.current = requestAnimationFrame(animate);
            } else {
                revealTimerRef.current = setTimeout(() => {
                    if (cancelledRef.current) return;
                    setPhase('result');
                    if (scratchResult.outcome === 'lose') {
                        playLoseThud();
                    } else {
                        playWinChime();
                    }
                }, 300);
            }
        };
        rafRef.current = requestAnimationFrame(animate);
    };

    const handlePlayAgain = () => {
        setPhase('idle');
        setResult(null);
        setError(null);
        setScratchProgress(0);
    };

    const canClose = phase === 'idle' || phase === 'result';

    const handleBackdropClick = useCallback(() => {
        if (canClose) onClose();
    }, [canClose, onClose]);

    const isWin = result?.outcome && result.outcome !== 'lose';
    const outcomeInfo = result?.outcome ? OUTCOME_LABELS[result.outcome] : null;

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
                    onClick={handleBackdropClick}
                >
                    <motion.div
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -40, opacity: 0 }}
                        className="w-full max-w-sm casino-modal-base casino-modal-gold-bar casino-modal-yellow"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-yellow-500/10 bg-gradient-to-r from-yellow-500/5 to-transparent">
                            <h2 className="text-lg font-bold bg-gradient-to-r from-yellow-300 to-amber-400 bg-clip-text text-transparent">Instant Scratch</h2>
                            <button
                                onClick={onClose}
                                disabled={!canClose}
                                className={`transition-colors ${canClose ? 'text-gray-500 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Scratch Card Area */}
                            <div className="relative aspect-[4/3] rounded-xl overflow-hidden border border-white/10">
                                {/* Prize layer (underneath) */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-gray-900 to-black">
                                    {result ? (
                                        <motion.div
                                            initial={{ scale: 0.8, opacity: 0 }}
                                            animate={{ scale: 1, opacity: 1 }}
                                            className="text-center space-y-2"
                                        >
                                            {isWin ? (
                                                <div className="h-10 w-10 mx-auto casino-chip casino-chip-lg casino-chip-gold chip-bounce">$</div>
                                            ) : (
                                                <div className="h-10 w-10 rounded-full bg-gray-800 flex items-center justify-center mx-auto">
                                                    <X className="h-6 w-6 text-gray-600" />
                                                </div>
                                            )}
                                            <p className={`text-2xl font-black ${outcomeInfo?.color ?? 'text-gray-400'}`}>
                                                {outcomeInfo?.label ?? 'No Prize'}
                                            </p>
                                        </motion.div>
                                    ) : (
                                        <p className="text-gray-600 text-sm">Scratch to reveal...</p>
                                    )}
                                </div>

                                {/* Gold foil layer (on top, animates away) */}
                                {phase !== 'result' && (
                                    <div
                                        className="absolute inset-0 bg-gradient-to-br from-yellow-600 via-yellow-500 to-yellow-700 flex items-center justify-center transition-none"
                                        style={{
                                            clipPath: `inset(0 ${scratchProgress * 100}% 0 0)`,
                                        }}
                                    >
                                        <div className="text-center space-y-2">
                                            <div className="text-4xl">&#x2728;</div>
                                            <p className="text-yellow-900 font-bold text-sm">SCRATCH ME</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Phase: Idle */}
                            {phase === 'idle' && (
                                <div className="space-y-3">
                                    <Button
                                        variant="gold"
                                        size="lg"
                                        onClick={handleScratch}
                                        disabled={state.vibeChips < 10}
                                        className="w-full"
                                    >
                                        <span className="casino-chip casino-chip-sm casino-chip-purple mr-2" style={{ width: '16px', height: '16px', fontSize: '8px' }}>C</span>
                                        Scratch to Play (10 Chips)
                                    </Button>

                                    {state.vibeChips < 10 && (
                                        <p className="text-xs text-red-400 text-center">
                                            Not enough chips. You need 10 Vibe Chips.
                                        </p>
                                    )}

                                    {error && (
                                        <p className="text-xs text-red-400 text-center">{error}</p>
                                    )}
                                </div>
                            )}

                            {/* Phase: Scratching */}
                            {phase === 'scratching' && (
                                <div className="text-center">
                                    <p className="text-sm text-yellow-400 font-mono animate-pulse">
                                        Revealing...
                                    </p>
                                </div>
                            )}

                            {/* Phase: Result */}
                            {phase === 'result' && (
                                <div className="space-y-3">
                                    <div className={`text-center p-3 rounded-lg border result-reveal ${
                                        isWin
                                            ? 'border-green-500/30 bg-green-500/10 win-pulse'
                                            : 'border-white/10 bg-white/5'
                                    }`}>
                                        <p className={`text-lg font-bold ${isWin ? 'gold-shimmer-text' : 'text-gray-400'}`}>
                                            {isWin ? 'You Won!' : 'Better luck next time!'}
                                        </p>
                                        {result && (result.rewardChips ?? 0) > 0 && (
                                            <p className="text-sm text-purple-300 mt-1">
                                                +{result.rewardChips} Vibe Chips
                                            </p>
                                        )}
                                        {result && (result.rewardCoins ?? 0) > 0 && (
                                            <p className="text-sm text-amber-300 mt-1">
                                                +{result.rewardCoins} Vibe Coins
                                            </p>
                                        )}
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="gold"
                                            size="md"
                                            onClick={handlePlayAgain}
                                            disabled={state.vibeChips < 10}
                                            className="flex-1"
                                        >
                                            Play Again
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="md"
                                            onClick={onClose}
                                            className="flex-1 border border-white/10 bg-white/5 text-gray-300 hover:bg-white/10"
                                        >
                                            Close
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Balance */}
                            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-yellow-500/10 pt-3">
                                <span>Your balance:</span>
                                <span className="flex items-center gap-1.5 font-mono text-purple-300 font-semibold">
                                    <span className="casino-chip casino-chip-sm casino-chip-purple" style={{ width: '14px', height: '14px', fontSize: '7px' }}>C</span>
                                    {state.vibeChips.toLocaleString()} Chips
                                </span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
