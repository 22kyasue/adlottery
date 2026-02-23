'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
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
}

function fmt7(n: number) { return String(n).padStart(7, '0'); }

// ─── Slot digit ───────────────────────────────────────────────────────────────

function SlotDigit({ finalDigit, startDelay, onDone }: { finalDigit: string; startDelay: number; onDone?: () => void }) {
    const [display, setDisplay] = useState('·');
    const [locked, setLocked] = useState(false);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    useEffect(() => {
        setDisplay('·');
        setLocked(false);

        const startTimer = setTimeout(() => {
            intervalRef.current = setInterval(() => {
                setDisplay(String(Math.floor(Math.random() * 10)));
            }, 60);

            setTimeout(() => {
                if (intervalRef.current) clearInterval(intervalRef.current);
                setDisplay(finalDigit);
                setLocked(true);
                onDone?.();
            }, 1400);
        }, startDelay);

        return () => {
            clearTimeout(startTimer);
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [finalDigit, startDelay]);

    return (
        <motion.div
            className="relative flex h-20 w-14 items-center justify-center rounded-xl border bg-[#111] overflow-hidden"
            animate={locked
                ? { borderColor: 'rgba(234,179,8,0.6)', boxShadow: '0 0 20px rgba(234,179,8,0.2)' }
                : { borderColor: 'rgba(255,255,255,0.08)', boxShadow: 'none' }}
            transition={{ duration: 0.3 }}
        >
            {/* Scanline shimmer when spinning */}
            {!locked && (
                <motion.div
                    className="absolute inset-0 bg-gradient-to-b from-transparent via-yellow-500/5 to-transparent"
                    animate={{ y: ['-100%', '100%'] }}
                    transition={{ repeat: Infinity, duration: 0.4, ease: 'linear' }}
                />
            )}
            <motion.span
                key={display}
                className={`text-4xl font-black font-mono tabular-nums select-none ${locked ? 'text-yellow-400' : 'text-gray-500'}`}
                animate={locked ? { scale: [1.4, 1] } : {}}
                transition={{ duration: 0.25 }}
            >
                {display}
            </motion.span>
            {locked && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="absolute inset-0 rounded-xl ring-1 ring-yellow-400/40 pointer-events-none"
                />
            )}
        </motion.div>
    );
}

// ─── Reveal sequence ──────────────────────────────────────────────────────────

function TicketReveal({ draw, onComplete }: { draw: DrawResult; onComplete: () => void }) {
    const digits = fmt7(draw.winningTicketNumber).split('');
    const [lockedCount, setLockedCount] = useState(0);
    const done = lockedCount === digits.length;

    useEffect(() => {
        if (done) onComplete();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [done]);

    return (
        <div className="flex flex-col items-center gap-8">
            <div className="text-center space-y-1">
                <p className="text-xs text-gray-500 uppercase tracking-widest">Week {draw.weekId} · {draw.totalTickets.toLocaleString()} tickets issued</p>
                <p className="text-sm text-gray-400">Winning number</p>
            </div>

            {/* Digit slots */}
            <div className="flex items-center gap-2">
                {digits.map((d, i) => (
                    <SlotDigit
                        key={i}
                        finalDigit={d}
                        startDelay={i * 380}
                        onDone={() => setLockedCount(c => c + 1)}
                    />
                ))}
            </div>

            {/* Progress dots */}
            <div className="flex gap-1.5">
                {digits.map((_, i) => (
                    <motion.div
                        key={i}
                        className="h-1.5 w-1.5 rounded-full"
                        animate={{ backgroundColor: i < lockedCount ? '#facc15' : '#374151' }}
                        transition={{ duration: 0.2 }}
                    />
                ))}
            </div>

            <AnimatePresence>
                {done && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="text-center space-y-2">
                        <p className="text-2xl font-black text-yellow-300">
                            🎉 ¥{draw.prizeAmount.toLocaleString()} won!
                        </p>
                        <p className="text-sm text-gray-400">
                            {draw.isYou
                                ? 'That\'s YOUR ticket! Check the app to claim your prize.'
                                : `Winner: ${draw.winnerHint ?? 'Anonymous'}`}
                        </p>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

// ─── Countdown ────────────────────────────────────────────────────────────────

function getNextSundayUTC(): Date {
    const now = new Date();
    const day = now.getUTCDay(); // 0=Sun
    const daysUntilSunday = day === 0 ? 7 : 7 - day;
    const next = new Date(now);
    next.setUTCDate(now.getUTCDate() + daysUntilSunday);
    next.setUTCHours(11, 0, 0, 0);
    return next;
}

function Countdown() {
    const [remaining, setRemaining] = useState('');

    useEffect(() => {
        const tick = () => {
            const diff = getNextSundayUTC().getTime() - Date.now();
            if (diff <= 0) { setRemaining('Drawing now…'); return; }
            const d = Math.floor(diff / 86400000);
            const h = Math.floor((diff % 86400000) / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setRemaining(`${d}d ${String(h).padStart(2,'0')}h ${String(m).padStart(2,'0')}m ${String(s).padStart(2,'0')}s`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    return (
        <div className="flex flex-col items-center gap-4">
            <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-full border border-white/10 bg-white/5">
                <span className="text-4xl">🎰</span>
            </div>
            <div className="text-center space-y-1">
                <p className="text-gray-400 text-sm">Next draw in</p>
                <p className="text-3xl font-black font-mono text-white">{remaining}</p>
                <p className="text-xs text-gray-600">Every Sunday at 20:00 JST</p>
            </div>
        </div>
    );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Phase = 'loading' | 'waiting' | 'revealing' | 'done';

export default function LiveDrawPage() {
    const [phase, setPhase] = useState<Phase>('loading');
    const [draw, setDraw] = useState<DrawResult | null>(null);
    const [revealKey, setRevealKey] = useState(0);

    const checkDraw = useCallback(async () => {
        try {
            const res = await fetch('/api/draw/results?limit=1');
            if (!res.ok) return;
            const data = await res.json();
            const latest: DrawResult | undefined = data.results?.[0];

            if (!latest) {
                setPhase('waiting');
                return;
            }

            // Check if this draw is recent (within last 2 hours = show reveal)
            const age = Date.now() - new Date(latest.createdAt).getTime();
            const isNew = age < 2 * 60 * 60 * 1000;

            setDraw(latest);
            if (isNew) {
                setPhase('revealing');
                setRevealKey(k => k + 1);
            } else {
                setPhase('waiting');
            }
        } catch {
            setPhase('waiting');
        }
    }, []);

    useEffect(() => {
        checkDraw();
        // Poll every 15 seconds while waiting
        const id = setInterval(checkDraw, 15000);
        return () => clearInterval(id);
    }, [checkDraw]);

    const handleRevealComplete = () => {
        setPhase('done');
        confetti({ particleCount: 200, spread: 90, origin: { y: 0.5 }, colors: ['#FFD700', '#FFF', '#FF6B6B', '#4CAF50'] });
        setTimeout(() => confetti({ particleCount: 100, spread: 60, origin: { y: 0.4 }, colors: ['#FFD700', '#FFF176'] }), 600);
    };

    return (
        <div className="min-h-screen bg-[#060606] flex flex-col items-center justify-center p-6">
            {/* Header */}
            <div className="text-center mb-12 space-y-1">
                <p className="text-xs text-yellow-500 uppercase tracking-widest font-bold">LottoAds</p>
                <h1 className="text-3xl font-black text-white">Weekly Draw</h1>
            </div>

            {/* Content */}
            <div className="w-full max-w-lg">
                {phase === 'loading' && (
                    <div className="flex justify-center">
                        <div className="h-8 w-8 rounded-full border-2 border-yellow-500/40 border-t-yellow-500 animate-spin" />
                    </div>
                )}

                {phase === 'waiting' && <Countdown />}

                {(phase === 'revealing' || phase === 'done') && draw && (
                    <TicketReveal key={revealKey} draw={draw} onComplete={handleRevealComplete} />
                )}
            </div>

            {/* Footer */}
            <p className="mt-16 text-xs text-gray-700">
                {phase === 'waiting' ? 'This page updates automatically when the draw runs.' : ''}
            </p>
        </div>
    );
}
