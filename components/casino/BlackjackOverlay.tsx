'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { CardFace } from './CardFace';
import { useGame } from '@/lib/GameContext';
import { playWinChime, playLoseThud, playCardFlip } from '@/lib/audio';

interface BlackjackOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

type Phase = 'loading' | 'betting' | 'dealing' | 'player_turn' | 'dealer_turn' | 'result' | 'resume_prompt';

interface CardData {
    rank: number;
    suit: number;
}

interface GameStateData {
    playerHand: CardData[];
    dealerHand?: CardData[];
    dealerVisible?: CardData[];
    playerValue: number;
    dealerValue?: number;
    status: string;
    result?: string;
    payout?: number;
    newChips?: number;
    bet?: number;
    sessionId?: string;
}

export function BlackjackOverlay({ isOpen, onClose }: BlackjackOverlayProps) {
    const { state, refreshGameState } = useGame();
    const [phase, setPhase] = useState<Phase>('loading');
    const [bet, setBet] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [playerCards, setPlayerCards] = useState<CardData[]>([]);
    const [dealerCards, setDealerCards] = useState<CardData[]>([]);
    const [dealerHoleRevealed, setDealerHoleRevealed] = useState(false);
    const [playerValue, setPlayerValue] = useState(0);
    const [dealerValue, setDealerValue] = useState<number | null>(null);
    const [gameResult, setGameResult] = useState<string | null>(null);
    const [gamePayout, setGamePayout] = useState(0);
    const [activeBet, setActiveBet] = useState(0);
    const [revealedCount, setRevealedCount] = useState(0);

    const cancelledRef = useRef(false);
    const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

    const clearTimers = () => {
        timersRef.current.forEach(clearTimeout);
        timersRef.current = [];
    };

    const addTimer = (fn: () => void, ms: number) => {
        timersRef.current.push(setTimeout(() => {
            if (!cancelledRef.current) fn();
        }, ms));
    };

    useEffect(() => {
        if (isOpen) {
            cancelledRef.current = false;
            checkActiveSession();
        } else {
            cancelledRef.current = true;
            clearTimers();
        }
        return () => {
            cancelledRef.current = true;
            clearTimers();
        };
    }, [isOpen]); // eslint-disable-line react-hooks/exhaustive-deps

    const checkActiveSession = async () => {
        setPhase('loading');
        try {
            const res = await fetch('/api/casino/blackjack/state');
            const data = await res.json();
            if (cancelledRef.current) return;

            if (data.active) {
                setPlayerCards(data.playerHand ?? []);
                setDealerCards(data.dealerVisible ?? []);
                setPlayerValue(data.playerValue ?? 0);
                setActiveBet(data.bet ?? 0);
                setDealerHoleRevealed(false);
                setRevealedCount(99);
                setPhase('resume_prompt');
            } else {
                resetToBeginning();
            }
        } catch {
            resetToBeginning();
        }
    };

    const resetToBeginning = () => {
        setPhase('betting');
        setBet('');
        setError(null);
        setIsSubmitting(false);
        setPlayerCards([]);
        setDealerCards([]);
        setDealerHoleRevealed(false);
        setPlayerValue(0);
        setDealerValue(null);
        setGameResult(null);
        setGamePayout(0);
        setActiveBet(0);
        setRevealedCount(0);
    };

    const parsedBet = Math.floor(Number(bet));
    const validBet = Number.isFinite(parsedBet) && parsedBet > 0 && parsedBet <= 500;
    const canClose = phase === 'betting' || phase === 'result' || phase === 'resume_prompt';

    const handleBackdropClick = useCallback(() => {
        if (canClose) onClose();
    }, [canClose, onClose]);

    const handleDeal = async () => {
        if (!validBet || isSubmitting) return;
        if (parsedBet > state.vibeChips) {
            setError('Not enough chips.');
            return;
        }
        setError(null);
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/casino/blackjack/deal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ bet: parsedBet }),
            });
            const data = await res.json() as GameStateData & { error?: string };
            if (cancelledRef.current) return;

            if (!res.ok || data.error) {
                setError(data.error ?? 'Deal failed');
                setIsSubmitting(false);
                return;
            }

            setActiveBet(parsedBet);
            await refreshGameState();

            if (data.status === 'complete') {
                animateDealThenResult(data, true);
            } else {
                animateDealThenPlay(data);
            }
        } catch {
            if (!cancelledRef.current) {
                setError('Network error');
                setIsSubmitting(false);
            }
        }
    };

    const animateDealThenPlay = (data: GameStateData) => {
        setPhase('dealing');
        setPlayerCards(data.playerHand);
        setDealerCards(data.dealerVisible ?? []);
        setDealerHoleRevealed(false);
        setRevealedCount(0);

        // Slower deal: 650ms per card for anticipation
        const totalVisible = (data.playerHand?.length ?? 0) + (data.dealerVisible?.length ?? 0);
        for (let i = 0; i < totalVisible + 1; i++) {
            addTimer(() => {
                setRevealedCount(i + 1);
                playCardFlip();
            }, i * 650);
        }

        addTimer(() => {
            setPlayerValue(data.playerValue);
            setPhase('player_turn');
            setIsSubmitting(false);
        }, (totalVisible + 1) * 650 + 400);
    };

    const animateDealThenResult = (data: GameStateData, showAllDealer: boolean) => {
        setPhase('dealing');
        setPlayerCards(data.playerHand);
        if (showAllDealer && data.dealerHand) {
            setDealerCards(data.dealerHand);
        } else {
            setDealerCards(data.dealerVisible ?? data.dealerHand ?? []);
        }
        setRevealedCount(0);

        const pCards = data.playerHand?.length ?? 0;
        const dCards = showAllDealer ? (data.dealerHand?.length ?? 0) : (data.dealerVisible?.length ?? 0);
        const total = pCards + dCards;

        // Slower deal for naturals: 650ms per card
        for (let i = 0; i < total; i++) {
            addTimer(() => {
                setRevealedCount(i + 1);
                playCardFlip();
            }, i * 650);
        }

        // Dramatic pause (1.2s) after all cards before showing result
        addTimer(() => {
            setDealerHoleRevealed(true);
            setPlayerValue(data.playerValue);
            setDealerValue(data.dealerValue ?? null);
        }, total * 650 + 600);

        addTimer(() => {
            setGameResult(data.result ?? null);
            setGamePayout(data.payout ?? 0);
            setPhase('result');
            setIsSubmitting(false);
            playResultSound(data.result ?? 'lose');
            refreshGameState();
        }, total * 650 + 1400);
    };

    const handleHit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setError(null);

        try {
            const res = await fetch('/api/casino/blackjack/hit', { method: 'POST' });
            const data = await res.json() as GameStateData & { error?: string };
            if (cancelledRef.current) return;

            if (!res.ok || data.error) {
                setError(data.error ?? 'Hit failed');
                setIsSubmitting(false);
                return;
            }

            setPlayerCards(data.playerHand);
            setRevealedCount(prev => prev);
            addTimer(() => {
                setRevealedCount(99);
                playCardFlip();
            }, 150);

            setPlayerValue(data.playerValue);

            if (data.status === 'complete') {
                // Bust or 21 — pause to let it sink in, then reveal dealer
                addTimer(() => {
                    if (data.dealerHand) {
                        setDealerCards(data.dealerHand);
                        setDealerHoleRevealed(true);
                    }
                    setDealerValue(data.dealerValue ?? null);
                }, 800);

                // Dramatic pause before result banner
                addTimer(() => {
                    setGameResult(data.result ?? null);
                    setGamePayout(data.payout ?? 0);
                    setPhase('result');
                    setIsSubmitting(false);
                    playResultSound(data.result ?? 'lose');
                    refreshGameState();
                }, 1600);
            } else {
                setIsSubmitting(false);
            }
        } catch {
            if (!cancelledRef.current) {
                setError('Network error');
                setIsSubmitting(false);
            }
        }
    };

    const handleStand = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        setError(null);
        setPhase('dealer_turn');

        try {
            const res = await fetch('/api/casino/blackjack/stand', { method: 'POST' });
            const data = await res.json() as GameStateData & { error?: string };
            if (cancelledRef.current) return;

            if (!res.ok || data.error) {
                setError(data.error ?? 'Stand failed');
                setPhase('player_turn');
                setIsSubmitting(false);
                return;
            }

            const fullDealer = data.dealerHand ?? [];

            // Step 1: Reveal hole card with a dramatic flip (800ms pause)
            addTimer(() => {
                setDealerHoleRevealed(true);
                setDealerCards(fullDealer.slice(0, 2));
                playCardFlip();
            }, 600);

            // Step 2: Dealer draws additional cards slowly (750ms each)
            const extraCards = fullDealer.length - 2;
            for (let i = 0; i < extraCards; i++) {
                addTimer(() => {
                    setDealerCards(fullDealer.slice(0, 3 + i));
                    playCardFlip();
                }, 1400 + i * 750);
            }

            // Step 3: Show dealer value — let it sink in
            const allCardsTime = 1400 + Math.max(0, extraCards) * 750 + 500;
            addTimer(() => {
                setPlayerValue(data.playerValue);
                setDealerValue(data.dealerValue ?? null);
            }, allCardsTime);

            // Step 4: Dramatic pause, then result
            addTimer(() => {
                setGameResult(data.result ?? null);
                setGamePayout(data.payout ?? 0);
                setPhase('result');
                setIsSubmitting(false);
                playResultSound(data.result ?? 'lose');
                refreshGameState();
            }, allCardsTime + 1000);
        } catch {
            if (!cancelledRef.current) {
                setError('Network error');
                setPhase('player_turn');
                setIsSubmitting(false);
            }
        }
    };

    const handleResume = () => {
        setPhase('player_turn');
    };

    const handleForfeit = async () => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        try {
            const res = await fetch('/api/casino/blackjack/forfeit', { method: 'POST' });
            const data = await res.json();
            if (cancelledRef.current) return;

            setGameResult('forfeit');
            setGamePayout(0);
            setActiveBet(data.bet ?? activeBet);
            setPhase('result');
            setIsSubmitting(false);
            playLoseThud();
            refreshGameState();
        } catch {
            if (!cancelledRef.current) {
                setError('Network error');
                setIsSubmitting(false);
            }
        }
    };

    const handlePlayAgain = () => {
        clearTimers();
        resetToBeginning();
    };

    const playResultSound = (result: string) => {
        if (result === 'win' || result === 'blackjack') {
            playWinChime();
        } else if (result === 'push') {
            // no sound for push
        } else {
            playLoseThud();
        }
    };

    const showFelt = phase === 'dealing' || phase === 'player_turn' || phase === 'dealer_turn' || phase === 'result';

    const renderHand = (cards: CardData[], label: string, value: number | null, isDealer: boolean) => {
        return (
            <div className="text-center">
                <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">{label}</p>
                <div className="flex justify-center gap-2 flex-wrap">
                    {cards.map((card, i) => {
                        const cardIndex = isDealer ? (playerCards.length + i) : i;
                        const isRevealed = revealedCount > cardIndex || phase === 'player_turn' || phase === 'dealer_turn' || phase === 'result' || phase === 'resume_prompt';
                        const isFaceDown = isDealer && i === 1 && !dealerHoleRevealed && phase !== 'result';
                        return (
                            <motion.div
                                key={`${label}-${i}`}
                                initial={{ opacity: 0, y: -20 }}
                                animate={{ opacity: isRevealed ? 1 : 0, y: isRevealed ? 0 : -20 }}
                                transition={{ duration: 0.3 }}
                            >
                                <CardFace
                                    value={isFaceDown ? null : card.rank}
                                    suit={isFaceDown ? undefined : card.suit}
                                    faceDown={isFaceDown}
                                    size="sm"
                                />
                            </motion.div>
                        );
                    })}
                </div>
                {value !== null && value !== undefined && (
                    <p className="text-sm font-bold text-white mt-2">{value}</p>
                )}
            </div>
        );
    };

    const resultLabel = gameResult === 'blackjack' ? 'Blackjack!' :
        gameResult === 'win' ? 'You Won!' :
        gameResult === 'push' ? 'Push!' :
        gameResult === 'forfeit' ? 'Forfeited' :
        'You Lost';

    const resultColor = (gameResult === 'win' || gameResult === 'blackjack') ? 'green' :
        gameResult === 'push' ? 'yellow' : 'red';

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
                        className="w-full max-w-md casino-modal-base casino-modal-gold-bar casino-modal-emerald"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-4 border-b border-emerald-500/10 bg-gradient-to-r from-emerald-500/5 to-transparent">
                            <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-300 to-green-400 bg-clip-text text-transparent">Cyber Blackjack</h2>
                            <button
                                onClick={onClose}
                                disabled={!canClose}
                                className={`transition-colors ${canClose ? 'text-gray-500 hover:text-white' : 'text-gray-700 cursor-not-allowed'}`}
                            >
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        <div className="p-6 space-y-5">
                            {/* Loading */}
                            {phase === 'loading' && (
                                <div className="flex items-center justify-center py-8">
                                    <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-400 border-t-transparent" />
                                </div>
                            )}

                            {/* Resume Prompt */}
                            {phase === 'resume_prompt' && (
                                <div className="space-y-4">
                                    <div className="text-center p-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10">
                                        <p className="text-sm font-bold text-emerald-300">Active Game Found</p>
                                        <p className="text-xs text-gray-400 mt-1 flex items-center justify-center gap-1.5">
                                            Bet:
                                            <span className="casino-chip casino-chip-sm casino-chip-purple" style={{ width: '14px', height: '14px', fontSize: '7px' }}>C</span>
                                            {activeBet} chips
                                        </p>
                                    </div>

                                    {renderHand(playerCards, 'Your Hand', playerValue, false)}
                                    {dealerCards.length > 0 && renderHand(dealerCards, 'Dealer', null, true)}

                                    <div className="flex gap-3">
                                        <Button
                                            variant="gold"
                                            size="md"
                                            onClick={handleResume}
                                            className="flex-1"
                                        >
                                            Resume
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="md"
                                            onClick={handleForfeit}
                                            disabled={isSubmitting}
                                            className="flex-1 border border-red-500/20 bg-red-500/5 text-red-300 hover:bg-red-500/10"
                                        >
                                            Forfeit
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {/* Betting — interactive chip table */}
                            {phase === 'betting' && (
                                <div className="space-y-4">
                                    {/* Felt with betting circle */}
                                    <div className="casino-felt py-5 flex flex-col items-center gap-3">
                                        <div className={`betting-circle ${parsedBet > 0 ? 'betting-circle-active' : ''}`}>
                                            {parsedBet > 0 ? (
                                                <div className="flex flex-col items-center gap-0">
                                                    {parsedBet >= 100 && (
                                                        <div className="casino-chip casino-chip-md casino-chip-gold chip-bounce" style={{ marginBottom: '-6px', zIndex: 3 }}>$</div>
                                                    )}
                                                    {parsedBet >= 25 && (
                                                        <div className="casino-chip casino-chip-md casino-chip-emerald chip-bounce" style={{ marginBottom: '-6px', zIndex: 2, animationDelay: '0.05s' }}>C</div>
                                                    )}
                                                    <div className="casino-chip casino-chip-md casino-chip-emerald chip-bounce" style={{ zIndex: 1, animationDelay: '0.1s' }}>C</div>
                                                </div>
                                            ) : (
                                                <p className="text-yellow-600/50 text-[10px] uppercase tracking-wider font-bold text-center px-2">Place bet</p>
                                            )}
                                        </div>
                                        <div className="text-center">
                                            <p className="text-2xl font-black tabular-nums text-white">{parsedBet > 0 ? parsedBet : 0}</p>
                                            <p className="text-emerald-200/50 text-[10px] uppercase tracking-widest font-bold">chips wagered</p>
                                        </div>
                                    </div>

                                    {/* Chip rack */}
                                    <div>
                                        <p className="text-[10px] text-gray-500 uppercase tracking-widest font-bold mb-2 text-center">Tap chips to bet</p>
                                        <div className="chip-rack">
                                            {[
                                                { value: 5, color: 'casino-chip-emerald' },
                                                { value: 10, color: 'casino-chip-emerald' },
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
                                                        className={`casino-chip casino-chip-lg ${chip.color} chip-rack-btn ${wouldExceed ? 'opacity-30 !cursor-not-allowed' : ''}`}
                                                        style={{ width: '42px', height: '42px', fontSize: '11px' }}
                                                    >
                                                        {chip.value}
                                                    </button>
                                                );
                                            })}
                                        </div>
                                    </div>

                                    {/* Clear / Max */}
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
                                            className="flex-1 rounded-lg border border-emerald-500/20 bg-emerald-500/5 py-1.5 text-xs font-bold text-emerald-400 hover:bg-emerald-500/10 transition-all"
                                        >
                                            Max ({Math.min(state.vibeChips, 500)})
                                        </button>
                                    </div>

                                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}

                                    <Button
                                        variant="gold"
                                        size="lg"
                                        onClick={handleDeal}
                                        disabled={!validBet || parsedBet > state.vibeChips || isSubmitting}
                                        isLoading={isSubmitting}
                                        className="w-full"
                                    >
                                        Deal
                                    </Button>
                                </div>
                            )}

                            {/* Dealing animation */}
                            {phase === 'dealing' && (
                                <div className="space-y-5">
                                    <div className={showFelt ? 'casino-felt p-4 space-y-4' : 'space-y-4'}>
                                        {renderHand(dealerCards, 'Dealer', null, true)}
                                        {renderHand(playerCards, 'Your Hand', null, false)}
                                    </div>
                                    <p className="text-center text-sm text-emerald-400 font-mono animate-pulse">
                                        Dealing...
                                    </p>
                                </div>
                            )}

                            {/* Player Turn */}
                            {phase === 'player_turn' && (
                                <div className="space-y-5">
                                    <div className={showFelt ? 'casino-felt p-4 space-y-4' : 'space-y-4'}>
                                        {renderHand(dealerCards, 'Dealer', null, true)}
                                        {renderHand(playerCards, 'Your Hand', playerValue, false)}
                                    </div>

                                    {error && <p className="text-xs text-red-400 text-center">{error}</p>}

                                    <div className="flex gap-3">
                                        <Button
                                            variant="gold"
                                            size="lg"
                                            onClick={handleHit}
                                            disabled={isSubmitting}
                                            className="flex-1"
                                        >
                                            Hit
                                        </Button>
                                        <Button
                                            variant="secondary"
                                            size="lg"
                                            onClick={handleStand}
                                            disabled={isSubmitting}
                                            className="flex-1 border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/20"
                                        >
                                            Stand
                                        </Button>
                                    </div>

                                    <p className="text-[10px] text-gray-600 text-center flex items-center justify-center gap-1">
                                        Bet:
                                        <span className="casino-chip casino-chip-sm casino-chip-purple" style={{ width: '12px', height: '12px', fontSize: '6px' }}>C</span>
                                        {activeBet} chips
                                    </p>
                                </div>
                            )}

                            {/* Dealer Turn */}
                            {phase === 'dealer_turn' && (
                                <div className="space-y-5">
                                    <div className={showFelt ? 'casino-felt p-4 space-y-4' : 'space-y-4'}>
                                        {renderHand(dealerCards, 'Dealer', dealerValue, true)}
                                        {renderHand(playerCards, 'Your Hand', playerValue, false)}
                                    </div>
                                    <div className="text-center space-y-1">
                                        <p className="text-sm text-emerald-400 font-mono animate-pulse">
                                            Dealer reveals...
                                        </p>
                                        <p className="text-[10px] text-gray-600">
                                            Dealer must stand on 17
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Result */}
                            {phase === 'result' && (
                                <div className="space-y-5">
                                    <div className={showFelt ? 'casino-felt p-4 space-y-4' : 'space-y-4'}>
                                        {dealerCards.length > 0 && renderHand(dealerCards, 'Dealer', dealerValue, true)}
                                        {playerCards.length > 0 && renderHand(playerCards, 'Your Hand', playerValue, false)}
                                    </div>

                                    <div className={`text-center p-4 rounded-xl border result-reveal ${
                                        resultColor === 'green' ? 'border-green-500/30 bg-green-500/10 win-pulse' :
                                        resultColor === 'yellow' ? 'border-yellow-500/30 bg-yellow-500/10' :
                                        'border-red-500/30 bg-red-500/10'
                                    }`}>
                                        <p className={`text-xl font-black ${
                                            resultColor === 'green' ? 'gold-shimmer-text' :
                                            resultColor === 'yellow' ? 'text-yellow-300' :
                                            'text-red-300'
                                        }`}>
                                            {resultLabel}
                                        </p>

                                        {(gameResult === 'win' || gameResult === 'blackjack') && (
                                            <div className="space-y-0.5 text-sm mt-1">
                                                <p className="text-green-300">
                                                    Payout: +{gamePayout} chips {gameResult === 'blackjack' ? '(2.5x)' : '(2x)'}
                                                </p>
                                                <p className="text-green-400 font-bold">
                                                    Net: +{gamePayout - activeBet} chips
                                                </p>
                                            </div>
                                        )}
                                        {gameResult === 'push' && (
                                            <p className="text-sm text-yellow-300 mt-1">
                                                Bet refunded
                                            </p>
                                        )}
                                        {(gameResult === 'lose' || gameResult === 'forfeit') && (
                                            <p className="text-sm text-red-300 mt-1">
                                                Lost {activeBet} chips
                                            </p>
                                        )}
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
                            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-emerald-500/10 pt-3">
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
