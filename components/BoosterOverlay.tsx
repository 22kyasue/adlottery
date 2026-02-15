'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Search, CreditCard, Upload } from 'lucide-react';
import { Button } from './ui/Button';

interface BoosterOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onActivate: (method: 'payment' | 'history') => Promise<void>;
}

export function BoosterOverlay({ isOpen, onClose, onActivate }: BoosterOverlayProps) {
    const [loadingMethod, setLoadingMethod] = useState<'payment' | 'history' | null>(null);

    const handleActivate = async (method: 'payment' | 'history') => {
        setLoadingMethod(method);
        await onActivate(method);
        setLoadingMethod(null);
        onClose();
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm p-4 sm:p-0"
                >
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#1a1a1a] border border-yellow-500/30 shadow-2xl shadow-yellow-500/10"
                    >
                        <div className="flex items-center justify-between border-b border-white/10 p-4">
                            <h2 className="text-xl font-bold text-yellow-400">Activate Booster Mode 🚀</h2>
                            <button onClick={onClose} className="text-gray-400 hover:text-white">
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="rounded-lg bg-yellow-500/10 p-4 border border-yellow-500/20 text-yellow-200 text-sm">
                                Get <span className="font-bold text-white">1.5x Efficiency</span> on all ticket earning activities!
                                Active for 24 hours.
                            </div>

                            <div className="space-y-3">
                                <button
                                    onClick={() => handleActivate('payment')}
                                    disabled={loadingMethod !== null}
                                    className="group relative flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-yellow-500/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-500/20 text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                                            <CreditCard className="h-5 w-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-white">Pay 100 Yen</div>
                                            <div className="text-xs text-gray-400">Instant activation for 1 day</div>
                                        </div>
                                    </div>
                                    {loadingMethod === 'payment' && <div className="animate-spin text-yellow-500">⏳</div>}
                                </button>

                                <div className="relative flex items-center py-2">
                                    <div className="flex-grow border-t border-white/10"></div>
                                    <span className="flex-shrink-0 px-4 text-xs text-gray-500 uppercase">OR FREE ALT</span>
                                    <div className="flex-grow border-t border-white/10"></div>
                                </div>

                                <button
                                    onClick={() => handleActivate('history')}
                                    disabled={loadingMethod !== null}
                                    className="group relative flex w-full items-center justify-between rounded-xl border border-white/10 bg-white/5 p-4 transition-all hover:bg-white/10 hover:border-purple-500/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-500/20 text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                                            <Upload className="h-5 w-5" />
                                        </div>
                                        <div className="text-left">
                                            <div className="font-semibold text-white">Upload Search History</div>
                                            <div className="text-xs text-gray-400">Share last 30 days Chrome history</div>
                                        </div>
                                    </div>
                                    {loadingMethod === 'history' && <div className="animate-spin text-yellow-500">⏳</div>}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
