'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, FileCheck, AlertCircle, Zap, Clock, Terminal, ChevronDown, HelpCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { playBassActivation } from '@/lib/audio';
import { useGame } from '@/lib/GameContext';

interface BoosterLog {
    filename: string;
    createdAt: string;
    size: number;
}

interface BoosterOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onActivate: (file: File) => Promise<{ success: boolean; error?: string }>;
}

type Phase = 'upload' | 'preview' | 'analyzing' | 'celebration' | 'active';

// Add interface for history items
interface HistoryItem {
    url: string;
    title: string;
    visitCount: number;
    lastVisitTime: number;
}

export function BoosterOverlay({ isOpen, onClose, onActivate }: BoosterOverlayProps) {
    const { state } = useGame();
    const [phase, setPhase] = useState<Phase>('upload');
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [extractedData, setExtractedData] = useState<HistoryItem[] | null>(null);
    const [dragOver, setDragOver] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showInstructions, setShowInstructions] = useState(false);
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



    // Extension Detection
    const [extensionInstalled, setExtensionInstalled] = useState(false);
    const [isFetchingHistory, setIsFetchingHistory] = useState(false);

    useEffect(() => {
        // Fallback ping to ask the extension if it is there
        window.postMessage({ type: 'LOTTOVIBE_PING_EXTENSION' }, '*');

        // Listen for standard custom event (bulletproof)
        const handleCustomEvent = () => setExtensionInstalled(true);
        document.addEventListener('lottovibe-extension-ready', handleCustomEvent);

        // Listen for history data from extension
        const handleMessage = (event: MessageEvent) => {
            if (event.source !== window) return;

            if (event.data.type === 'LOTTOVIBE_EXTENSION_READY') {
                setExtensionInstalled(true);
            } else if (event.data.type === 'LOTTOVIBE_HISTORY_DATA') {
                const historyData = event.data.data;
                setIsFetchingHistory(false);

                // Save data for preview
                setExtractedData(historyData);
                setPhase('preview');

                // We'll create the file later when they confirm
            } else if (event.data.type === 'LOTTOVIBE_HISTORY_ERROR') {
                setIsFetchingHistory(false);
                setError(`Extension error: ${event.data.error}`);
            }
        };

        window.addEventListener('message', handleMessage);
        return () => {
            window.removeEventListener('message', handleMessage);
            document.removeEventListener('lottovibe-extension-ready', handleCustomEvent);
        };
    }, []);

    const handleAutoActivate = () => {
        setIsFetchingHistory(true);
        setError(null);
        window.postMessage({ type: 'LOTTOVIBE_REQUEST_HISTORY' }, '*');
    };

    const handleActivateFile = async (file: File) => {
        setPhase('analyzing');
        setError(null);

        const result = await onActivate(file);

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

    const handleConfirmPreview = async () => {
        if (!extractedData) return;

        // Create the virtual file now that they've confirmed
        const blob = new Blob([JSON.stringify(extractedData)], { type: 'application/json' });
        const file = new File([blob], 'lottovibe_history.json', { type: 'application/json' });

        await handleActivateFile(file);
    };

    const handleActivate = async () => {
        if (!selectedFile) return;
        await handleActivateFile(selectedFile);
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

    // Data Provision History
    const [logsOpen, setLogsOpen] = useState(false);
    const [logs, setLogs] = useState<BoosterLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);
    const logsFetched = useRef(false);

    useEffect(() => {
        if (!logsOpen || logsFetched.current) return;
        logsFetched.current = true;
        setLogsLoading(true);
        fetch('/api/user/booster-logs')
            .then(r => r.json())
            .then(data => setLogs(data.logs ?? []))
            .catch(() => { })
            .finally(() => setLogsLoading(false));
    }, [logsOpen]);

    // Reset logs state when modal closes
    useEffect(() => {
        if (!isOpen) {
            setLogsOpen(false);
            logsFetched.current = false;
            setLogs([]);
            setExtractedData(null);
        }
    }, [isOpen]);

    const formatLogDate = (iso: string) => {
        const d = new Date(iso);
        return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
            + ' ' + d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
    };

    const formatBytes = (bytes: number) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
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

                                {extensionInstalled ? (
                                    <div className="rounded-xl border-2 border-yellow-500/30 bg-gradient-to-br from-yellow-500/10 to-transparent p-6 text-center">
                                        <Zap className="h-12 w-12 text-yellow-400 mx-auto mb-3" />
                                        <h3 className="text-lg font-bold text-white mb-2">Extension Active!</h3>
                                        <p className="text-sm text-gray-400 mb-6">
                                            The Auto-Booster extension is securely verifying your footprint.
                                            No drag-and-drop required.
                                        </p>
                                        <Button
                                            variant="gold"
                                            size="lg"
                                            onClick={handleAutoActivate}
                                            disabled={isFetchingHistory}
                                            className="w-full"
                                        >
                                            {isFetchingHistory ? (
                                                <><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-black border-l-2 mr-2"></span>Extracting from Browser...</>
                                            ) : (
                                                <><Zap className="h-4 w-4 mr-2" /> 1-Click Auto Extract</>
                                            )}
                                        </Button>
                                    </div>
                                ) : (
                                    <>
                                        {/* Drop zone */}
                                        <div
                                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                                            onDragLeave={() => setDragOver(false)}
                                            onDrop={handleDrop}
                                            onClick={() => fileInputRef.current?.click()}
                                            className={`relative cursor-pointer rounded-xl border-2 border-dashed p-8 text-center transition-all ${dragOver
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

                                        {/* Instructions */}
                                        <div className="rounded-lg border border-white/10 overflow-hidden">
                                            <button
                                                onClick={() => setShowInstructions(!showInstructions)}
                                                className="flex items-center justify-between w-full p-3 bg-white/5 hover:bg-white/10 transition-colors text-sm text-gray-300 outline-none"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <HelpCircle className="h-4 w-4 text-yellow-500" />
                                                    How to export your Chrome history?
                                                </div>
                                                <ChevronDown className={`h-4 w-4 transition-transform ${showInstructions ? 'rotate-180' : ''}`} />
                                            </button>
                                            <AnimatePresence>
                                                {showInstructions && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="bg-black/50 border-t border-white/10 overflow-hidden"
                                                    >
                                                        <div className="p-4 text-xs text-gray-400 space-y-3">
                                                            <p>We recommend using a free Chrome extension to securely export your history file in seconds.</p>
                                                            <ol className="list-decimal pl-4 space-y-2 marker:text-yellow-500">
                                                                <li>Install the <a href="https://chromewebstore.google.com/detail/export-chrome-history/caaonoeoohfjnnmibephheejbbiejkmi" target="_blank" rel="noreferrer" className="text-yellow-400 hover:underline">Export Chrome History</a> extension (or any similar tool).</li>
                                                                <li>Click the extension icon in your browser toolbar.</li>
                                                                <li>Choose to download your history as <strong className="text-white">JSON</strong> or <strong className="text-white">CSV</strong>.</li>
                                                                <li>Drag the downloaded file into the upload box above.</li>
                                                            </ol>
                                                            <p className="text-yellow-500 pt-2 border-t border-white/10 mt-2">
                                                                <strong>Want this to be automatic?</strong> Install the verified <span className="text-white font-bold">LottoVibe Auto-Booster</span> extension to enable 1-Click activation!
                                                            </p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
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

                                        {/* Activate button (Fallback) */}
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
                                    </>
                                )}

                                <p className="text-[10px] text-gray-600 text-center leading-relaxed">
                                    We require 500+ unique URLs from the last 30 days.
                                    Your browsing data is validated server-side and never stored.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Phase: Preview Data */}
                    {phase === 'preview' && extractedData && (
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-full max-w-lg overflow-hidden rounded-2xl bg-[#0a0a0a] border border-blue-500/30 shadow-2xl shadow-blue-500/10 flex flex-col max-h-[80vh]"
                        >
                            <div className="flex items-center justify-between border-b border-white/10 p-4">
                                <div className="flex items-center gap-2">
                                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                        <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                        </svg>
                                    </div>
                                    <h2 className="text-lg font-bold text-blue-400">Review Extracted Footprint</h2>
                                </div>
                                <button onClick={() => setPhase('upload')} className="text-gray-500 hover:text-white transition-colors">
                                    <X className="h-5 w-5" />
                                </button>
                            </div>

                            <div className="p-6 overflow-hidden flex flex-col flex-1">
                                <p className="text-sm text-gray-400 mb-4">
                                    Successfully extracted <span className="text-white font-bold">{extractedData.length.toLocaleString()}</span> URLs from your browser history. This data will be instantly validated and discarded by our server.
                                </p>

                                <div className="flex-1 overflow-y-auto space-y-2 mb-6 pr-2 rounded-lg border border-white/5 bg-white/5 p-2" style={{ maxHeight: '300px' }}>
                                    {extractedData.slice(0, 100).map((item, i) => (
                                        <div key={i} className="text-xs font-mono p-2 bg-black rounded border border-white/5 flex flex-col gap-1">
                                            <div className="flex justify-between text-gray-400">
                                                <span className="truncate pr-4 flex-1">{item.title || 'Untitled'}</span>
                                                <span className="shrink-0 text-blue-400">{new Date(item.lastVisitTime).toLocaleDateString()}</span>
                                            </div>
                                            <div className="text-blue-200/50 truncate">{item.url}</div>
                                        </div>
                                    ))}
                                    {extractedData.length > 100 && (
                                        <div className="text-center text-xs text-gray-500 pt-2 pb-1 font-mono">
                                            ... and {(extractedData.length - 100).toLocaleString()} more hidden ...
                                        </div>
                                    )}
                                </div>

                                <Button
                                    variant="gold"
                                    size="lg"
                                    onClick={handleConfirmPreview}
                                    className="w-full shrink-0"
                                >
                                    {state.isBoosterActive ? (
                                        <><Zap className="h-4 w-4 mr-2" /> Submit Latest Data & Close</>
                                    ) : (
                                        <><Zap className="h-4 w-4 mr-2" /> Confirm & Activate Booster</>
                                    )}
                                </Button>
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

                                {/* Extension Data Preview Feature */}
                                {extensionInstalled && (
                                    <div className="pt-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={handleAutoActivate}
                                            disabled={isFetchingHistory}
                                            className="w-full bg-blue-500/10 border-blue-500/30 text-blue-400 hover:bg-blue-500/20"
                                        >
                                            {isFetchingHistory ? (
                                                <><span className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-400 border-l-2 mr-2"></span>Extracting...</>
                                            ) : (
                                                <><Zap className="h-3 w-3 mr-2" /> Inspect Browser Footprint Data</>
                                            )}
                                        </Button>
                                    </div>
                                )}

                                {/* Data Provision History */}
                                <div className="text-left">
                                    <button
                                        onClick={() => setLogsOpen(!logsOpen)}
                                        className="flex items-center gap-2 w-full text-left group"
                                    >
                                        <Terminal className="h-3.5 w-3.5 text-yellow-500/70" />
                                        <span className="text-xs font-mono uppercase tracking-widest text-yellow-500/70 group-hover:text-yellow-400 transition-colors">
                                            Data Provision History
                                        </span>
                                        <motion.div
                                            animate={{ rotate: logsOpen ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                            className="ml-auto"
                                        >
                                            <ChevronDown className="h-3.5 w-3.5 text-yellow-500/50" />
                                        </motion.div>
                                    </button>

                                    <AnimatePresence>
                                        {logsOpen && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: 'auto', opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                transition={{ duration: 0.3, ease: 'easeInOut' }}
                                                className="overflow-hidden"
                                            >
                                                <div className="mt-3 rounded-lg bg-black border border-yellow-500/10 p-3 max-h-48 overflow-y-auto">
                                                    {logsLoading ? (
                                                        <div className="flex items-center gap-2 text-yellow-500/50">
                                                            <span className="h-3 w-3 animate-spin rounded-full border border-yellow-500/50 border-t-transparent" />
                                                            <span className="text-[11px] font-mono">Fetching records...</span>
                                                        </div>
                                                    ) : logs.length === 0 ? (
                                                        <p className="text-[11px] font-mono text-gray-600">
                                                            No uploads recorded.
                                                        </p>
                                                    ) : (
                                                        <div className="space-y-1.5">
                                                            {logs.map((log, i) => (
                                                                <motion.div
                                                                    key={log.filename}
                                                                    initial={{ opacity: 0, x: -10 }}
                                                                    animate={{ opacity: 1, x: 0 }}
                                                                    transition={{ delay: i * 0.06 }}
                                                                    className="flex items-center gap-2 text-[11px] font-mono"
                                                                >
                                                                    <span className="text-green-500">{'>'}</span>
                                                                    <span className="text-yellow-300/80 flex-1 truncate">
                                                                        {formatLogDate(log.createdAt)}
                                                                    </span>
                                                                    <span className="text-gray-600 flex-shrink-0">
                                                                        {formatBytes(log.size)}
                                                                    </span>
                                                                    <span className="text-green-500/70 flex-shrink-0">
                                                                        OK
                                                                    </span>
                                                                </motion.div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </motion.div>
            )
            }
        </AnimatePresence >
    );
}
