'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, RefreshCw, CheckCircle, XCircle, Shield } from 'lucide-react';
import { getCurrentWeekId } from '@/lib/utils';

interface DrawResult {
    week_id: string;
    winner_user_id: string;
    winning_ticket_number: number;
    total_tickets: number;
    prize_amount: number;
    payout_status: string;
}

type Status = 'idle' | 'running' | 'success' | 'error' | 'already_done';

export default function AdminPage() {
    const [apiKey, setApiKey] = useState('');
    const [weekId, setWeekId] = useState(getCurrentWeekId());
    const [status, setStatus] = useState<Status>('idle');
    const [result, setResult] = useState<DrawResult | null>(null);
    const [errorMsg, setErrorMsg] = useState('');

    const [expireStatus, setExpireStatus] = useState<'idle' | 'running' | 'success' | 'error'>('idle');
    const [expiredCount, setExpiredCount] = useState<number | null>(null);

    const runDraw = async () => {
        if (!apiKey) return;
        setStatus('running');
        setResult(null);
        setErrorMsg('');

        try {
            const res = await fetch('/api/admin/run-draw', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
                body: JSON.stringify({ weekId }),
            });
            const data = await res.json();

            if (res.status === 409) { setStatus('already_done'); return; }
            if (!res.ok) { setStatus('error'); setErrorMsg(data.error ?? 'Unknown error'); return; }

            setResult(data.draw);
            setStatus('success');
        } catch (e) {
            setStatus('error');
            setErrorMsg(String(e));
        }
    };

    const expirePayouts = async () => {
        if (!apiKey) return;
        setExpireStatus('running');
        try {
            const res = await fetch('/api/admin/expire-payouts', {
                method: 'POST',
                headers: { Authorization: `Bearer ${apiKey}` },
            });
            const data = await res.json();
            if (!res.ok) { setExpireStatus('error'); return; }
            setExpiredCount(data.expiredCount);
            setExpireStatus('success');
        } catch {
            setExpireStatus('error');
        }
    };

    const fmt7 = (n: number) => String(n).padStart(7, '0');

    return (
        <div className="min-h-screen bg-[#0a0a0a] p-6 max-w-xl mx-auto space-y-8">
            {/* Header */}
            <div className="pt-6 space-y-1">
                <div className="flex items-center gap-2 text-red-400">
                    <Shield className="h-4 w-4" />
                    <span className="text-xs uppercase tracking-widest font-bold">Admin Panel</span>
                </div>
                <h1 className="text-2xl font-black text-white">LottoAds Admin</h1>
            </div>

            {/* API Key */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-3">
                <label className="block text-sm font-semibold text-gray-300">Admin API Key</label>
                <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder="sk-..."
                    className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-yellow-500/50 focus:outline-none font-mono"
                />
            </div>

            {/* Run Draw */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                <div>
                    <h2 className="text-lg font-bold text-white">Run Weekly Draw</h2>
                    <p className="text-sm text-gray-400">Picks a random ticket number and selects the winner.</p>
                </div>

                <div className="space-y-2">
                    <label className="block text-xs text-gray-500 uppercase tracking-wider">Week ID</label>
                    <input
                        type="text"
                        value={weekId}
                        onChange={e => setWeekId(e.target.value)}
                        className="w-full rounded-lg bg-black/50 border border-white/10 px-3 py-2 text-sm text-white font-mono focus:border-yellow-500/50 focus:outline-none"
                    />
                </div>

                <button
                    onClick={runDraw}
                    disabled={!apiKey || status === 'running'}
                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-yellow-500 py-3 font-bold text-black hover:bg-yellow-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    {status === 'running'
                        ? <><RefreshCw className="h-4 w-4 animate-spin" /> Running draw…</>
                        : <><Play className="h-4 w-4" /> Run Draw for {weekId}</>}
                </button>

                <AnimatePresence>
                    {status === 'success' && result && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 space-y-3">
                            <div className="flex items-center gap-2 text-green-400 font-bold text-sm">
                                <CheckCircle className="h-4 w-4" /> Draw complete
                            </div>
                            <div className="grid grid-cols-2 gap-3 text-sm">
                                <div>
                                    <p className="text-gray-500 text-xs">Winning ticket</p>
                                    <p className="text-yellow-400 font-mono font-bold text-lg">#{fmt7(result.winning_ticket_number)}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Total tickets</p>
                                    <p className="text-white font-mono">{result.total_tickets.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Prize amount</p>
                                    <p className="text-white font-bold">¥{result.prize_amount.toLocaleString()}</p>
                                </div>
                                <div>
                                    <p className="text-gray-500 text-xs">Payout status</p>
                                    <p className={`font-semibold capitalize ${result.payout_status === 'ready' ? 'text-green-400' : 'text-amber-400'}`}>
                                        {result.payout_status}
                                    </p>
                                </div>
                            </div>
                            <div>
                                <p className="text-gray-500 text-xs">Winner user ID</p>
                                <p className="text-white font-mono text-xs break-all">{result.winner_user_id}</p>
                            </div>
                        </motion.div>
                    )}
                    {status === 'already_done' && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-3 text-sm text-amber-300">
                            Draw already completed for {weekId}.
                        </motion.div>
                    )}
                    {status === 'error' && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 flex items-start gap-2 text-sm text-red-300">
                            <XCircle className="h-4 w-4 mt-0.5 shrink-0" /> {errorMsg || 'Something went wrong'}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Expire Payouts */}
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 space-y-4">
                <div>
                    <h2 className="text-lg font-bold text-white">Expire Overdue Payouts</h2>
                    <p className="text-sm text-gray-400">Marks pending payouts older than 14 days as expired. Runs automatically via cron.</p>
                </div>
                <button
                    onClick={expirePayouts}
                    disabled={!apiKey || expireStatus === 'running'}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 py-3 font-semibold text-white hover:bg-white/10 transition-colors disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                >
                    {expireStatus === 'running'
                        ? <><RefreshCw className="h-4 w-4 animate-spin" /> Running…</>
                        : 'Run Expire Payouts'}
                </button>
                <AnimatePresence>
                    {expireStatus === 'success' && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-green-500/20 bg-green-500/5 p-3 text-sm text-green-300 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" /> {expiredCount} payout{expiredCount !== 1 ? 's' : ''} expired.
                        </motion.div>
                    )}
                    {expireStatus === 'error' && (
                        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                            className="rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-sm text-red-300">
                            Failed to expire payouts.
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}
