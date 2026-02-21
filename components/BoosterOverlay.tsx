'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileCheck, AlertCircle, Zap, Clock } from 'lucide-react';
import { Button } from './ui/Button';
import { playBassActivation } from '@/lib/audio';
import { useGame } from '@/lib/GameContext';

interface BoosterOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onActivate: (file: File) => Promise<{ success: boolean; error?: string }>;
}

type Phase = 'upload' | 'analyzing' | 'celebration' | 'active';

export function BoosterOverlay({ isOpen, onClose, onActivate }: BoosterOverlayProps) {
    const { state } = useGame();
    const [phase, setPhase] = useState<Phase>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Determine initial phase based on booster status
    useEffect(() => {
        if (isOpen) {
            if (state.isBoosterActive) {
                setPhase('active');
            } else {
                setPhase('upload');
                setSelectedFile(null);
                setError(null);
            }
        }
    }, [isOpen, state.isBoosterActive]);

    const handleDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) {
            setSelectedFile(file);
            setError(null);
        }
    }, []);

    const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setError(null);
        }
    }, []);

    const handleActivate = async () => {
        if (!selectedFile) return;

        setPhase('analyzing');
        setError(null);

        const result = await onActivate(selectedFile);

        if (result.success) {
            setPhase('celebration');
            playBassActivation();

            // Auto-dismiss after celebration
            setTimeout(() => {
                onClose();
                // Reset for next open
                setPhase('upload');
                setSelectedFile(null);
            }, 3000);
        } else {
            setError(result.error ?? 'Activation failed.');
            setPhase('upload');
        }
    };

    // Booster countdown for active state
    const [countdown, setCountdown] = useState('');
    useEffect(() => {
        if (phase !== 'active' || !state.boosterExpiresAt) return;
        const tick = () => {
            const diff = new Date(state.boosterExpiresAt!).getTime() - Date.now();
            if (diff <= 0) { setCountdown('Expired'); return; }
            const h = Math.floor(diff / 3600000);
            const m = Math.floor((diff % 3600000) / 60000);
            const s = Math.floor((diff % 60000) / 1000);
            setCountdown(`${h}h ${m}m ${s}s`);
        };
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, [phase, state.boosterExpiresAt]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4"
                >
                    {/* Phase: Upload */}
                    {phase === 'upload' && (
                        <motion.div
                            initial={{ y: 60, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -40, opacity: 0 }}
                            className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#0a0a0a] border border-yellow-500/30 shadow-2xl shadow-yellow-500/10"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 p-4">
                                <div className="flex items-center gap-2">
                                    <Zap className="h-5 w-5 text-yellow-400" />
                                    <h2 className="text-lg font-bold text-yellow-400">Activate Booster Mode</h2>
                                </div>
                                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5">
                                <div className="rounded-lg bg-yellow-500/10 p-3 border border-yellow-500/20 text-yellow-200 text-sm">
                                    Upload your Chrome browsing history to verify you are a real user.
                                    Get <span className="font-bold text-white">1.5x efficiency</span> for 24 hours.
                                    Your history is validated and immediately discarded.
                                </div>

                                {/* Drop zone */}
                                <div
                                    onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                    onDragLeave={() => setDragOver(false)}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                    className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${
                                        dragOver
                                            ? 'border-yellow-400 bg-yellow-500/10'
                                            : selectedFile
                                                ? 'border-green-500/50 bg-green-500/5'
                                                : 'border-white/20 bg-white/5 hover:border-yellow-500/50 hover:bg-yellow-500/5'
                                    }`}
                                >
                                    <input
                                        ref={fileInputRef}
                                        type="file"
                                        accept=".json,.csv"
                                        onChange={handleFileSelect}
                                        className="hidden"
                                    />

                                    {selectedFile ? (
                                        <div className="flex flex-col items-center gap-2">
                                            <FileCheck className="h-10 w-10 text-green-400" />
                                            <p className="text-sm font-semibold text-green-300">{selectedFile.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {(selectedFile.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <Upload className="h-10 w-10 text-gray-500" />
                                            <p className="text-sm text-gray-400">
                                                Drag & drop your history file here
                                            </p>
                                            <p className="text-xs text-gray-600">
                                                JSON or CSV — Chrome history export
                                            </p>
                                        </div>
                                    )}
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

                                {/* Activate button */}
                                <Button
                                    variant="gold"
                                    size="lg"
                                    onClick={handleActivate}
                                    disabled={!selectedFile}
                                    className="w-full"
                                >
                                    <Zap className="h-4 w-4 mr-2" />
                                    Activate Booster
                                </Button>

                                <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                                    We require 500+ unique URLs from the last 30 days.
                                    Your browsing data is validated server-side and never stored.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Phase: Analyzing */}
                    {phase === 'analyzing' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="flex flex-col items-center gap-6"
                        >
                            <motion.p
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="font-mono text-lg font-bold text-yellow-400 tracking-widest"
                            >
                                ANALYZING DATA LOGS...
                            </motion.p>

                            <div className="w-72 h-2 rounded-full bg-white/10 overflow-hidden">
                                <motion.div
                                    className="h-full rounded-full bg-gradient-to-r from-yellow-600 to-yellow-400"
                                    initial={{ width: '0%' }}
                                    animate={{ width: '95%' }}
                                    transition={{ duration: 3, ease: 'easeInOut' }}
                                />
                            </div>

                            <motion.p
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 0.5 }}
                                transition={{ delay: 0.5 }}
                                className="text-xs text-gray-500 font-mono"
                            >
                                Validating browsing patterns...
                            </motion.p>
                        </motion.div>
                    )}

                    {/* Phase: Celebration */}
                    {phase === 'celebration' && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="fixed inset-0 bg-black flex items-center justify-center overflow-hidden"
                        >
                            {/* Gold dust particles */}
                            {Array.from({ length: 24 }).map((_, i) => {
                                const angle = (i / 24) * Math.PI * 2;
                                const distance = 120 + Math.random() * 160;
                                return (
                                    <motion.div
                                        key={i}
                                        className="absolute w-2 h-2 rounded-full bg-yellow-400"
                                        initial={{
                                            x: 0,
                                            y: 0,
                                            scale: 0,
                                            opacity: 1,
                                        }}
                                        animate={{
                                            x: Math.cos(angle) * distance,
                                            y: Math.sin(angle) * distance,
                                            scale: [0, 1.5, 0],
                                            opacity: [1, 0.8, 0],
                                        }}
                                        transition={{
                                            duration: 1.5,
                                            delay: 0.2 + Math.random() * 0.3,
                                            ease: 'easeOut',
                                        }}
                                    />
                                );
                            })}

                            {/* Central text */}
                            <motion.div
                                initial={{ scale: 0.3, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                transition={{ delay: 0.3, duration: 0.6, ease: 'easeOut' }}
                                className="text-center z-10"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.4, type: 'spring', stiffness: 200 }}
                                    className="mb-4"
                                >
                                    <Zap className="h-16 w-16 text-yellow-400 mx-auto" />
                                </motion.div>
                                <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600">
                                    BOOSTER ACTIVATED
                                </h2>
                                <motion.p
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 1 }}
                                    className="mt-3 text-sm text-yellow-400/70 font-mono"
                                >
                                    1.5x efficiency for 24 hours
                                </motion.p>
                            </motion.div>
                        </motion.div>
                    )}

                    {/* Phase: Already Active */}
                    {phase === 'active' && (
                        <motion.div
                            initial={{ y: 40, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            exit={{ y: -40, opacity: 0 }}
                            className="w-full max-w-sm overflow-hidden rounded-2xl bg-[#0a0a0a] border border-yellow-500/40 shadow-2xl shadow-yellow-500/20"
                        >
                            <div className="flex items-center justify-between border-b border-yellow-500/20 p-4">
                                <div className="flex items-center gap-2">
                                    <div className="rounded-lg bg-yellow-500 p-1.5">
                                        <Zap className="h-4 w-4 text-black" />
                                    </div>
                                    <h2 className="text-lg font-bold text-yellow-400">Booster Active</h2>
                                </div>
                                <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 space-y-5 text-center">
                                <div className="inline-flex items-center gap-2 rounded-full bg-yellow-500/20 border border-yellow-500/30 px-4 py-2">
                                    <div className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse" />
                                    <span className="text-sm font-bold text-yellow-300">ACTIVE</span>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs text-gray-500 uppercase tracking-wider">Expires in</p>
                                    <p className="text-2xl font-mono font-black text-yellow-200">
                                        <Clock className="inline h-5 w-5 mr-2 opacity-50" />
                                        {countdown || '...'}
                                    </p>
                                </div>

                                <p className="text-sm text-gray-400">
                                    Every ad you watch counts as 1.5 effective views.
                                </p>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
}
