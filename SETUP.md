# 45 Days — Deployment Guide

## Step 1: Supabase (free, ~5 min)

1. Go to **supabase.com** → Sign up → New Project
2. Name it `fitness-45`, choose a region close to you, set a DB password (save it)
3. Wait ~2 min for it to provision
4. Go to **SQL Editor** → paste the contents of `supabase-schema.sql` → Run
5. Go to **Settings → API** and copy:
   - `Project URL`  → this is your `SUPABASE_URL`
   - `anon public`  → this is your `SUPABASE_ANON_KEY`
   - `service_role` → this is your `SUPABASE_SERVICE_KEY` (keep private!)
6. Go to **Authentication → URL Configuration** → add your Vercel URL to Redirect URLs:
   `https://your-app.vercel.app`

---

## Step 2: GitHub Repo

1. Create a new repo: `fitness-45` (private)
2. Push this entire project folder to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin https://github.com/YOUR_USERNAME/fitness-45.git
   git push -u origin main
   ```

---

## Step 3: Vercel Deploy

1. Go to **vercel.com** → New Project → import your `fitness-45` repo
2. Framework Preset: **Other** (it's a static + serverless project)
3. Before deploying, go to **Environment Variables** and add all of these:

| Variable               | Value                                |
|------------------------|--------------------------------------|
| `SUPABASE_URL`         | From Step 1                          |
| `SUPABASE_ANON_KEY`    | From Step 1 (publishable / anon key) |
| `SUPABASE_SERVICE_KEY` | From Step 1 (service_role / secret)  |
| `ADMIN_EMAIL`          | Your email address                   |
| `APP_URL`              | `https://your-app.vercel.app`        |

4. Click **Deploy**

---

## Step 4: Update index.html constants

Open `index.html` and update the config block near the top of the `<script>` tag:

```javascript
const SUPABASE_URL  = 'https://xxxx.supabase.co';   // Your Supabase URL
const SUPABASE_ANON = 'sb_publishable_...';         // Your anon/publishable key
const ADMIN_EMAIL   = 'you@youremail.com';          // Your email
const START_DATE    = '2026-06-01';                 // Challenge start date (YYYY-MM-DD)
```

Commit and push → Vercel auto-deploys.

---

## Step 5: First Login (You)

1. Visit your Vercel URL
2. Enter your admin email → click Send Magic Link
3. Check email → click the link → you'll land on the onboarding screen
4. Fill out your profile → Start Challenge
5. Navigate to **Admin** tab → send invite to your coworker

---

## How Invites Work

- You enter their email in the Admin tab → click Send Invite
- They receive a Supabase magic-link email
- They click the link → create their profile → they're in
- You can see all members in the Admin tab

---

## File Structure

```
fitness-45/
├── index.html          ← Full SPA (all views)
├── vercel.json         ← Routing config
├── package.json        ← Dependencies
├── lib/
│   └── supabase.js     ← Server-side Supabase client
├── api/
│   ├── invite.js       ← POST: admin sends invite email
│   ├── profiles.js     ← GET all / POST own profile
│   ├── workouts.js     ← GET/POST/DELETE workouts
│   ├── weights.js      ← GET/POST weight entries
│   └── admin.js        ← GET invites + members list
└── supabase-schema.sql ← Run once in Supabase SQL Editor
```
