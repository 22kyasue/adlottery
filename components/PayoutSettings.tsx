'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Wallet, AlertCircle, CheckCircle2, Receipt, Clock, CreditCard, XCircle } from 'lucide-react';
import { Button } from './ui/Button';

interface PayoutSettingsProps {
    isOpen: boolean;
    onClose: () => void;
}

type Tab = 'settings' | 'history';

interface Payout {
    id: string;
    week_id: string;
    amount: number;
    status: 'pending' | 'ready' | 'paid' | 'expired';
    expires_at: string;
    created_at: string;
    paid_at: string | null;
    payment_method: string | null;
    transaction_id: string | null;
}

const statusConfig = {
    pending: { label: 'Pending', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30', icon: Clock },
    ready: { label: 'Ready', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30', icon: CreditCard },
    paid: { label: 'Paid', color: 'bg-green-500/20 text-green-300 border-green-500/30', icon: CheckCircle2 },
    expired: { label: 'Expired', color: 'bg-gray-500/20 text-gray-400 border-gray-500/30', icon: XCircle },
};

function formatDate(iso: string) {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export function PayoutSettings({ isOpen, onClose }: PayoutSettingsProps) {
    const [activeTab, setActiveTab] = useState<Tab>('settings');

    // Settings state
    const [paypalEmail, setPaypalEmail] = useState('');
    const [wiseEmail, setWiseEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isFetchingSettings, setIsFetchingSettings] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    // History state
    const [payouts, setPayouts] = useState<Payout[]>([]);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);
    const [historyError, setHistoryError] = useState<string | null>(null);

    // Fetch settings when modal opens
    useEffect(() => {
        if (!isOpen) {
            setError(null);
            setShowSuccess(false);
            setHistoryError(null);
            return;
        }

        setIsFetchingSettings(true);
        fetch('/api/user/payout-settings')
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    setError(data.error);
                } else {
                    setPaypalEmail(data.paypalEmail ?? '');
                    setWiseEmail(data.wiseEmail ?? '');
                }
            })
            .catch(() => setError('Failed to load settings'))
            .finally(() => setIsFetchingSettings(false));
    }, [isOpen]);

    // Fetch history when switching to history tab (or on open if already on history)
    useEffect(() => {
        if (!isOpen || activeTab !== 'history') return;

        setIsFetchingHistory(true);
        setHistoryError(null);
        fetch('/api/user/payout-history')
            .then(r => r.json())
            .then(data => {
                if (data.error) {
                    setHistoryError(data.error);
                } else {
                    setPayouts(data.payouts ?? []);
                }
            })
            .catch(() => setHistoryError('Failed to load payment history'))
            .finally(() => setIsFetchingHistory(false));
    }, [isOpen, activeTab]);

    const handleSave = async () => {
        setIsLoading(true);
        setError(null);
        setShowSuccess(false);

        try {
            const res = await fetch('/api/user/payout-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ paypalEmail, wiseEmail }),
            });

            const data = await res.json();

            if (!res.ok) {
                setError(data.error ?? 'Failed to save');
                return;
            }

            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        } catch {
            setError('Network error');
        } finally {
            setIsLoading(false);
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
                >
                    <motion.div
                        initial={{ y: 60, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -40, opacity: 0 }}
                        className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#0a0a0a] border border-yellow-500/30 shadow-2xl shadow-yellow-500/10 max-h-[80vh] flex flex-col"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between border-b border-white/10 p-4 flex-shrink-0">
                            <div className="flex items-center gap-2">
                                <Wallet className="h-5 w-5 text-yellow-400" />
                                <h2 className="text-lg font-bold text-yellow-400">Payouts</h2>
                            </div>
                            <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                <X className="h-5 w-5" />
                            </button>
                        </div>

                        {/* Tab bar */}
                        <div className="flex border-b border-white/10 flex-shrink-0">
                            <button
                                onClick={() => setActiveTab('settings')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors relative ${
                                    activeTab === 'settings' ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <Wallet className="h-3.5 w-3.5" />
                                Settings
                                {activeTab === 'settings' && (
                                    <motion.div layoutId="payout-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />
                                )}
                            </button>
                            <button
                                onClick={() => setActiveTab('history')}
                                className={`flex-1 flex items-center justify-center gap-1.5 py-3 text-sm font-semibold transition-colors relative ${
                                    activeTab === 'history' ? 'text-yellow-400' : 'text-gray-500 hover:text-gray-300'
                                }`}
                            >
                                <Receipt className="h-3.5 w-3.5" />
                                History
                                {activeTab === 'history' && (
                                    <motion.div layoutId="payout-tab-indicator" className="absolute bottom-0 left-0 right-0 h-0.5 bg-yellow-500" />
                                )}
                            </button>
                        </div>

                        {/* Content */}
                        <div className="overflow-y-auto flex-1">
                            {activeTab === 'settings' ? (
                                <div className="p-6 space-y-5">
                                    {/* Info banner */}
                                    <div className="rounded-lg bg-amber-500/10 p-3 border border-amber-500/20 text-amber-200 text-sm">
                                        Set up your payout method so we can send your prize winnings.
                                        You can add PayPal, Wise, or both.
                                    </div>

                                    {isFetchingSettings ? (
                                        <div className="flex items-center justify-center gap-2 py-8 text-gray-500">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500/50 border-t-transparent" />
                                            <span className="text-sm font-mono">Loading...</span>
                                        </div>
                                    ) : (
                                        <>
                                            {/* PayPal Email */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
                                                    PayPal Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={paypalEmail}
                                                    onChange={e => setPaypalEmail(e.target.value)}
                                                    placeholder="your@email.com"
                                                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm text-white font-mono placeholder:text-gray-600 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 transition-colors"
                                                />
                                            </div>

                                            {/* Wise Email */}
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium uppercase tracking-wider text-gray-400">
                                                    Wise Email
                                                </label>
                                                <input
                                                    type="email"
                                                    value={wiseEmail}
                                                    onChange={e => setWiseEmail(e.target.value)}
                                                    placeholder="your@email.com"
                                                    className="w-full rounded-lg border border-white/10 bg-black px-4 py-3 text-sm text-white font-mono placeholder:text-gray-600 focus:border-yellow-500/50 focus:outline-none focus:ring-1 focus:ring-yellow-500/30 transition-colors"
                                                />
                                            </div>

                                            {/* Error */}
                                            {error && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: 'auto' }}
                                                    className="flex items-start gap-2 rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300"
                                                >
                                                    <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                                                    <span>{error}</span>
                                                </motion.div>
                                            )}

                                            {/* Success */}
                                            <AnimatePresence>
                                                {showSuccess && (
                                                    <motion.div
                                                        initial={{ opacity: 0, scale: 0.9 }}
                                                        animate={{ opacity: 1, scale: 1 }}
                                                        exit={{ opacity: 0, scale: 0.9 }}
                                                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                                                        className="flex items-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 p-3 text-sm text-green-300"
                                                    >
                                                        <CheckCircle2 className="h-4 w-4 flex-shrink-0" />
                                                        <span>Settings saved successfully</span>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>

                                            {/* Save button */}
                                            <Button
                                                variant="gold"
                                                size="lg"
                                                onClick={handleSave}
                                                isLoading={isLoading}
                                                className="w-full"
                                            >
                                                <Wallet className="h-4 w-4 mr-2" />
                                                Save Payout Settings
                                            </Button>
                                        </>
                                    )}
                                </div>
                            ) : (
                                <div className="p-4">
                                    {isFetchingHistory ? (
                                        <div className="flex items-center justify-center gap-2 py-12 text-gray-500">
                                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-yellow-500/50 border-t-transparent" />
                                            <span className="text-sm font-mono">Loading...</span>
                                        </div>
                                    ) : (historyError || payouts.length === 0) ? (
                                        <div className="space-y-3 opacity-40 pointer-events-none select-none">
                                            <p className="text-center text-xs text-gray-500 mb-4">
                                                {historyError ? 'Could not load history' : 'No payouts yet'} — example below
                                            </p>
                                            {[
                                                { week: 'YYYY-W00', amount: 12500, status: 'paid' as const, date: 'Example date', paidDate: 'Example date', method: 'PayPal' },
                                                { week: 'YYYY-W00', amount: 8300, status: 'ready' as const, date: 'Example date' },
                                                { week: 'YYYY-W00', amount: 5000, status: 'expired' as const, date: 'Example date' },
                                            ].map((ex, i) => {
                                                const config = statusConfig[ex.status];
                                                const Icon = config.icon;
                                                return (
                                                    <div key={i} className="rounded-xl border border-white/10 bg-white/5 p-4 relative">
                                                        <span className="absolute top-2 right-2 text-[10px] uppercase tracking-widest text-gray-600">Example</span>
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-mono text-gray-400">Week {ex.week}</span>
                                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.color}`}>
                                                                <Icon className="h-3 w-3" />
                                                                {config.label}
                                                            </span>
                                                        </div>
                                                        <div className="flex items-baseline justify-between">
                                                            <span className="text-xl font-bold text-white">¥{ex.amount.toLocaleString()}</span>
                                                            <span className="text-xs text-gray-500">{ex.date}</span>
                                                        </div>
                                                        {ex.status === 'paid' && (
                                                            <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                                                <p className="text-xs text-green-400">Paid on {ex.paidDate}</p>
                                                                <p className="text-xs text-gray-500">Method: <span className="text-gray-300">{ex.method}</span></p>
                                                            </div>
                                                        )}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {payouts.map((payout) => {
                                                const config = statusConfig[payout.status];
                                                const Icon = config.icon;

                                                return (
                                                    <motion.div
                                                        key={payout.id}
                                                        initial={{ opacity: 0, y: 8 }}
                                                        animate={{ opacity: 1, y: 0 }}
                                                        className="rounded-xl border border-white/10 bg-white/5 p-4"
                                                    >
                                                        <div className="flex items-center justify-between mb-2">
                                                            <span className="text-sm font-mono text-gray-400">
                                                                Week {payout.week_id}
                                                            </span>
                                                            <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${config.color}`}>
                                                                <Icon className="h-3 w-3" />
                                                                {config.label}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-baseline justify-between">
                                                            <span className="text-xl font-bold text-white">
                                                                ¥{payout.amount.toLocaleString()}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                {formatDate(payout.created_at)}
                                                            </span>
                                                        </div>

                                                        {payout.status === 'paid' && payout.paid_at && (
                                                            <div className="mt-2 pt-2 border-t border-white/5 space-y-1">
                                                                <p className="text-xs text-green-400">
                                                                    Paid on {formatDate(payout.paid_at)}
                                                                </p>
                                                                {payout.payment_method && (
                                                                    <p className="text-xs text-gray-500">
                                                                        Method: <span className="text-gray-300">{payout.payment_method}</span>
                                                                    </p>
                                                                )}
                                                                {payout.transaction_id && (
                                                                    <p className="text-xs text-gray-500">
                                                                        Txn: <span className="text-gray-300 font-mono">{payout.transaction_id}</span>
                                                                    </p>
                                                                )}
                                                            </div>
                                                        )}

                                                        {payout.status === 'pending' && (
                                                            <p className="mt-2 text-xs text-amber-400/70">
                                                                Expires {formatDate(payout.expires_at)}
                                                            </p>
                                                        )}
                                                    </motion.div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
