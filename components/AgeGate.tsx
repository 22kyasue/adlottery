'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const AGE_KEY = 'lottoads_age_verified';

export function AgeGate() {
    const [show, setShow] = useState(false);

    useEffect(() => {
        if (!localStorage.getItem(AGE_KEY)) {
            setShow(true);
        }
    }, []);

    const accept = () => {
        localStorage.setItem(AGE_KEY, '1');
        setShow(false);
    };

    const decline = () => {
        window.location.href = 'https://www.google.com';
    };

    return (
        <AnimatePresence>
            {show && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[999] flex items-center justify-center bg-black p-4"
                >
                    <motion.div
                        initial={{ scale: 0.9, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                        className="w-full max-w-sm rounded-2xl border border-yellow-500/20 bg-[#0a0a0a] p-8 text-center space-y-6 shadow-2xl shadow-yellow-500/5"
                    >
                        <div className="space-y-2">
                            <p className="text-4xl">🎰</p>
                            <h1 className="text-2xl font-black text-white">LottoAds</h1>
                            <p className="text-sm text-gray-400">Age Verification Required</p>
                        </div>

                        <div className="space-y-1">
                            <p className="text-lg font-bold text-white">Are you 18 or older?</p>
                            <p className="text-xs text-gray-500">
                                You must be at least 18 years old to use this service.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={decline}
                                className="flex-1 rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-semibold text-gray-400 hover:bg-white/10 transition-colors"
                            >
                                No
                            </button>
                            <button
                                onClick={accept}
                                className="flex-1 rounded-xl bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 py-3 text-sm font-bold text-black hover:brightness-110 transition-all shadow-lg shadow-yellow-500/20"
                            >
                                Yes, I&apos;m 18+
                            </button>
                        </div>

                        <p className="text-xs text-gray-700">
                            By continuing you agree to our Terms of Service.
                        </p>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
