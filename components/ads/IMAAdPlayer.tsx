'use client';

import { useEffect, useRef, useState } from 'react';
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
    const [status, setStatus] = useState<'loading' | 'ready' | 'playing' | 'error'>('loading');

    useEffect(() => {
        // Load IMA SDK Script
        const script = document.createElement('script');
        script.src = 'https://imasdk.googleapis.com/js/sdkloader/ima3.js';
        script.async = true;
        script.onload = initIMA;
        script.onerror = () => {
            console.error("Failed to load IMA SDK");
            onAdError();
        };
        document.body.appendChild(script);

        return () => {
            if (document.body.contains(script)) {
                document.body.removeChild(script);
            }
            // Cleanup would ideally destroy adsLoader, etc.
        };
    }, []);

    const initIMA = () => {
        if (!window.google || !window.google.ima) {
            onAdError();
            return;
        }

        const google = window.google;
        const ima = google.ima;

        if (!adContainerRef.current || !videoRef.current) return;

        // Create the ad display container.
        const adDisplayContainer = new ima.AdDisplayContainer(
            adContainerRef.current,
            videoRef.current
        );

        // Initialize the container. Must be done via user action (which we are inside of, technically, 
        // but often browsers require a fresh click. We'll try auto first).
        adDisplayContainer.initialize();

        // Create ads loader.
        const adsLoader = new ima.AdsLoader(adDisplayContainer);

        // Listen and respond to ads loaded and error events.
        adsLoader.addEventListener(
            ima.AdsManagerLoadedEvent.Type.ADS_MANAGER_LOADED,
            (event: any) => onAdsManagerLoaded(event, ima, adDisplayContainer),
            false
        );
        adsLoader.addEventListener(
            ima.AdErrorEvent.Type.AD_ERROR,
            (event: any) => {
                console.error("IMA Ad Error:", event.getError());
                onAdError();
            },
            false
        );

        // Request video ads.
        const adsRequest = new ima.AdsRequest();
        adsRequest.adTagUrl = AD_CONFIG.TEST_AD_TAG_URL;

        // Specify the linear and nonlinear slot sizes. This helps the SDK to
        // select the correct ad if multiple are returned.
        const width = adContainerRef.current.clientWidth;
        const height = adContainerRef.current.clientHeight;
        adsRequest.linearAdSlotWidth = width;
        adsRequest.linearAdSlotHeight = height;

        adsRequest.nonLinearAdSlotWidth = width;
        adsRequest.nonLinearAdSlotHeight = height / 3;

        adsLoader.requestAds(adsRequest);
    };

    const onAdsManagerLoaded = (adsManagerLoadedEvent: any, ima: any, adDisplayContainer: any) => {
        const adsRenderingSettings = new ima.AdsRenderingSettings();
        const adsManager = adsManagerLoadedEvent.getAdsManager(
            videoRef.current,
            adsRenderingSettings
        );

        // Add listeners to the required events.
        adsManager.addEventListener(ima.AdErrorEvent.Type.AD_ERROR, (event: any) => {
            console.error("Ad Manager Error:", event.getError());
            onAdError();
        });

        adsManager.addEventListener(ima.AdEvent.Type.CONTENT_PAUSE_REQUESTED, () => {
            // This is where you'd pause your content if it was mixed.
            // For us, we only show ads.
            setStatus('playing');
        });

        adsManager.addEventListener(ima.AdEvent.Type.CONTENT_RESUME_REQUESTED, () => {
            // Ad finished
            onAdComplete();
        });

        adsManager.addEventListener(ima.AdEvent.Type.ALL_ADS_COMPLETED, () => {
            onAdComplete();
        });

        try {
            // Initialize the ads manager. Ad rules playlist will start at this time.
            const width = adContainerRef.current!.clientWidth;
            const height = adContainerRef.current!.clientHeight;
            adsManager.init(width, height, ima.ViewMode.NORMAL);

            // Call play to start showing the ad. Single video and overlay ads will
            // start at this time; the call will be ignored for ad rules.
            adsManager.start();
        } catch (adError) {
            // An error may be thrown if there was a problem with the VAST response.
            console.error("Ad Manager Start Error", adError);
            onAdError();
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
