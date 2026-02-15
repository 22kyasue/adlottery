export const AD_CONFIG = {
    // Google's Sample VAST Tag (Single Inline Video)
    // This tag always returns a valid video ad for testing.
    TEST_AD_TAG_URL: "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=",

    // In production, you would replace this with your actual AdSense/GAM tag
    // PRODUCTION_AD_TAG: process.env.NEXT_PUBLIC_GOOGLE_AD_TAG_URL
};
