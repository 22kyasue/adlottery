'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/Button';
import { Volume2, VolumeX, AlertCircle, Play, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';

interface VideoAdPlayerProps {
    onAdEnded: () => void;
    adSlotId?: string;
}

const AD_SOURCES = [
    "/ad_sample.mp4",
    "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    "https://www.w3schools.com/html/mov_bbb.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerJoyrides.mp4",
    "https://storage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4"
];

export function VideoAdPlayer({ onAdEnded, adSlotId }: VideoAdPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [sourceIndex, setSourceIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(true);
    const [progress, setProgress] = useState(0);
    const [timeLeft, setTimeLeft] = useState(15);
    const [status, setStatus] = useState<'loading' | 'ready' | 'playing' | 'error' | 'ended'>('loading');
    const [errorMsg, setErrorMsg] = useState<string | null>(null);
    const fallbackFiredRef = useRef(false);

    // Safety timeout: if no video starts playing within 5s, skip to simulation
    useEffect(() => {
        const timeout = setTimeout(() => {
            if (!fallbackFiredRef.current && status !== 'playing' && status !== 'ended') {
                console.warn('VideoAdPlayer timeout — skipping to simulation');
                fallbackFiredRef.current = true;
                setStatus('error');
                setErrorMsg('Ad timed out. Simulating reward...');
                startSimulationFallback();
            }
        }, 5000);
        return () => clearTimeout(timeout);
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // Attempt to load current source
    useEffect(() => {
        if (fallbackFiredRef.current) return;
        setStatus('loading');
        setProgress(0);
        setErrorMsg(null);
        if (videoRef.current) {
            videoRef.current.load();
        }
    }, [sourceIndex]);

    const handleCanPlay = () => {
        if (fallbackFiredRef.current) return;
        if (status === 'loading' || status === 'error') {
            setStatus('ready');
            attemptPlay();
        }
    };

    const attemptPlay = async () => {
        if (!videoRef.current) return;
        try {
            await videoRef.current.play();
            setIsPlaying(true);
            setStatus('playing');
        } catch (e: any) {
            console.warn("Autoplay blocked or failed:", e);
            // If it's a "NotAllowedError", it means user interaction is needed.
            // We stay in 'ready' state and show a Play button.
            if (e.name !== 'NotAllowedError') {
                handleError();
            }
        }
    };

    const handleError = () => {
        if (fallbackFiredRef.current) return;
        console.error(`Video source ${sourceIndex} failed.`);
        if (sourceIndex < AD_SOURCES.length - 1) {
            // Try next source
            setSourceIndex(prev => prev + 1);
        } else {
            // All sources failed
            setStatus('error');
            setErrorMsg("Ad failed to load. Simulating reward...");
            // Fallback: Simulate completion after a delay so user isn't stuck
            startSimulationFallback();
        }
    };

    const startSimulationFallback = () => {
        let mockProgress = 0;
        const interval = setInterval(() => {
            mockProgress += 10;
            setProgress(mockProgress);
            if (mockProgress >= 100) {
                clearInterval(interval);
                onAdEnded();
            }
        }, 500);
    };

    const handleTimeUpdate = () => {
        if (videoRef.current && status === 'playing') {
            const current = videoRef.current.currentTime;
            const duration = videoRef.current.duration;
            if (duration) {
                setProgress((current / duration) * 100);
                setTimeLeft(Math.max(0, Math.ceil(duration - current)));
            }
        }
    };

    const toggleMute = () => {
        if (videoRef.current) {
            videoRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    return (
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/10 shadow-2xl group">

            {/* Video Element */}
            {status !== 'error' && (
                <video
                    ref={videoRef}
                    src={AD_SOURCES[sourceIndex]}
                    className="w-full h-full object-cover"
                    onTimeUpdate={handleTimeUpdate}
                    onEnded={() => {
                        setStatus('ended');
                        onAdEnded();
                    }}
                    onCanPlay={handleCanPlay}
                    onError={handleError}
                    playsInline
                    muted={isMuted}
                // controls={false} 
                />
            )}

            {/* Loading State */}
            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-20">
                    <Loader2 className="w-10 h-10 text-yellow-500 animate-spin" />
                    <span className="ml-2 text-white font-medium">Loading Ad...</span>
                </div>
            )}

            {/* Play Button (if autoplay blocked) */}
            {status === 'ready' && !isPlaying && (
                <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40">
                    <button
                        onClick={attemptPlay}
                        className="rounded-full bg-yellow-500 p-4 text-black shadow-lg hover:scale-110 transition-transform animate-pulse"
                    >
                        <Play size={40} fill="currentColor" />
                    </button>
                </div>
            )}

            {/* Error / Fallback State */}
            {status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-gray-900 z-20 text-center p-4">
                    <AlertCircle className="w-12 h-12 text-red-500 mb-2" />
                    <p className="text-white font-bold">{errorMsg}</p>
                    <div className="w-full max-w-[200px] h-2 bg-gray-700 rounded-full mt-4 overflow-hidden">
                        <div
                            className="h-full bg-yellow-500 transition-all duration-500"
                            style={{ width: `${progress}%` }}
                        />
                    </div>
                </div>
            )}

            {/* Overlays (Only show when playing or ready) */}
            {(status === 'playing' || status === 'ready') && (
                <>
                    <div className="absolute top-4 right-4 z-10 flex gap-2">
                        <div className="bg-black/60 backdrop-blur-md text-white px-3 py-1 rounded-full text-xs font-mono border border-white/10">
                            Reward in: {timeLeft}s
                        </div>
                        <button
                            onClick={toggleMute}
                            className="bg-black/60 backdrop-blur-md p-1.5 rounded-full text-white hover:bg-white/20 transition-colors border border-white/10"
                        >
                            {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                        </button>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-10">
                        <div
                            className="h-full bg-yellow-500 transition-all duration-200 ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    <div className="absolute bottom-4 left-4 z-10">
                        <div className="text-[10px] text-white/50 bg-black/40 px-2 py-0.5 rounded">
                            Ad • Google Partner (Simulated)
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
