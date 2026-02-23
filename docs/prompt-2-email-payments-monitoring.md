I need you to integrate 3 production services into my Next.js app. The scaffolding code already exists — you need to replace the console.log stubs with real API calls.

4. Email notifications — lib/email.ts

Pick whichever email provider I already have an account for (SendGrid, Resend, or Mailgun). If none, use Resend (free tier, easiest setup).

- Install the SDK (e.g., npm install resend)
- Add the API key to my environment variables (e.g., RESEND_API_KEY)
- Open lib/email.ts and replace the sendEmail() stub function with a real call to the provider
- The three exported functions (sendWinnerNotification, sendPayoutConfirmation, sendPayoutExpiryWarning) already format the subject/body — just wire up the transport
- Set the "from" address to something like noreply@<my-domain> (or the provider's default sandbox sender for testing)
- Test by calling sendWinnerNotification with my email and confirming I receive it

5. Payment processing — lib/payment-processor.ts

Open lib/payment-processor.ts. It has a processPayment() function with PayPal and Wise stubs. Wire up whichever I'm using:

If PayPal:
- Install @paypal/payouts-sdk
- Add PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET to env
- Replace the PayPal stub with a real Payouts API call that sends JPY to the user's PayPal email
- Return { success: true, method: 'paypal', transactionId: <from PayPal response> }

If Wise:
- Use their REST API with fetch (no SDK needed)
- Add WISE_API_TOKEN to env
- Replace the Wise stub with: create quote → create recipient → create transfer → fund transfer
- Return { success: true, method: 'wise', transactionId: <transfer ID> }

If neither account exists yet, just set up PayPal sandbox mode so I can test the flow end-to-end, and leave a comment showing what to change for production.

6. Error monitoring — lib/monitoring.ts

Set up Sentry (free tier):
- Install @sentry/nextjs
- Run npx @sentry/wizard@latest -i nextjs if that helps with setup
- Add SENTRY_DSN to env
- Open lib/monitoring.ts and replace the three stub functions:
  - captureError() → Sentry.captureException()
  - captureEvent() → Sentry.captureMessage() with the severity level
  - alertCritical() → Sentry.captureMessage() with fatal level + set up a Sentry alert rule to notify me on fatal events
- Verify by triggering a test error and confirming it shows up in the Sentry dashboard
