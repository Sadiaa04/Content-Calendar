# Content Calendar

Plan when to film, edit and post each Reel. Works as a website and installs on your phone like an app. Syncs between phone and laptop.

**What it does**

- **Up next**: every video sorted by the step that's due next (film, edit or post). Tap a step to tick it off.
- **Month**: the whole month at a glance, colour-coded by step.
- **Posted**: everything you've published.
- **Captions & keywords** for each video, with one-tap copy as `caption` + `{keyword, keyword}`.
- **Reminders**: sends film, edit and post days to your phone's Calendar app with an alert.
- Works offline. Changes on one device appear on the other.

---

## Setup (about 15 minutes, all free)

### 1. Turn on the website (GitHub Pages)

1. Open the repo on GitHub → **Settings** → **Pages**.
2. Under **Build and deployment → Source**, choose **GitHub Actions**.
3. Go to the **Actions** tab. When the "Deploy to GitHub Pages" run turns green, your site is live at
   `https://<your-username>.github.io/<repo-name>/`

At this point the app already works, but saves on that one device only.

### 2. Turn on sync (Supabase)

1. Sign up at [supabase.com](https://supabase.com) and create a **New project** (any name, pick the region closest to you, e.g. Mumbai).
2. Left sidebar → **SQL Editor** → **New query**. Paste everything from `supabase/schema.sql` and press **Run**.
3. Left sidebar → **Authentication** → **URL Configuration**. Set **Site URL** to your GitHub Pages address from step 1.
4. Left sidebar → **Project Settings** → **API**. Copy the **Project URL** and the **anon public** key.
5. On GitHub, open `config.js`, click the pencil icon, paste the two values between the quotes, and **Commit changes**.

```js
export const SUPABASE_URL = "https://abcd1234.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOi...";
```

The site redeploys by itself in about a minute. Open it, tap **Create account**, confirm the email Supabase sends you, then sign in on your phone and laptop with the same email and password.

> The anon key is designed to be public. Your videos are protected by the security rules in `schema.sql`: each account can only see its own rows.

### 3. Put it on your phone

- **iPhone**: open the site in **Safari** → Share → **Add to Home Screen**.
- **Android**: open in **Chrome** → ⋮ menu → **Install app**.

### 4. Reminders

Tap the settings button (top right) → choose what time you usually film and edit, and how early you want the alert → **Add all upcoming to my calendar**. On your phone, pick **Calendar** from the share sheet. Each video's own **Edit → Add reminders** does the same for one video. If you change dates later, add them again; your calendar updates the existing events instead of duplicating them.

---

## Making changes

All the code is plain HTML, CSS and JavaScript. Nothing to install or build.

| File | What's in it |
| --- | --- |
| `index.html` | Page shell |
| `styles.css` | Colours, fonts, layout (colour tokens at the top) |
| `app.js` | Screens and behaviour (video types list is `KINDS` at the top) |
| `store.js` | Saving and syncing |
| `ics.js` | Calendar reminders |
| `sw.js` | Offline support. **Bump `VERSION` after any change** so installed apps update. |

To try it on your computer: run `python3 -m http.server 8000` in this folder and open http://localhost:8000.

## Turning it into a product later

The app already supports separate accounts, so other creators could sign up today. Things to add before charging money:

- Payments (Stripe or Razorpay) and a `plan` column on the user.
- Real push notifications (Supabase Edge Function + a scheduled job).
- Your own domain, a privacy policy and terms.
- App Store / Play Store listing by wrapping the site with Capacitor, if you want it in the stores.
