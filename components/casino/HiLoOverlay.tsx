'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ArrowUp, ArrowDown, Equal } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CardFace } from './CardFace';
import { useGame } from '@/lib/GameContext';
import { playWinChime, playLoseThud, playCardFlip } from '@/lib/audio';
import type { HiLoResult } from '@/lib/GameContext';

interface HiLoOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

type Phase = 'betting' | 'guessing' | 'revealing' | 'result';

const RANK_LABELS: Record<number, string> = {
    1: 'Ace', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
    8: '8', 9: '9', 10: '10', 11: 'Jack', 12: 'Queen', 13: 'King',
};

export function HiLoOverlay({ isOpen, onClose }: HiLoOverlayProps) {
    const { state, playHiLo } = useGame();
    const [phase, setPhase] = useState<Phase>('betting');
    const [bet, setBet] = useState('');
    const [result, setResult] = useState<HiLoResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showFirstCard, setShowFirstCard] = useState(false);
    const [showSecondCard, setShowSecondCard] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const cancelledRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };

    useEffect(() => {
        if (isOpen) {
            cancelledRef.current = false;
            setPhase('betting');
            setBet('');
            setResult(null);
            setError(null);
            setShowFirstCard(false);
            setShowSecondCard(false);
            setIsSubmitting(false);
        } else {
            cancelledRef.current = true;
            clearTimers();
        }
        return () => {
            cancelledRef.current = true;
            clearTimers();
        };
    }, [isOpen]);

    const parsedBet = Math.floor(Number(bet));
    const validBet = Number.isFinite(parsedBet) && parsedBet > 0 && parsedBet <= 500;

    const canClose = phase === 'betting' || phase === 'result';

    const handleBackdropClick = useCallback(() => {
        if (canClose) onClose();
    }, [canClose, onClose]);

    const handleDeal = () => {
        if (!validBet) return;
        if (parsedBet > state.vibeChips) {
            setError('Not enough chips.');
            return;
        }
        setError(null);
        setPhase('guessing');
    };

    const handleGuess = async (guess: 'higher' | 'lower') => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setError(null);

        const hiloResult = await playHiLo(parsedBet, guess);

        if (cancelledRef.current) return;

        if (!hiloResult.success) {
            setError(hiloResult.error ?? 'Something went wrong');
            setPhase('betting');
            setIsSubmitting(false);
            return;
        }

        setResult(hiloResult);
        setPhase('revealing');

        timersRef.current.push(setTimeout(() => {
            if (cancelledRef.current) return;
            setShowFirstCard(true);
            playCardFlip();
        }, 300));

        timersRef.current.push(setTimeout(() => {
            if (cancelledRef.current) return;
            setShowSecondCard(true);
            playCardFlip();
        }, 1000));

        timersRef.current.push(setTimeout(() => {
            if (cancelledRef.current) return;
            setPhase('result');
            setIsSubmitting(false);
            if (hiloResult.outcome === 'win') {
                playWinChime();
            } else if (hiloResult.outcome === 'lose') {
                playLoseThud();
            }
        }, 1700));
    };

    const handlePlayAgain = () => {
        clearTimers();
        setPhase('betting');
        setBet('');
        setResult(null);
        setError(null);
        setShowFirstCard(false);
        setShowSecondCard(false);
    };

    const getOddsPreview = (card: number) => {
        const higherCount = 13 - card;
        const lowerCount = card - 1;
        const higherMult = higherCount > 0 ? Math.max(1.2, Math.min(12.0, 13.0 / higherCount)) : 0;
        const lowerMult = lowerCount > 0 ? Math.max(1.2, Math.min(12.0, 13.0 / lowerCount)) : 0;
        return { higherCount, lowerCount, higherMult, lowerMult };
    };

    const showFelt = phase === 'guessing' || phase === 'revealing' || phase === 'result';

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
                        className="w-full max-w-md casino-modal-base casino-modal-gold-bar casino-modal-purple"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-purple-500/10 bg-gradient-to-r from-purple-500/5 to-transparent">
                            <h2 className="text-lg font-bold bg-gradient-to-r from-purple-300 to-violet-400 bg-clip-text text-transparent">Hi-Lo Cards</h2>
                            <button
                                onClick={onClose}
                                disabled={!canClose}
                                className={`transition-colors ${canClose ? 'text-gray-500 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Phase: Betting — interactive chip table */}
                            {phase === 'betting' && (
                                <div className="space-y-4">
                                    {/* Betting circle on felt */}
                                    <div className="casino-felt py-5 flex flex-col items-center gap-3">
                                        {/* Betting circle */}
                                        <div className="relative w-28 h-28 rounded-full border-2 border-dashed border-yellow-600/40 flex flex-col items-center justify-center">
                                            {/* Stacked chips visual inside the circle */}
                                            {parsedBet > 0 && (
                                                <div className="flex flex-col items-center gap-0" style={{ marginBottom: '4px' }}>
                                                    {/* Show chip stack based on bet size */}
                                                    {parsedBet >= 100 && (
                                                        <div className="casino-chip casino-chip-md casino-chip-gold chip-bounce" style={{ marginBottom: '-6px', zIndex: 3 }}>$</div>
                                                    )}
                                                    {parsedBet >= 25 && (
                                                        <div className="casino-chip casino-chip-md casino-chip-purple chip-bounce" style={{ marginBottom: '-6px', zIndex: 2, animationDelay: '0.05s' }}>C</div>
                                                    )}
                                                    <div className="casino-chip casino-chip-md casino-chip-purple chip-bounce" style={{ zIndex: 1, animationDelay: '0.1s' }}>C</div>
                                                </div>
                                            )}
                                            {parsedBet <= 0 && (
                                                <p className="text-yellow-600/50 text-[10px] uppercase tracking-wider font-bold text-center px-2">Place bet</p>
                                            )}
                                        </div>

                                        {/* Live bet amount */}
                                        <div className="text-center">
                                            <p className="text-2xl font-black tabular-nums text-white">
                                                {parsedBet > 0 ? parsedBet : 0}
                                            </p>
                                            <p className="text-emerald-200/50 text-[10px] uppercase tracking-widest font-bold">chips wagered</p>
                                        </div>
                                    </div>

                                    {/* Chip rack — tap to add */}
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 text-center">Tap chips to bet</p>
                                        <div className="flex justify-center gap-2">
                                            {[
                                                { value: 5, color: 'casino-chip-purple' },
                                                { value: 10, color: 'casino-chip-purple' },
                                                { value: 25, color: 'casino-chip-gold' },
                                                { value: 50, color: 'casino-chip-gold' },
                                                { value: 100, color: 'casino-chip-yellow' },
                                            ].map(chip => {
                                                const wouldExceed = parsedBet + chip.value > Math.min(500, state.vibeChips);
                                                return (
                                                    <button
                                                        key={chip.value}
                                                        onClick={() => {
                                                            const newBet = Math.min(parsedBet + chip.value, 500, state.vibeChips);
                                                            setBet(String(newBet));
                                                            setError(null);
                                                        }}
                                                        disabled={wouldExceed}
                                                        className={`casino-chip casino-chip-lg ${chip.color} transition-transform ${
                                                            wouldExceed ? 'opacity-30 cursor-not-allowed' : 'hover:scale-110 active:scale-95 cursor-pointer'
                                                        }`}
                                                        style={{ width: '42px', height: '42px', fontSize: '11px' }}
                                                    >
                                                        {chip.value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Clear / Max row */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => { setBet(''); setError(null); }}
                                            disabled={parsedBet <= 0}
                                            className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Clear
                                        </button>
                                        <button
                                            onClick={() => setBet(String(Math.min(state.vibeChips, 500)))}
                                            className="flex-1 rounded-lg border border-purple-500/20 bg-purple-500/5 py-1.5 text-xs font-bold text-purple-400 hover:bg-purple-500/10 transition-all"
                                        >
                                            Max ({Math.min(state.vibeChips, 500)})
                                        </button>
                                    </div>

                                    {error && (
                                        <p className="text-xs text-red-400 text-center">{error}</p>
                                    )}

                                    <Button
                                        variant="gold"
                                        size="lg"
                                        onClick={handleDeal}
                                        disabled={!validBet || parsedBet > state.vibeChips}
                                        className="w-full"
                                    >
                                        Deal Cards
                                    </Button>
                                </div>
                            )}

                            {/* Phase: Guessing — show ONE face-down mystery card */}
                            {phase === 'guessing' && (
                                <div className="space-y-5">
                                    <div className="casino-felt py-8 flex flex-col items-center gap-4">
                                        <p className="text-emerald-200/60 text-xs font-medium uppercase tracking-widest">Your card</p>
                                        <CardFace value={null} faceDown size="lg" />
                                        <p className="text-white/80 text-sm font-semibold mt-1">
                                            Will the next card be higher or lower?
                                        </p>
                                    </div>

                                    <div className="flex gap-3">
                                        <Button
                                            variant="gold"
                                            size="lg"
                                            onClick={() => handleGuess('higher')}
                                            disabled={isSubmitting}
                                            className="flex-1"
                                        >
                                            <ArrowUp className="h-4 w-4 mr-1.5" />
                                            Higher
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="lg"
                                            onClick={() => handleGuess('lower')}
                                            disabled={isSubmitting}
                                            className="flex-1 border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20"
                                        >
                                            <ArrowDown className="h-4 w-4 mr-1.5" />
                                            Lower
                                        </Button>
                                    </div>

                                    <p className="text-[10px] text-gray-600 text-center">
                                        Bet: {parsedBet} chips &middot; If equal, bet is refunded
                                    </p>
                                </div>
                            )}

                            {/* Phase: Revealing — first card flips up, then second appears */}
                            {phase === 'revealing' && result && (
                                <div className="space-y-5">
                                    <div className="casino-felt py-6 px-4">
                                        <div className="flex justify-center items-center gap-6">
                                            {/* First card — flips face-up immediately */}
                                            <div className="text-center">
                                                <p className="text-[10px] text-emerald-200/50 uppercase tracking-wider mb-1.5">Your card</p>
                                                <CardFace
                                                    value={result.card ?? null}
                                                    faceDown={!showFirstCard}
                                                    size="md"
                                                />
                                            </div>

                                            {/* VS divider */}
                                            <span className="text-gray-600 text-xs font-bold mt-4">VS</span>

                                            {/* Second card — appears and flips after delay */}
                                            <div className="text-center">
                                                <p className="text-[10px] text-emerald-200/50 uppercase tracking-wider mb-1.5">Drawn</p>
                                                <CardFace
                                                    value={result.drawnCard ?? null}
                                                    faceDown={!showSecondCard}
                                                    size="md"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="text-center">
                                        <p className="text-sm text-purple-400 font-mono animate-pulse">
                                            Revealing...
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Phase: Result */}
                            {phase === 'result' && result && (
                                <div className="space-y-5">
                                    <div className="casino-felt py-6 px-4">
                                        <div className="flex justify-center items-center gap-6">
                                            <div className="text-center">
                                                <p className="text-[10px] text-emerald-200/50 uppercase tracking-wider mb-1.5">Your card</p>
                                                <CardFace value={result.card ?? null} size="md" />
                                                <p className="text-xs text-gray-400 mt-2 font-medium">
                                                    {result.card ? RANK_LABELS[result.card] : ''}
                                                </p>
                                            </div>
                                            <span className="text-gray-600 text-xs font-bold mt-4">VS</span>
                                            <div className="text-center">
                                                <p className="text-[10px] text-emerald-200/50 uppercase tracking-wider mb-1.5">Drawn</p>
                                                <CardFace value={result.drawnCard ?? null} size="md" />
                                                <p className="text-xs text-gray-400 mt-2 font-medium">
                                                    {result.drawnCard ? RANK_LABELS[result.drawnCard] : ''}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {result.card && (
                                        <div className="flex justify-center gap-4 text-[10px] text-gray-600">
                                            {(() => {
                                                const odds = getOddsPreview(result.card);
                                                return (
                                                    <>
                                                        <span>Higher: {odds.higherCount}/12 cards ({odds.higherMult.toFixed(1)}x)</span>
                                                        <span>Lower: {odds.lowerCount}/12 cards ({odds.lowerMult.toFixed(1)}x)</span>
                                                    </>
                                                );
                                            })()}
                                        </div>
                                    )}

                                    {/* Result banner */}
                                    <div className={`text-center p-4 rounded-xl border result-reveal ${
                                        result.outcome === 'win'
                                            ? 'border-green-500/30 bg-green-500/10 win-pulse'
                                            : result.outcome === 'push'
                                                ? 'border-yellow-500/30 bg-yellow-500/10'
                                                : 'border-red-500/30 bg-red-500/10'
                                    }`}>
                                        <div className="flex items-center justify-center gap-2 mb-1">
                                            {result.outcome === 'win' && <ArrowUp className="h-5 w-5 text-green-400" />}
                                            {result.outcome === 'lose' && <ArrowDown className="h-5 w-5 text-red-400" />}
                                            {result.outcome === 'push' && <Equal className="h-5 w-5 text-yellow-400" />}
                                            <p className={`text-xl font-black ${
                                                result.outcome === 'win' ? 'gold-shimmer-text' :
                                                result.outcome === 'push' ? 'text-yellow-300' :
                                                'text-red-300'
                                            }`}>
                                                {result.outcome === 'win' ? 'You Won!' :
                                                 result.outcome === 'push' ? 'Push!' :
                                                 'You Lost'}
                                            </p>
                                        </div>

                                        {result.outcome === 'win' && (
                                            <div className="space-y-0.5 text-sm">
                                                <p className="text-green-300">
                                                    Payout: +{result.payout} chips ({result.multiplier}x)
                                                </p>
                                                <p className="text-green-400 font-bold">
                                                    Net: +{result.net} chips
                                                </p>
                                            </div>
                                        )}
                                        {result.outcome === 'push' && (
                                            <p className="text-sm text-yellow-300">
                                                Cards matched — bet refunded
                                            </p>
                                        )}
                                        {result.outcome === 'lose' && (
                                            <p className="text-sm text-red-300">
                                                Lost {result.bet} chips
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        <Button
                                            variant="gold"
                                            size="md"
                                            onClick={handlePlayAgain}
                                            disabled={state.vibeChips < 1}
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
                            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-purple-500/10 pt-3">
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
