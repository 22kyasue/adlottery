'use client';

import { motion } from 'framer-motion';

interface CardFaceProps {
    value: number | null;
    suit?: number; // 0-3 override; when omitted falls back to deterministic (value-1)%4
    faceDown?: boolean;
    size?: 'sm' | 'md' | 'lg';
}

const RANK_MAP: Record<number, string> = {
    1: 'A', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
    8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K',
};

const SUIT_SYMBOLS = ['\u2660', '\u2665', '\u2666', '\u2663']; // spade, heart, diamond, club

const SIZE_CLASSES = {
    sm: 'w-16 h-24',
    md: 'w-24 h-36',
    lg: 'w-32 h-48',
};

const RANK_SIZE = {
    sm: 'text-lg',
    md: 'text-3xl',
    lg: 'text-4xl',
};

const SUIT_CENTER_SIZE = {
    sm: 'text-xs',
    md: 'text-base',
    lg: 'text-xl',
};

const CORNER_SIZE = {
    sm: 'text-[8px] leading-[10px]',
    md: 'text-[10px] leading-[12px]',
    lg: 'text-xs leading-[14px]',
};

export function CardFace({ value, suit: suitOverride, faceDown = false, size = 'md' }: CardFaceProps) {
    const rank = value ? RANK_MAP[value] ?? '?' : '?';
    const suitIndex = suitOverride ?? (value ? (value - 1) % 4 : 0);
    const suit = value ? SUIT_SYMBOLS[suitIndex] : '';
    const isRed = suit === '\u2665' || suit === '\u2666';
    const suitColor = isRed ? 'text-red-600' : 'text-gray-800';

    return (
        <div className={`relative ${SIZE_CLASSES[size]}`} style={{ perspective: '600px' }}>
            <motion.div
                className="absolute inset-0"
                animate={{ rotateY: faceDown ? 180 : 0 }}
                transition={{ duration: 0.5, ease: 'easeInOut' }}
                style={{ transformStyle: 'preserve-3d' }}
            >
                {/* Front face — white card, red/black suits */}
                <div
                    className="absolute inset-0 rounded-xl bg-white flex flex-col items-center justify-center"
                    style={{
                        backfaceVisibility: 'hidden',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.25), 0 0 0 1px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                    }}
                >
                    {/* Top-left corner index */}
                    <div className={`absolute top-1.5 left-2 flex flex-col items-center ${CORNER_SIZE[size]} font-bold ${suitColor}`}>
                        <span>{rank}</span>
                        <span className="-mt-0.5">{suit}</span>
                    </div>

                    {/* Center rank + suit */}
                    <span className={`font-black leading-none ${RANK_SIZE[size]} ${suitColor}`}>
                        {rank}
                    </span>
                    <span className={`${SUIT_CENTER_SIZE[size]} mt-0.5 ${suitColor} opacity-70`}>
                        {suit}
                    </span>

                    {/* Bottom-right corner index (rotated) */}
                    <div className={`absolute bottom-1.5 right-2 flex flex-col items-center ${CORNER_SIZE[size]} font-bold ${suitColor} rotate-180`}>
                        <span>{rank}</span>
                        <span className="-mt-0.5">{suit}</span>
                    </div>
                </div>

                {/* Back face (gold foil with hatch) */}
                <div
                    className="absolute inset-0 rounded-xl flex items-center justify-center"
                    style={{
                        backfaceVisibility: 'hidden',
                        transform: 'rotateY(180deg)',
                        background: 'linear-gradient(135deg, #b8860b, #daa520 30%, #ffd700 50%, #daa520 70%, #b8860b)',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3), 0 0 0 1px rgba(184,134,11,0.5), inset 0 1px 0 rgba(255,255,255,0.2)',
                    }}
                >
                    <div
                        className="w-[72%] h-[72%] rounded-lg flex items-center justify-center"
                        style={{
                            border: '1px solid rgba(255, 215, 0, 0.3)',
                            background: `
                                repeating-linear-gradient(
                                    45deg,
                                    rgba(139, 90, 0, 0.25),
                                    rgba(139, 90, 0, 0.25) 2px,
                                    transparent 2px,
                                    transparent 5px
                                ),
                                repeating-linear-gradient(
                                    -45deg,
                                    rgba(139, 90, 0, 0.25),
                                    rgba(139, 90, 0, 0.25) 2px,
                                    transparent 2px,
                                    transparent 5px
                                ),
                                rgba(184, 134, 11, 0.3)
                            `,
                        }}
                    >
                        <span className="text-yellow-100/60 text-lg font-black tracking-wider drop-shadow-sm">LV</span>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
