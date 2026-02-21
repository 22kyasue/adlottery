# Authentication Brainstorm — AdLottery

## Current State

- Supabase client + admin SDK configured
- `supabaseClient.auth.getUser()` called in `watchAd()`
- Database schema with `users` table (UUID PK, vibe_chips, vibe_coins, shadowban)
- RLS policies scoped to authenticated users
- **Zero login/signup UI** — users can never actually authenticate

---

## Decision Points

### 1. Auth Methods — How do users sign in?

| Option               | Pros                                      | Cons                                        |
| -------------------- | ----------------------------------------- | ------------------------------------------- |
| Email + Password     | Simple, universal                         | Friction (email verification), spam risk    |
| Magic Link (email)   | No password to remember, low friction     | Depends on email delivery speed             |
| Social OAuth (Google, Apple, LINE) | One-tap login, high conversion | Setup per provider, platform dependencies |
| Phone/SMS OTP        | Great for Japan market (LINE-centric)     | SMS costs, Supabase SMS pricing             |
| Anonymous → upgrade  | Zero friction start, convert later        | Complex state migration, ghost accounts     |

### 2. UX Flow — When does auth happen?

| Option              | Description                                                        |
| ------------------- | ------------------------------------------------------------------ |
| Gate at launch      | Login screen before anything — forces auth upfront                 |
| Gate at action      | Let users browse freely, require login when they watch ad / earn   |
| Soft onboarding     | Start anonymous, prompt to "save progress" after first ticket      |

### 3. UI Approach — What does the auth screen look like?

| Option                | Description                                              |
| --------------------- | -------------------------------------------------------- |
| Full-page auth screen | Dedicated `/login` and `/signup` routes                  |
| Bottom sheet / modal  | Auth overlay that slides up without leaving the game     |
| Inline within page    | Embedded form on the home page itself                    |

### 4. Session Management

| Option                        | Description                                                  |
| ----------------------------- | ------------------------------------------------------------ |
| Supabase built-in (cookie/JWT)| Default — session persists via `@supabase/ssr` (already installed) |
| Custom token handling         | More control, more work                                      |

### 5. Post-Auth Data Migration

| Option                         | Description                                              |
| ------------------------------ | -------------------------------------------------------- |
| Wipe localStorage on login     | Clean slate from DB                                      |
| Migrate localStorage → Supabase| Merge local tickets into DB record                       |
| Ignore migration               | New authenticated users start clean (simplest)           |

---

## Recommended Starting Point

For a lottery/ad-reward app targeting Japan:

1. **Google OAuth + Email/Password** — covers most users
2. **Gate at action** — let them see the prize pool / UI first to build interest
3. **Bottom sheet modal** — keeps the mobile-app feel, no page navigation
4. **Supabase built-in sessions** — `@supabase/ssr` is already installed
5. **Fresh start** — new authenticated users start with clean DB state

---

## Implementation Steps

### Step 1: Configure Supabase Auth Providers
- Enable Email/Password provider in Supabase dashboard
- Enable Google OAuth provider in Supabase dashboard
- Set redirect URLs for OAuth callbacks

### Step 2: Create Auth Utility Helpers
- Build a Supabase browser client helper using `@supabase/ssr`
- Build a Supabase server client helper for SSR/API routes
- Add auth state listener for session changes

### Step 3: Build the Auth UI Components
- Create `AuthModal` component (bottom sheet style with framer-motion)
- Add email/password form (login + signup toggle)
- Add "Sign in with Google" button
- Add form validation and error display

### Step 4: Integrate Auth Modal into Game Flow
- Add auth state to `GameContext` (currentUser, isAuthenticated)
- Trigger auth modal when unauthenticated user tries to watch ad
- Show user info / logout button in the UI header

### Step 5: Handle Auth Callback Route
- Create `/auth/callback/route.ts` to exchange OAuth code for session
- Handle redirect back to main page after login

### Step 6: Create User Record on First Login
- After successful auth, check if `users` row exists in DB
- If not, insert a new row with default values (0 chips, 0 coins)
- Link Supabase auth UUID to the `users` table

### Step 7: Protect API Routes
- Update `/api/verify-ad` to validate session server-side (not just user ID)
- Reject requests with no valid session

### Step 8: Update GameContext to Use Auth State
- Replace localStorage-only state with Supabase-synced state
- Load user's tickets/state from DB on login
- Save state changes to DB (or queue them)

### Step 9: Add Logout Flow
- Add logout button to UI
- Clear local session on logout
- Redirect to home / show logged-out state

### Step 10: Test End-to-End
- Test email signup → verify → login → watch ad → earn ticket
- Test Google OAuth flow
- Test session persistence (close browser, reopen)
- Test logout and re-login
- Test unauthenticated user blocked from earning
