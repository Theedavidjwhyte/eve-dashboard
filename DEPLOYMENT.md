# E.V.E — Deployment Guide

## Overview

E.V.E is a static React app. It deploys to **Azure Static Web Apps** (free tier)
and uses **Supabase** (free tier) for shared team data.

Once set up, the full flow is:
1. You push code to GitHub → Azure auto-deploys → team opens the URL
2. You import Salesforce data in the app → Supabase stores it → whole team sees it instantly
3. Any AD updates notes, reviews, or flags → syncs to everyone within 5 minutes

---

## Step 1 — Push to GitHub

```bash
git init                          # if not already a git repo
git add .
git commit -m "Initial E.V.E commit"
git remote add origin https://github.com/YOUR_ORG/eve-dashboard.git
git push -u origin main
```

---

## Step 2 — Create Azure Static Web App

1. Go to [portal.azure.com](https://portal.azure.com)
2. Search **"Static Web Apps"** → Create
3. Fill in:
   - **Subscription:** your Access Group subscription
   - **Resource Group:** create new → `rg-eve-dashboard`
   - **Name:** `eve-dashboard`
   - **Region:** UK South
   - **Source:** GitHub → authorise → select your repo → branch: `main`
   - **Build Details:**
     - App location: `frontend`
     - Output location: `dist`
     - API location: *(leave blank)*
4. Click **Review + Create → Create**
5. After deployment, go to the resource → copy the **Deployment Token**
6. In GitHub → repo Settings → Secrets → Actions → New secret:
   - Name: `AZURE_STATIC_WEB_APPS_API_TOKEN`
   - Value: *(paste the token)*
7. Your app is now live at `https://YOUR-APP.azurestaticapps.net`

---

## Step 3 — Create Supabase Project

1. Go to [supabase.com](https://supabase.com) → New Project
2. Fill in:
   - **Name:** `eve-dashboard`
   - **Database password:** save this somewhere secure
   - **Region:** West Europe (closest to UK)
3. Once created, go to **SQL Editor** → paste the entire contents of `supabase/schema.sql` → Run
4. Go to **Settings → API** → copy:
   - **Project URL** (looks like `https://xxxx.supabase.co`)
   - **anon/public key** (the long JWT)

---

## Step 4 — Connect Supabase to Azure

In Azure Portal → your Static Web App → **Configuration** → Add these:

| Name | Value |
|------|-------|
| `VITE_SUPABASE_URL` | `https://xxxx.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` (the anon key) |

Click Save → the app will redeploy automatically with the credentials baked in.

---

## Step 5 — Enable Realtime (optional but recommended)

For changes to appear instantly across all open browsers (without waiting for the 5-minute poll):

1. In Supabase → **Database → Replication**
2. Enable for these tables:
   - `eve_deals`
   - `eve_notes`
   - `eve_commit_notes`
   - `eve_commit_company`
   - `eve_lost_reviews`
   - `eve_svc_required`
   - `eve_budget_targets`

---

## Step 6 — Share with the team

Send the team your Azure URL: `https://eve-dashboard.azurestaticapps.net`

That's it. They open it in any browser — no install, no download.

---

## Optional — Custom Domain (e.g. eve.accessgroup.com)

1. Azure Static Web Apps → Custom Domains → Add
2. Add a CNAME record in your DNS: `eve` → `YOUR-APP.azurestaticapps.net`
3. Azure will auto-provision an SSL certificate

---

## Optional — Azure AD / SSO Login

To restrict access to Access Group staff only:

1. Static Web App → Settings → Authentication
2. Add provider → Microsoft (Azure AD)
3. Create an App Registration in your Azure AD tenant
4. Add the client ID and secret

Users will be prompted to sign in with their @accessgroup.com account.

---

## Local Development (no Supabase needed)

The app works fully offline — all data stays in browser localStorage.
The sync indicator in the top bar shows "Local only" when no Supabase is configured.

```bash
cd frontend
npm install
npm run dev
# Open http://localhost:5173
```

To test with Supabase locally, create `frontend/.env.local`:
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

---

## Architecture Summary

```
Browser (any device) ──► Azure Static Web Apps (eve.accessgroup.com)
                               │
                               ▼
                         React + Zustand
                         (state in memory)
                               │
                    ┌──────────┴──────────┐
                    │                     │
              localStorage          Supabase (cloud)
              (local fallback)      (shared team data)
                                         │
                               ┌─────────┼─────────┐
                               │         │         │
                            Deals     Notes    Budgets/Reviews
```

**Cost:** Both Azure Static Web Apps (free tier) and Supabase (free tier up to 500MB / 2GB bandwidth) are **free** for this use case.
