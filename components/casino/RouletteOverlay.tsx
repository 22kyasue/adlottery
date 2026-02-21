'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { RouletteWheel } from './RouletteWheel';
import { useGame } from '@/lib/GameContext';
import { playWinChime, playLoseThud } from '@/lib/audio';
import type { RouletteResult } from '@/lib/GameContext';

interface RouletteOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

type Phase = 'betting' | 'spinning' | 'result';
type ColorChoice = 'black' | 'red' | 'gold';

const COLOR_CONFIG: Record<ColorChoice, { label: string; mult: string; multNum: number; bg: string; border: string; text: string; glow: string; dot: string }> = {
    black:  { label: 'Black',  mult: '2x',  multNum: 2,  bg: 'bg-gray-800',     border: 'border-gray-400',    text: 'text-gray-200',  glow: 'shadow-gray-500/30', dot: 'bg-gray-800 border-gray-500' },
    red:    { label: 'Red',    mult: '3x',  multNum: 3,  bg: 'bg-red-800',      border: 'border-red-400',     text: 'text-red-200',   glow: 'shadow-red-500/30',  dot: 'bg-red-600 border-red-400' },
    gold:   { label: 'Gold',   mult: '10x', multNum: 10, bg: 'bg-yellow-700',   border: 'border-yellow-400',  text: 'text-yellow-200', glow: 'shadow-yellow-500/30', dot: 'bg-yellow-500 border-yellow-300' },
};

const ALL_COLORS: ColorChoice[] = ['black', 'red', 'gold'];

export function RouletteOverlay({ isOpen, onClose }: RouletteOverlayProps) {
    const { state, playRoulette } = useGame();
    const [phase, setPhase] = useState<Phase>('betting');
    const [colorBets, setColorBets] = useState<Record<ColorChoice, number>>({ black: 0, red: 0, gold: 0 });
    const [activeColor, setActiveColor] = useState<ColorChoice | null>(null);
    const [result, setResult] = useState<RouletteResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [spinResultColor, setSpinResultColor] = useState<string | null>(null);
    const cancelledRef = useRef(false);

    useEffect(() => {
        if (isOpen) {
            cancelledRef.current = false;
            setPhase('betting');
            setColorBets({ black: 0, red: 0, gold: 0 });
            setActiveColor(null);
            setResult(null);
            setError(null);
            setIsSubmitting(false);
            setSpinResultColor(null);
        } else {
            cancelledRef.current = true;
        }
        return () => { cancelledRef.current = true; };
    }, [isOpen]);

    const totalBet = useMemo(() => colorBets.black + colorBets.red + colorBets.gold, [colorBets]);
    const betsArray = useMemo(() =>
        ALL_COLORS.filter(c => colorBets[c] > 0).map(c => ({ color: c, bet: colorBets[c] })),
        [colorBets]
    );
    const hasBets = betsArray.length > 0;
    const canClose = phase === 'betting' || phase === 'result';

    // Budget for the active color: how much more can be added
    const activeBudget = useMemo(() => {
        if (!activeColor) return 0;
        const otherBets = totalBet - colorBets[activeColor];
        return Math.min(500, state.vibeChips - otherBets) - colorBets[activeColor];
    }, [activeColor, colorBets, totalBet, state.vibeChips]);

    const activeMax = useMemo(() => {
        if (!activeColor) return 0;
        const otherBets = totalBet - colorBets[activeColor];
        return Math.min(500, state.vibeChips - otherBets);
    }, [activeColor, colorBets, totalBet, state.vibeChips]);

    const handleBackdropClick = useCallback(() => {
        if (canClose) onClose();
    }, [canClose, onClose]);

    const addToActive = useCallback((amount: number) => {
        if (!activeColor) return;
        setColorBets(prev => {
            const otherBets = totalBet - prev[activeColor];
            const maxForColor = Math.min(500, state.vibeChips - otherBets);
            const newBet = Math.min(prev[activeColor] + amount, maxForColor);
            return { ...prev, [activeColor]: newBet };
        });
        setError(null);
    }, [activeColor, totalBet, state.vibeChips]);

    const handleSpin = async () => {
        if (!hasBets || isSubmitting) return;
        if (totalBet > state.vibeChips) {
            setError('Not enough chips.');
            return;
        }
        setError(null);
        setIsSubmitting(true);

        const rouletteResult = await playRoulette(betsArray);

        if (cancelledRef.current) return;

        if (!rouletteResult.success) {
            setError(rouletteResult.error ?? 'Something went wrong');
            setIsSubmitting(false);
            return;
        }

        setResult(rouletteResult);
        setSpinResultColor(rouletteResult.resultColor ?? null);
        setPhase('spinning');
    };

    const handleSpinComplete = () => {
        if (cancelledRef.current) return;
        setPhase('result');
        setIsSubmitting(false);
        if (result?.anyWon) {
            playWinChime();
        } else {
            playLoseThud();
        }
    };

    const handlePlayAgain = () => {
        setPhase('betting');
        setColorBets({ black: 0, red: 0, gold: 0 });
        setActiveColor(null);
        setResult(null);
        setError(null);
        setSpinResultColor(null);
    };

    const showFelt = phase === 'spinning' || phase === 'result';

    const resultColorText = (color: string) => {
        switch (color) {
            case 'black': return 'text-gray-300';
            case 'red': return 'text-red-400';
            case 'gold': return 'text-yellow-300';
            case 'green': return 'text-green-400';
            default: return 'text-white';
        }
    };

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
                        className="w-full max-w-md casino-modal-base casino-modal-gold-bar casino-modal-rose max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-red-500/10 bg-gradient-to-r from-red-500/5 to-transparent">
                            <h2 className="text-lg font-bold bg-gradient-to-r from-red-300 to-yellow-400 bg-clip-text text-transparent">Cyber Roulette</h2>
                            <button
                                onClick={onClose}
                                disabled={!canClose}
                                className={`transition-colors ${canClose ? 'text-gray-500 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Phase: Betting */}
                            {phase === 'betting' && (
                                <div className="space-y-4">
                                    {/* Color buttons on felt */}
                                    <div className="casino-felt p-4">
                                        <p className="text-[10px] text-emerald-200/50 uppercase tracking-widest font-bold mb-3 text-center">Place your bets</p>
                                        <div className="grid grid-cols-3 gap-2">
                                            {ALL_COLORS.map(color => {
                                                const cfg = COLOR_CONFIG[color];
                                                const isActive = activeColor === color;
                                                const hasBet = colorBets[color] > 0;
                                                return (
                                                    <button
                                                        key={color}
                                                        onClick={() => { setActiveColor(color); setError(null); }}
                                                        className={`rounded-xl border-2 p-3 text-center transition-all ${
                                                            isActive
                                                                ? `${cfg.border} ${cfg.bg} ring-2 ring-offset-1 ring-offset-black ring-white/20 scale-105 ${cfg.glow} shadow-lg`
                                                                : hasBet
                                                                    ? `${cfg.border} ${cfg.bg} opacity-70`
                                                                    : 'border-white/10 bg-black/30 hover:border-white/20'
                                                        }`}
                                                    >
                                                        {/* Color swatch dot */}
                                                        <span className={`block mx-auto w-5 h-5 rounded-full mb-1.5 border ${cfg.dot}`} />
                                                        <span className={`block text-sm font-bold ${isActive || hasBet ? cfg.text : 'text-gray-300'}`}>
                                                            {cfg.label}
                                                        </span>
                                                        <span className={`block text-xs mt-0.5 font-bold ${isActive || hasBet ? cfg.text : 'text-gray-500'}`}>
                                                            {cfg.mult}
                                                        </span>
                                                        {/* Bet amount badge */}
                                                        {hasBet && (
                                                            <span className="block mt-1.5 text-xs font-mono font-black text-white bg-white/10 rounded-full px-2 py-0.5">
                                                                {colorBets[color]}
                                                            </span>
                                                        )}
                                                    </button>
                                                );
                                            })}
                                        </div>

                                        {/* Total bet display */}
                                        <div className="mt-4 flex flex-col items-center gap-1">
                                            <div className={`betting-circle ${totalBet > 0 ? 'betting-circle-active' : ''}`} style={{ width: '80px', height: '80px' }}>
                                                {totalBet > 0 ? (
                                                    <div className="flex flex-col items-center">
                                                        <div className="casino-chip casino-chip-md casino-chip-rose chip-bounce">C</div>
                                                    </div>
                                                ) : (
                                                    <p className="text-yellow-600/50 text-[9px] uppercase tracking-wider font-bold text-center px-1">Total</p>
                                                )}
                                            </div>
                                            <p className="text-xl font-black tabular-nums text-white">{totalBet}</p>
                                            <p className="text-emerald-200/40 text-[9px] uppercase tracking-widest font-bold">total chips</p>
                                        </div>
                                    </div>

                                    {/* Active color indicator */}
                                    {activeColor && (
                                        <p className="text-center text-xs text-gray-400">
                                            Adding chips to: <span className={`font-bold capitalize ${COLOR_CONFIG[activeColor].text}`}>{COLOR_CONFIG[activeColor].label}</span>
                                        </p>
                                    )}

                                    {/* Chip rack */}
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 text-center">
                                            {activeColor ? 'Tap chips to add' : 'Select a color first'}
                                        </p>
                                        <div className="chip-rack">
                                            {[
                                                { value: 5, color: 'casino-chip-rose' },
                                                { value: 10, color: 'casino-chip-rose' },
                                                { value: 25, color: 'casino-chip-gold' },
                                                { value: 50, color: 'casino-chip-gold' },
                                                { value: 100, color: 'casino-chip-yellow' },
                                            ].map(chip => {
                                                const disabled = !activeColor || chip.value > activeBudget;
                                                return (
                                                    <button
                                                        key={chip.value}
                                                        onClick={() => addToActive(chip.value)}
                                                        disabled={disabled}
                                                        className={`casino-chip casino-chip-lg ${chip.color} chip-rack-btn ${disabled ? 'opacity-30 !cursor-not-allowed' : ''}`}
                                                        style={{ width: '42px', height: '42px', fontSize: '11px' }}
                                                    >
                                                        {chip.value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Clear / Max controls */}
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => {
                                                if (activeColor) {
                                                    setColorBets(prev => ({ ...prev, [activeColor]: 0 }));
                                                    setError(null);
                                                }
                                            }}
                                            disabled={!activeColor || colorBets[activeColor!] <= 0}
                                            className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            {activeColor ? `Clear ${COLOR_CONFIG[activeColor].label}` : 'Clear'}
                                        </button>
                                        <button
                                            onClick={() => setColorBets({ black: 0, red: 0, gold: 0 })}
                                            disabled={totalBet <= 0}
                                            className="flex-1 rounded-lg border border-white/10 bg-white/5 py-1.5 text-xs font-bold text-gray-400 hover:bg-white/10 hover:text-white transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Clear All
                                        </button>
                                        <button
                                            onClick={() => {
                                                if (activeColor) {
                                                    setColorBets(prev => ({ ...prev, [activeColor]: activeMax }));
                                                    setError(null);
                                                }
                                            }}
                                            disabled={!activeColor || activeMax <= 0}
                                            className="flex-1 rounded-lg border border-red-500/20 bg-red-500/5 py-1.5 text-xs font-bold text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
                                        >
                                            Max{activeColor ? ` (${activeMax})` : ''}
                                        </button>
                                    </div>

                                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}

                                    <Button
                                        variant="gold"
                                        size="lg"
                                        onClick={handleSpin}
                                        disabled={!hasBets || totalBet > state.vibeChips || isSubmitting}
                                        isLoading={isSubmitting}
                                        className="w-full"
                                    >
                                        {hasBets ? `Spin! (${totalBet} chips)` : 'Place a bet to spin'}
                                    </Button>
                                </div>
                            )}

                            {/* Phase: Spinning */}
                            {phase === 'spinning' && (
                                <div className="space-y-4">
                                    <div className={showFelt ? 'casino-felt p-4' : ''}>
                                        <RouletteWheel
                                            resultColor={spinResultColor}
                                            spinning={true}
                                            onSpinComplete={handleSpinComplete}
                                        />
                                    </div>
                                    <p className="text-center text-sm text-red-400 font-mono animate-pulse">
                                        Spinning...
                                    </p>
                                </div>
                            )}

                            {/* Phase: Result */}
                            {phase === 'result' && result && (
                                <div className="space-y-5">
                                    <div className={showFelt ? 'casino-felt p-4' : ''}>
                                        <RouletteWheel
                                            resultColor={spinResultColor}
                                            spinning={false}
                                            onSpinComplete={() => {}}
                                        />
                                    </div>

                                    {/* Landed on */}
                                    <p className="text-center text-sm text-gray-400">
                                        Landed on: <span className={`font-bold capitalize ${resultColorText(result.resultColor ?? '')}`}>
                                            {result.resultColor}
                                        </span>
                                        {result.resultColor === 'green' && ' (House)'}
                                    </p>

                                    {/* Per-bet outcome cards */}
                                    <div className="space-y-2">
                                        {result.bets?.map((b) => {
                                            const cfg = COLOR_CONFIG[b.color as ColorChoice];
                                            return (
                                                <div
                                                    key={b.color}
                                                    className={`flex items-center justify-between p-3 rounded-xl border ${
                                                        b.won
                                                            ? 'border-green-500/30 bg-green-500/10'
                                                            : 'border-white/10 bg-white/5'
                                                    }`}
                                                >
                                                    <div className="flex items-center gap-2">
                                                        <span className={`w-3 h-3 rounded-full border ${cfg?.dot}`} />
                                                        <span className={`text-sm font-bold ${cfg?.text ?? 'text-white'}`}>{cfg?.label}</span>
                                                        <span className="text-xs text-gray-500">({cfg?.mult})</span>
                                                    </div>
                                                    <div className="text-right">
                                                        <span className="text-xs text-gray-500 mr-2">Bet: {b.bet}</span>
                                                        {b.won ? (
                                                            <span className="text-sm font-bold text-green-300">+{b.payout}</span>
                                                        ) : (
                                                            <span className="text-sm font-bold text-red-400">-{b.bet}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>

                                    {/* Net summary banner */}
                                    <div className={`text-center p-4 rounded-xl border result-reveal ${
                                        result.anyWon
                                            ? 'border-green-500/30 bg-green-500/10 win-pulse'
                                            : 'border-red-500/30 bg-red-500/10'
                                    }`}>
                                        <p className={`text-xl font-black ${result.anyWon ? 'gold-shimmer-text' : 'text-red-300'}`}>
                                            {result.anyWon ? 'Winner!' : 'No Luck'}
                                        </p>
                                        <p className={`text-sm mt-1 ${(result.net ?? 0) >= 0 ? 'text-green-300' : 'text-red-300'}`}>
                                            Net: {(result.net ?? 0) >= 0 ? '+' : ''}{result.net} chips
                                        </p>
                                    </div>

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
                            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-red-500/10 pt-3">
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
