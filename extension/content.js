// content.js - Safely alert the web page that the extension is ready
// Fire immediately
window.postMessage({ type: 'LOTTOVIBE_EXTENSION_READY' }, '*');
document.dispatchEvent(new CustomEvent('lottovibe-extension-ready'));

// Fire repeatedly for 5 seconds in case React is slow to mount
let pings = 0;
const pingInterval = setInterval(() => {
    window.postMessage({ type: 'LOTTOVIBE_EXTENSION_READY' }, '*');
    document.dispatchEvent(new CustomEvent('lottovibe-extension-ready'));
    pings++;
    if (pings > 10) clearInterval(pingInterval);
}, 500);

// Also respond to ping requests from React
window.addEventListener('message', (event) => {
    if (event.source !== window) return;
    if (event.data?.type === 'LOTTOVIBE_PING_EXTENSION') {
        window.postMessage({ type: 'LOTTOVIBE_EXTENSION_READY' }, '*');
        document.dispatchEvent(new CustomEvent('lottovibe-extension-ready'));
    }
});

// Listen for messages from the web page
window.addEventListener('message', (event) => {
    // Only accept messages from the same window
    if (event.source !== window) return;

    if (event.data && event.data.type === 'LOTTOVIBE_REQUEST_HISTORY') {
        // Forward the request to the background script
        chrome.runtime.sendMessage({ action: 'fetchHistory' }, (response) => {
            // Send the data back to the web page
            if (chrome.runtime.lastError) {
                window.postMessage({
                    type: 'LOTTOVIBE_HISTORY_ERROR',
                    error: chrome.runtime.lastError.message
                }, '*');
                return;
            }

            window.postMessage({
                type: 'LOTTOVIBE_HISTORY_DATA',
                data: response.history
            }, '*');
        });
    }
});
