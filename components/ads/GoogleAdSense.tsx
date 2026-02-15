'use client';

import { useEffect } from 'react';

declare global {
    interface Window {
        adsbygoogle: any[];
    }
}

interface GoogleAdSenseProps {
    client: string; // "ca-pub-XXXXXXXXXXXXXXXX"
    slot: string;   // Ad Slot ID
    format?: 'auto' | 'rectangle' | 'horizontal';
    isResponsive?: boolean;
}

export function GoogleAdSense({ client, slot, format = 'auto', isResponsive = true }: GoogleAdSenseProps) {
    useEffect(() => {
        try {
            (window.adsbygoogle = window.adsbygoogle || []).push({});
        } catch (e) {
            console.error("AdSense Error", e);
        }
    }, []);

    return (
        <div className="google-adsense-container my-4 text-center">
            <ins
                className="adsbygoogle"
                style={{ display: 'block' }}
                data-ad-client={client}
                data-ad-slot={slot}
                data-ad-format={format}
                data-full-width-responsive={isResponsive ? "true" : "false"}
            />
            <div className="text-xs text-gray-500 mt-1">Advertisement</div>
        </div>
    );
}
