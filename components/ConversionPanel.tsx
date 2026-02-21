'use client';

import { useState, useEffect, useCallback } from 'react';
import { useGame } from '@/lib/GameContext';
import { Button } from './ui/Button';
import { ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

interface CapData {
    globalOrganic: number;
    globalConverted: number;
    capLimit: number;
    remainingCap: number;
    capPercent: number;
}

export function ConversionPanel() {
    const { state, convertChips } = useGame();

    const [capData, setCapData] = useState<CapData | null>(null);
    const [capLoading, setCapLoading] = useState(true);
    const [capError, setCapError] = useState<string | null>(null);

    const [amount, setAmount] = useState('');
    const [isConverting, setIsConverting] = useState(false);
    const [feedback, setFeedback] = useState<{
        type: 'success' | 'error';
        message: string;
    } | null>(null);

    const fetchCap = useCallback(async () => {
        setCapLoading(true);
        setCapError(null);
        try {
            const res = await fetch('/api/conversion-cap');
            const data = await res.json();
            if (!res.ok) throw new Error(data.error ?? 'Failed to fetch cap data');
            setCapData(data);
        } catch (err) {
            setCapError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setCapLoading(false);
        }
    }, []);

    useEffect(() => { fetchCap(); }, [fetchCap]);

    const handleConvert = async () => {
        const parsed = parseInt(amount, 10);
        if (!Number.isFinite(parsed) || parsed <= 0) {
            setFeedback({ type: 'error', message: 'Enter a valid positive number.' });
            return;
        }
        if (parsed > state.vibeChips) {
            setFeedback({ type: 'error', message: 'You do not have enough Vibe Chips.' });
            return;
        }
        if (capData && parsed > capData.remainingCap) {
            setFeedback({
                type: 'error',
                message: `Exceeds the remaining cap. Max convertible: ${capData.remainingCap}.`,
            });
            return;
        }

        setIsConverting(true);
        setFeedback(null);

        const result = await convertChips(parsed);

        if (result.success) {
            setFeedback({
                type: 'success',
                message: `Converted ${parsed} chips into ${parsed} Bonus Tickets!`,
            });
            setAmount('');
            await fetchCap();
        } else {
            setFeedback({ type: 'error', message: result.error ?? 'Conversion failed.' });
        }

        setIsConverting(false);
    };

    const fillPercent = capData && capData.capLimit > 0
        ? Math.min(100, Math.round((capData.globalConverted / capData.capLimit) * 100))
        : 0;

    return (
        <div className="rounded-2xl border border-purple-500/20 bg-purple-500/5 p-6 space-y-5">
            <div className="flex items-center justify-between">
                <h3 className="text-lg font-bold text-white">Convert Vibe Chips</h3>
                <button
                    onClick={fetchCap}
                    disabled={capLoading}
                    className="text-gray-400 hover:text-white transition-colors disabled:opacity-50"
                    title="Refresh cap data"
                >
                    <RefreshCw className={`h-4 w-4 ${capLoading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            <p className="text-sm text-gray-400">
                Spend Vibe Chips to earn Bonus Tickets. 1 chip = 1 ticket.
                A weekly global cap limits total conversions to 30% of organic tickets.
            </p>

            {/* Global Cap Progress */}
            {capError ? (
                <div className="flex items-center gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
                    <AlertCircle className="h-4 w-4 flex-shrink-0" />
                    <span>{capError}</span>
                </div>
            ) : (
                <div className="space-y-2">
                    <div className="flex justify-between text-xs text-gray-400">
                        <span>Weekly Cap Usage</span>
                        <span className="font-mono">
                            {capLoading ? '...'
                                : `${capData?.globalConverted ?? 0} / ${capData?.capLimit ?? 0} tickets`}
                        </span>
                    </div>
                    <div className="h-2 rounded-full bg-white/10 overflow-hidden">
                        <motion.div
                            className={`h-full rounded-full ${
                                fillPercent >= 90 ? 'bg-red-500' :
                                fillPercent >= 70 ? 'bg-yellow-500' :
                                'bg-purple-500'
                            }`}
                            initial={{ width: 0 }}
                            animate={{ width: `${fillPercent}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut' }}
                        />
                    </div>
                    {!capLoading && capData && (
                        <p className="text-xs text-gray-500">
                            {capData.remainingCap > 0
                                ? `${capData.remainingCap} tickets remaining in cap this week`
                                : capData.globalOrganic === 0
                                    ? 'No conversions available yet. Watch ads to earn organic tickets first — the cap is 30% of total organic tickets.'
                                    : 'Weekly cap reached. More organic ad views are needed to unlock conversions.'}
                        </p>
                    )}
                </div>
            )}

            {/* Conversion Input */}
            <div className="flex gap-3">
                <input
                    type="number"
                    min="1"
                    max={Math.min(state.vibeChips, capData?.remainingCap ?? 0)}
                    value={amount}
                    onChange={e => {
                        setAmount(e.target.value);
                        setFeedback(null);
                    }}
                    placeholder="Amount of chips"
                    className="flex-1 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-purple-500/50 focus:outline-none focus:ring-1 focus:ring-purple-500/30"
                />
                <Button
                    variant="secondary"
                    size="md"
                    onClick={handleConvert}
                    isLoading={isConverting}
                    disabled={
                        isConverting ||
                        capLoading ||
                        !amount ||
                        parseInt(amount) <= 0 ||
                        (capData?.remainingCap ?? 0) === 0
                    }
                    className="border border-purple-500/30 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 hover:text-white shrink-0"
                >
                    {!isConverting && <ArrowRight className="h-4 w-4 mr-1.5" />}
                    Convert
                </Button>
            </div>

            {/* Quick-fill buttons */}
            {capData && state.vibeChips > 0 && (
                <div className="flex flex-wrap gap-2">
                    {[10, 50, 100].map(n => (
                        <button
                            key={n}
                            onClick={() => setAmount(String(Math.min(n, state.vibeChips, capData.remainingCap)))}
                            className="rounded-md border border-white/10 bg-white/5 px-3 py-1 text-xs text-gray-300 hover:bg-white/10 hover:text-white transition-colors"
                        >
                            {n}
                        </button>
                    ))}
                    <button
                        onClick={() => setAmount(String(Math.min(state.vibeChips, capData.remainingCap)))}
                        className="rounded-md border border-purple-500/20 bg-purple-500/5 px-3 py-1 text-xs text-purple-300 hover:bg-purple-500/10 transition-colors"
                    >
                        Max
                    </button>
                </div>
            )}

            {/* Feedback */}
            <AnimatePresence>
                {feedback && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${
                            feedback.type === 'success'
                                ? 'border-green-500/20 bg-green-500/10 text-green-300'
                                : 'border-red-500/20 bg-red-500/10 text-red-300'
                        }`}
                    >
                        {feedback.type === 'success'
                            ? <CheckCircle2 className="h-4 w-4 flex-shrink-0 mt-0.5" />
                            : <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                        }
                        <span>{feedback.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Balance */}
            <div className="flex items-center justify-between text-xs text-gray-500 border-t border-white/5 pt-4">
                <span>Your balance:</span>
                <span className="font-mono text-purple-300 font-semibold">
                    {state.vibeChips.toLocaleString()} Vibe Chips
                </span>
            </div>
        </div>
    );
}
