'use client';

import { useEffect, useRef, useCallback } from 'react';
import { motion, useMotionValue, animate } from 'framer-motion';
import { playTick } from '@/lib/audio';

// 20 segments: 9 black, 6 red, 1 gold, 4 green(house) — distributed non-consecutively
const SEGMENTS: Array<{ color: string; fill: string; stroke: string }> = [
    { color: 'black',  fill: '#1a1a2e', stroke: '#2a2a3e' },
    { color: 'red',    fill: '#b91c1c', stroke: '#dc2626' },
    { color: 'green',  fill: '#166534', stroke: '#22c55e' },
    { color: 'black',  fill: '#1a1a2e', stroke: '#2a2a3e' },
    { color: 'red',    fill: '#b91c1c', stroke: '#dc2626' },
    { color: 'black',  fill: '#1a1a2e', stroke: '#2a2a3e' },
    { color: 'green',  fill: '#166534', stroke: '#22c55e' },
    { color: 'black',  fill: '#1a1a2e', stroke: '#2a2a3e' },
    { color: 'red',    fill: '#b91c1c', stroke: '#dc2626' },
    { color: 'gold',   fill: '#a16207', stroke: '#eab308' },
    { color: 'black',  fill: '#1a1a2e', stroke: '#2a2a3e' },
    { color: 'red',    fill: '#b91c1c', stroke: '#dc2626' },
    { color: 'green',  fill: '#166534', stroke: '#22c55e' },
    { color: 'black',  fill: '#1a1a2e', stroke: '#2a2a3e' },
    { color: 'red',    fill: '#b91c1c', stroke: '#dc2626' },
    { color: 'black',  fill: '#1a1a2e', stroke: '#2a2a3e' },
    { color: 'green',  fill: '#166534', stroke: '#22c55e' },
    { color: 'black',  fill: '#1a1a2e', stroke: '#2a2a3e' },
    { color: 'red',    fill: '#b91c1c', stroke: '#dc2626' },
    { color: 'black',  fill: '#1a1a2e', stroke: '#2a2a3e' },
];

const SEGMENT_ANGLE = 360 / SEGMENTS.length; // 18 degrees each
const RADIUS = 120;
const CENTER = 140;
const BEZEL_OUTER = 132;
const BEZEL_INNER = 128;

interface RouletteWheelProps {
    resultColor: string | null;
    spinning: boolean;
    onSpinComplete: () => void;
}

function getSegmentPath(index: number): string {
    const startAngle = index * SEGMENT_ANGLE - 90;
    const endAngle = startAngle + SEGMENT_ANGLE;
    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;

    const x1 = CENTER + RADIUS * Math.cos(startRad);
    const y1 = CENTER + RADIUS * Math.sin(startRad);
    const x2 = CENTER + RADIUS * Math.cos(endRad);
    const y2 = CENTER + RADIUS * Math.sin(endRad);

    return `M ${CENTER} ${CENTER} L ${x1} ${y1} A ${RADIUS} ${RADIUS} 0 0 1 ${x2} ${y2} Z`;
}

// Pip dots on each segment for casino feel
function getSegmentPip(index: number): { x: number; y: number } {
    const angle = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
    const rad = (angle * Math.PI) / 180;
    const pipR = RADIUS * 0.88;
    return { x: CENTER + pipR * Math.cos(rad), y: CENTER + pipR * Math.sin(rad) };
}

export function RouletteWheel({ resultColor, spinning, onSpinComplete }: RouletteWheelProps) {
    const cumulativeRotation = useRef(0);
    const tickTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
    const rotateValue = useMotionValue(cumulativeRotation.current);

    const clearTicks = useCallback(() => {
        tickTimers.current.forEach(clearTimeout);
        tickTimers.current = [];
    }, []);

    useEffect(() => {
        return () => clearTicks();
    }, [clearTicks]);

    useEffect(() => {
        if (!spinning || !resultColor) return;

        const matchingIndices = SEGMENTS
            .map((s, i) => s.color === resultColor ? i : -1)
            .filter(i => i >= 0);

        const targetIndex = matchingIndices[Math.floor(Math.random() * matchingIndices.length)];
        const segmentCenterAngle = targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2;

        const fullSpins = (3 + Math.random() * 2) * 360;
        const targetRotation = cumulativeRotation.current + fullSpins + (360 - segmentCenterAngle);

        clearTicks();
        const spinDuration = 3500;
        let elapsed = 0;
        const scheduleTicks = () => {
            while (elapsed < spinDuration) {
                const progress = elapsed / spinDuration;
                const interval = 60 + progress * progress * 240;
                const t = elapsed;
                tickTimers.current.push(setTimeout(() => playTick(), t));
                elapsed += interval;
            }
        };
        scheduleTicks();

        const controls = animate(rotateValue, targetRotation, {
            duration: 3.5,
            ease: [0.15, 0.85, 0.35, 1.0],
            onComplete: () => {
                cumulativeRotation.current = targetRotation;
                onSpinComplete();
            },
        });

        return () => {
            controls.stop();
            clearTicks();
        };
    }, [spinning, resultColor]); // eslint-disable-line react-hooks/exhaustive-deps

    const labelForColor = (color: string) => {
        switch (color) {
            case 'black': return '2x';
            case 'red': return '3x';
            case 'gold': return '10x';
            default: return '';
        }
    };

    return (
        <div className="relative w-[280px] h-[280px] mx-auto">
            {/* Pointer at 12 o'clock — premium diamond */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1 z-10">
                <svg width="24" height="28" viewBox="0 0 24 28">
                    <defs>
                        <linearGradient id="pointer-grad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#ffd700" />
                            <stop offset="100%" stopColor="#b8860b" />
                        </linearGradient>
                    </defs>
                    <polygon points="12,28 2,2 12,6 22,2" fill="url(#pointer-grad)" stroke="#8B6914" strokeWidth="1" />
                </svg>
            </div>

            {/* Spinning wheel */}
            <motion.svg
                width="280"
                height="280"
                viewBox={`0 0 ${CENTER * 2} ${CENTER * 2}`}
                style={{
                    rotate: rotateValue,
                    filter: 'drop-shadow(0 0 16px rgba(212, 175, 55, 0.35)) drop-shadow(0 4px 20px rgba(0,0,0,0.5))',
                }}
            >
                <defs>
                    <radialGradient id="hub-gradient" cx="50%" cy="38%" r="55%">
                        <stop offset="0%" stopColor="#666" />
                        <stop offset="40%" stopColor="#333" />
                        <stop offset="100%" stopColor="#111" />
                    </radialGradient>
                    <radialGradient id="hub-ring" cx="50%" cy="50%" r="50%">
                        <stop offset="0%" stopColor="#d4af37" />
                        <stop offset="100%" stopColor="#8B6914" />
                    </radialGradient>
                    <linearGradient id="bezel-grad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#d4af37" />
                        <stop offset="30%" stopColor="#ffd700" />
                        <stop offset="50%" stopColor="#d4af37" />
                        <stop offset="70%" stopColor="#ffd700" />
                        <stop offset="100%" stopColor="#b8860b" />
                    </linearGradient>
                </defs>

                {/* Outer bezel — thick gold ring with sheen */}
                <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={BEZEL_OUTER}
                    fill="none"
                    stroke="url(#bezel-grad)"
                    strokeWidth="6"
                />
                {/* Inner bezel edge */}
                <circle
                    cx={CENTER}
                    cy={CENTER}
                    r={BEZEL_INNER}
                    fill="none"
                    stroke="#8B6914"
                    strokeWidth="1"
                    opacity="0.6"
                />

                {/* Segments */}
                {SEGMENTS.map((seg, i) => (
                    <path
                        key={i}
                        d={getSegmentPath(i)}
                        fill={seg.fill}
                        stroke={seg.stroke}
                        strokeWidth="0.5"
                        opacity={0.95}
                    />
                ))}

                {/* Segment divider lines — gold */}
                {SEGMENTS.map((_, i) => {
                    const angle = i * SEGMENT_ANGLE - 90;
                    const rad = (angle * Math.PI) / 180;
                    const x1 = CENTER + 28 * Math.cos(rad);
                    const y1 = CENTER + 28 * Math.sin(rad);
                    const x2 = CENTER + RADIUS * Math.cos(rad);
                    const y2 = CENTER + RADIUS * Math.sin(rad);
                    return (
                        <line
                            key={`div-${i}`}
                            x1={x1} y1={y1} x2={x2} y2={y2}
                            stroke="#d4af37"
                            strokeWidth="0.5"
                            opacity="0.3"
                        />
                    );
                })}

                {/* Pip dots at outer edge */}
                {SEGMENTS.map((seg, i) => {
                    const { x, y } = getSegmentPip(i);
                    return (
                        <circle
                            key={`pip-${i}`}
                            cx={x}
                            cy={y}
                            r="2"
                            fill={seg.color === 'gold' ? '#ffd700' : '#d4af37'}
                            opacity={seg.color === 'gold' ? 0.9 : 0.4}
                        />
                    );
                })}

                {/* Segment labels */}
                {SEGMENTS.map((seg, i) => {
                    const angle = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
                    const rad = (angle * Math.PI) / 180;
                    const labelR = RADIUS * 0.6;
                    const x = CENTER + labelR * Math.cos(rad);
                    const y = CENTER + labelR * Math.sin(rad);
                    const label = labelForColor(seg.color);
                    return (
                        <text
                            key={`label-${i}`}
                            x={x}
                            y={y}
                            textAnchor="middle"
                            dominantBaseline="central"
                            fill={seg.color === 'gold' ? '#ffd700' : '#fff'}
                            fontSize="8"
                            fontWeight="bold"
                            transform={`rotate(${angle + 90}, ${x}, ${y})`}
                            opacity={label ? 0.85 : 0}
                        >
                            {label}
                        </text>
                    );
                })}

                {/* Center hub — 3D convex with gold ring */}
                <circle cx={CENTER} cy={CENTER} r="28" fill="url(#hub-ring)" opacity="0.8" />
                <circle cx={CENTER} cy={CENTER} r="25" fill="url(#hub-gradient)" stroke="#d4af37" strokeWidth="1.5" />
                <text x={CENTER} y={CENTER - 3} textAnchor="middle" dominantBaseline="central" fill="#d4af37" fontSize="8" fontWeight="bold" letterSpacing="2">
                    VIBE
                </text>
                <text x={CENTER} y={CENTER + 7} textAnchor="middle" dominantBaseline="central" fill="#d4af37" fontSize="5" fontWeight="bold" opacity="0.5" letterSpacing="1">
                    CASINO
                </text>
            </motion.svg>
        </div>
    );
}
