import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { VideoAdPlayer } from './ads/VideoAdPlayer';
import { IMAAdPlayer } from './ads/IMAAdPlayer';

interface AdOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onComplete: () => void;
}

export function AdOverlay({ isOpen, onClose, onComplete }: AdOverlayProps) {
    const [step, setStep] = useState<'watching' | 'reward'>('watching');
    const [activePlayer, setActivePlayer] = useState<'ima' | 'fallback'>('ima');

    useEffect(() => {
        if (isOpen) {
            setStep('watching');
            setActivePlayer('ima');
        }
    }, [isOpen]);

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
                >
                    <div className="w-full max-w-md p-6 text-center">
                        {step === 'watching' ? (
                            <div className="space-y-6">
                                <div className="relative mx-auto w-full max-w-lg aspect-video rounded-xl bg-black border border-white/10 shadow-2xl overflow-hidden">
                                    {activePlayer === 'ima' ? (
                                        <IMAAdPlayer
                                            onAdComplete={() => {
                                                setStep('reward');
                                                onComplete();
                                            }}
                                            onAdError={() => {
                                                console.log("IMA failed, switching to fallback");
                                                setActivePlayer('fallback');
                                            }}
                                        />
                                    ) : (
                                        <VideoAdPlayer onAdEnded={() => {
                                            setStep('reward');
                                            onComplete();
                                        }} />
                                    )}
                                </div>
                                <h2 className="text-xl font-bold text-white">Watching Ad...</h2>
                                <p className="text-sm text-gray-400">
                                    {activePlayer === 'ima' ? 'Verifying Ad...' : 'Simulating Reward...'}
                                </p>
                            </div>
                        ) : (
                            <motion.div
                                initial={{ scale: 0.8, opacity: 0 }}
                                animate={{ scale: 1, opacity: 1 }}
                                className="space-y-6"
                            >
                                <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-500/20 text-green-500">
                                    <CheckCircle className="h-10 w-10" />
                                </div>
                                <h2 className="text-3xl font-bold text-white">Reward Unlocked!</h2>
                                <p className="text-gray-300">Run complete. Tickets added to your wallet.</p>
                                <Button variant="gold" size="lg" onClick={onClose} className="w-full">
                                    Collect Reward
                                </Button>
                            </motion.div>
                        )}
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
