const puppeteer = require('puppeteer');
const path = require('path');

async function runTest() {
    const extensionPath = path.join(__dirname, 'extension');
    console.log('--- LOTTOVIBE AUTO-BOOSTER EXTENSION TEST ---');
    console.log('Loading unpacked extension from:', extensionPath);

    const browser = await puppeteer.launch({
        headless: false, // Opens visible Chrome instance
        defaultViewport: null,
        args: [
            `--disable-extensions-except=${extensionPath}`,
            `--load-extension=${extensionPath}`,
            '--start-maximized'
        ]
    });

    try {
        const page = await browser.newPage();
        console.log('Navigating to http://localhost:3000 ...');

        // We expect the Next.js dev server to be running on 3000
        await page.goto('http://localhost:3000');

        // Wait for the app to load
        await new Promise(r => setTimeout(r, 2000));

        console.log('\n=======================================');
        console.log('🎉 THE BROWSER IS NOW OPEN ON YOUR SCREEN!');
        console.log('=======================================');
        console.log('1. Go to the new Chromium window that just popped up.');
        console.log('2. Click on the "Booster Mode" card.');
        console.log('3. You should instantly see "Extension Active!" (injected by our Chrome Extension).');
        console.log('4. Click "1-Click Auto Activate".');
        console.log('5. Watch the app securely pull your browser history payload automatically!');
        console.log('\nNote: This script will keep the browser open until you manually close it.');

        // Removed browser.close() so the user can interact visually!

    } catch (err) {
        console.error('Test error:', err);
    }
}

runTest();
