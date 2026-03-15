const TEST_AD_TAG_URL = "https://pubads.g.doubleclick.net/gampad/ads?iu=/21775744923/external/single_ad_samples&sz=640x480&cust_params=sample_ct%3Dlinear&ciu_szs=300x250%2C728x90&gdfp_req=1&output=vast&unviewed_position_start=1&env=vp&impl=s&correlator=";

export const AD_CONFIG = {
    // Uses production ad tag if set, otherwise falls back to Google's test VAST tag
    AD_TAG_URL: process.env.NEXT_PUBLIC_GOOGLE_AD_TAG_URL || TEST_AD_TAG_URL,

    // Kept for explicit test usage (e.g. dev mode, staging)
    TEST_AD_TAG_URL,
};
