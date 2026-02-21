'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Loader2 } from 'lucide-react';
import { AD_CONFIG } from '@/lib/ad-config';

interface IMAAdPlayerProps {
    onAdComplete: () => void;
    onAdError: () => void;
}

declare global {
    interface Window {
        google: any;
    }
}

export function IMAAdPlayer({ onAdComplete, onAdError }: IMAAdPlayerProps) {
    const adContainerRef = useRef<HTMLDivElement>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState<'loading' | 'playing' | 'error'>('loading');

    // Use refs for callbacks to avoid stale closures in IMA event listeners
    const onAdCompleteRef = useRef(onAdComplete);
    const onAdErrorRef = useRef(onAdError);
    const errorFiredRef = useRef(false);

    useEffect(() => { onAdCompleteRef.current = onAdComplete; }, [onAdComplete]);
    useEffect(() => { onAdErrorRef.current = onAdError; }, [onAdError]);

    const fireError = useCallback(() => {
        if (errorFiredRef.current) return; // prevent double-fire
        errorFiredRef.current = true;
        setStatus('error');
        onAdErrorRef.current();
    }, []);

    const fireComplete = useCallback(() => {
        if (errorFiredRef.current) return;
        onAdCompleteRef.current();
    }, []);

    useEffect(() => {
        // Safety timeout: if IMA doesn't load/play within 5 seconds, bail to fallback
        const timeout = setTimeout(() => {
            if (!errorFiredRef.current) {
                console.warn('IMA timeout — switching to fallback');
                fireError();
            }
        }, 5000);

        // Load IMA SDK script
        const script = document.createElement('script');
        script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
        script.async = true;

        script.onerror = () => {
            console.error('Failed to load IMA SDK script');
            fireError();
        };

        script.onload = () => {
            try {
                initIMA();
            } catch (e) {
                console.error('IMA init threw:', e);
                fireError();
            }
        };

        document.body.appendChild(script);

        return () => {
            clearTimeout(timeout);
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const initIMA = () => {
        if (!window.google?.ima) {
            console.error('IMA SDK not available on window');
            fireError();
            return;
        }

        if (!adContainerRef.current || !videoRef.current) {
            console.error('Ad container or video ref not ready');
            fireError();
            return;
        }

        const ima = window.google.ima;

        try {
            const adDisplayContainer = new ima.AdDisplayContainer(
                adContainerRef.current,
                videoRef.current
            );
            adDisplayContainer.initialize();

            const adsLoader = new ima.AdsLoader(adDisplayContainer);

            adsLoader.addEventListener(
                ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
                (event: any) => {
                    try {
                        onAdsManagerLoaded(event, ima);
                    } catch (e) {
                        console.error('Ads manager setup threw:', e);
                        fireError();
                    }
                },
                false
            );

            adsLoader.addEventListener(
                ima.AdErrorEvent.Type.AD_ERROR,
                (event: any) => {
                    console.error('IMA AdsLoader error:', event.getError());
                    fireError();
                },
                false
            );

            const adsRequest = new ima.AdsRequest();
            adsRequest.adTagUrl = AD_CONFIG.TEST_AD_TAG_URL;

            const width = adContainerRef.current.clientWidth || 640;
            const height = adContainerRef.current.clientHeight || 360;
            adsRequest.linearAdSlotWidth = width;
            adsRequest.linearAdSlotHeight = height;
            adsRequest.nonLinearAdSlotWidth = width;
            adsRequest.nonLinearAdSlotHeight = height / 3;

            adsLoader.requestAds(adsRequest);
        } catch (e) {
            console.error('IMA setup error:', e);
            fireError();
        }
    };

    const onAdsManagerLoaded = (adsManagerLoadedEvent: any, ima: any) => {
        const adsRenderingSettings = new ima.AdsRenderingSettings();
        const adsManager = adsManagerLoadedEvent.getAdsManager(
            videoRef.current,
            adsRenderingSettings
        );

        adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (event: any) => {
            console.error('Ad Manager Error:', event.getError());
            fireError();
        });

        adsManager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
            setStatus('playing');
        });

        adsManager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
            fireComplete();
        });

        adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
            fireComplete();
        });

        try {
            const width = adContainerRef.current?.clientWidth || 640;
            const height = adContainerRef.current?.clientHeight || 360;
            adsManager.init(width, height, ima.ViewMode.NORMAL);
            adsManager.start();
        } catch (adError) {
            console.error('Ad Manager start error:', adError);
            fireError();
        }
    };

    return (
        <div className="relative w-full aspect-video bg-black rounded-lg overflow-hidden border border-white/10 shadow-2xl">
            <video
                ref={videoRef}
                className="absolute inset-0 w-full h-full"
            />
            <div
                ref={adContainerRef}
                className="absolute inset-0 w-full h-full z-10"
            />

            {status === 'loading' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-0">
                    <Loader2 className="w-8 h-8 text-white animate-spin" />
                </div>
            )}
        </div>
    );
}
