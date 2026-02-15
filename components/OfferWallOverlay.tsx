'use client';

import { X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import OfferList from './OfferList';

interface OfferWallOverlayProps {
    isOpen: boolean;
    onClose: () => void;
}

export function OfferWallOverlay({ isOpen, onClose }: OfferWallOverlayProps) {
    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                    />

                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-white rounded-3xl shadow-2xl"
                    >
                        {/* Header */}
                        <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 bg-white/90 backdrop-blur-md border-b">
                            <div>
                                <h2 className="text-xl font-black text-gray-900">Task Center</h2>
                                <p className="text-xs text-gray-500">Complete tasks to earn tickets</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <X className="h-6 w-6 text-gray-500" />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="p-6">
                            <OfferList />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
}
