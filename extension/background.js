// background.js

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'fetchHistory') {
        const thirtyDaysAgo = new Date().getTime() - (30 * 24 * 60 * 60 * 1000);

        // Fetch up to 5000 history items from the last 30 days
        chrome.history.search({
            text: '',
            startTime: thirtyDaysAgo,
            maxResults: 5000
        }, (results) => {
            sendResponse({ history: results });
        });

        // Return true to indicate asynchronous response
        return true;
    }
});
