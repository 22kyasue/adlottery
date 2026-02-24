'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, X } from 'lucide-react';

export function LaunchBonusBanner() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (sessionStorage.getItem('launch_bonus_pending') === '1') {
            sessionStorage.removeItem('launch_bonus_pending');
            setShow(true);
        }
    }, []);

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0, y: -40 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -40 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className="fixed top-4 left-1/2 -translate-x-1/2 z-[70] w-full max-w-sm px-4"
                >
                    <div className="relative flex items-start gap-3 rounded-2xl border border-yellow-500/40 bg-gradient-to-r from-yellow-900/60 via-yellow-800/40 to-yellow-900/60 backdrop-blur-xl p-4 shadow-2xl shadow-yellow-500/20">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-yellow-500/20 ring-1 ring-yellow-500/40">
                            <Sparkles className="h-4 w-4 text-yellow-400" />
                        </div>
                        <div className="flex-1 space-y-0.5">
                            <p className="text-sm font-black text-yellow-300">🎉 Launch Campaign Bonus!</p>
                            <p className="text-xs text-yellow-200/80">
                                Welcome, early adopter! You received <strong>25 Vibe Chips</strong> + <strong>3-day Booster</strong> as a thank-you for joining during our launch.
                            </p>
                        </div>
                        <button
                            onClick={() => setShow(false)}
                            className="shrink-0 text-yellow-500/60 hover:text-yellow-300 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
