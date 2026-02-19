# LottoVibe (Ad Lottery App)

A "Watch-to-Earn" lottery application built with Next.js, Tailwind CSS, and the Google IMA SDK.

## Features
- **Watch & Win**: Users watch video ads to earn lottery tickets.
- **Real Ad Integration**: Uses Google IMA SDK for professional video ad serving.
- **Robust Fallback**: Automatically switches to demo videos or simulation mode if ads fail to load (ensuring users always get rewarded).
- **Booster Mode**: Simulates 1.5x earning efficiency.
- **Premium UI**: Dark mode design with gold accents and animations.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) in your browser.

## Monetization Setup (Going Live)

Currently, the app uses a **Google Test Tag** so you can develop without violating policies. To earn real money:

1.  **Sign up for Google Ad Manager** or a similar video ad partner.
2.  **Create a Video Ad Unit** and get your **VAST Inspector Tag URL**.
3.  Open `lib/ad-config.ts`.
4.  Replace the `TEST_AD_TAG_URL` with your production URL:
    ```typescript
    export const AD_CONFIG = {
      // Replace this with your actual Ad Manager tag
      TEST_AD_TAG_URL: "https://pubads.g.doubleclick.net/..." 
    };
    ```
5.  **Deploy**: Your site must be on a public domain (not localhost) for real ads to serve.

## Technologies
- Next.js 16 (App Router)
- Tailwind CSS & Framer Motion
- Google IMA SDK
- Lucide React Icons
