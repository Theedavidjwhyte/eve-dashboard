# Getting E.V.E Live — Step by Step
### Total time: ~30 minutes. No IT department needed.

---

## PART 1 — Get a free GitHub account (5 min)
*This is where your code lives. Think of it like OneDrive for the app.*

1. Go to **github.com/signup**
2. Enter your work email, create a password, choose a username
3. Verify your email
4. Go to **github.com/new**
   - Repository name: `eve-dashboard`
   - Set to **Private**
   - Click **Create repository**
5. You'll see a page with a URL like `https://github.com/YOUR-USERNAME/eve-dashboard`
6. **Copy that URL** — you'll need it in the next step

---

## PART 2 — Connect and push the code (2 min)
*Tell me your GitHub URL and I do this bit for you in the IDE.*

Just paste your GitHub repo URL into the chat and I'll push all the code across.

---

## PART 3 — Deploy on Netlify (10 min)
*This is the free hosting service. Your team will use the URL it gives you.*

1. Go to **app.netlify.com**
2. Click **Sign up** → choose **Sign up with GitHub** → authorise Netlify
3. Click **Add new site** → **Import an existing project**
4. Click **GitHub** → find and select **eve-dashboard**
5. Netlify auto-detects the settings from `netlify.toml` — you don't need to change anything:
   - Base directory: `frontend`
   - Build command: `npm run build`
   - Publish directory: `frontend/dist`
6. Click **Deploy site**
7. Wait ~2 minutes — Netlify shows a green tick and gives you a URL like:
   `https://eve-dashboard-abc123.netlify.app`

**Share that URL with your team — they can open it right now.**

---

## PART 4 — Set up Supabase shared database (10 min)
*Without this, each person has their own private data. With this, one import = everyone sees it.*

### 4a. Create the database
1. Go to **supabase.com** → **Start your project** (free)
2. Sign up with your work email
3. Click **New project**:
   - Name: `eve-dashboard`
   - Database password: save this somewhere safe (you won't need it often)
   - Region: **EU West (Ireland)** — closest to UK
4. Wait ~2 minutes for it to spin up

### 4b. Create the tables
1. In Supabase, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open the file `supabase/schema.sql` from this project
4. Copy the entire contents and paste it into the SQL Editor
5. Click **Run** (green button)
6. You should see: *"Success. No rows returned"* — that means it worked

### 4c. Get your API keys
1. In Supabase, click **Settings** (gear icon, bottom left)
2. Click **API**
3. You'll see two values — copy both:
   - **Project URL**: looks like `https://abcdefgh.supabase.co`
   - **Project API key** (anon/public): a long string starting with `eyJ...`

### 4d. Add the keys to Netlify
1. Go back to **app.netlify.com** → your site → **Site configuration**
2. Click **Environment variables** → **Add a variable** → Add both:

   | Key | Value |
   |-----|-------|
   | `VITE_SUPABASE_URL` | your Project URL from step 4c |
   | `VITE_SUPABASE_ANON_KEY` | your API key from step 4c |

3. Click **Save**
4. Go to **Deploys** → **Trigger deploy** → **Deploy site**
5. Wait 2 minutes — the app rebuilds with the database connected

---

## PART 5 — Enable realtime (5 min)
*This makes data appear instantly for everyone when you import, rather than waiting 5 minutes.*

1. In Supabase → **Database** → **Replication** (in the left sidebar)
2. Find the toggle for **eve_imports** and turn it ON
3. Do the same for: **eve_deals**, **eve_notes**, **eve_free_notes**, **eve_commit_notes**
4. That's it — the app now gets live updates

---

## PART 6 — Custom URL (optional, 5 min)
*Instead of `eve-dashboard-abc123.netlify.app` you can have something more professional.*

**Free option — Netlify subdomain:**
1. Netlify → Site configuration → Site details → **Change site name**
2. Set it to `eve-elevate` → your URL becomes `eve-elevate.netlify.app`

**Custom domain (e.g. eve.accessgroup.com):**
- This needs a DNS change — if you want this, ask IT for a CNAME record
- Or buy a domain at namecheap.com for ~£10/year

---

## How it works once live

```
You (or anyone on the team)
    │
    │  Goes to https://eve-elevate.netlify.app
    │
    ▼
Opens E.V.E in their browser — no install, no download
    │
    ├── You import Salesforce data once
    │        └── Everyone else sees it within seconds
    │
    ├── Anyone adds a forecast note
    │        └── Appears for everyone immediately
    │
    ├── Anyone generates PPTX / PDF
    │        └── Downloaded to their own machine
    │
    └── I update the app code
             └── Netlify auto-deploys in 2 min
                  └── Everyone gets the new version next refresh
```

---

## Costs

| Service | Cost |
|---------|------|
| GitHub | Free |
| Netlify | Free (100GB bandwidth/month — more than enough) |
| Supabase | Free (500MB database — enough for years of forecast data) |
| **Total** | **£0/month** |

---

## Security note

The Netlify URL is public — anyone who knows it can open the app.

**If you want to lock it to Access Group staff only:**
- Netlify → Site configuration → **Access control** → **Password protection** (free)
  Set a team password — anyone opening the URL must enter it first

**For full SSO (Access Group Microsoft login):**
- This requires Azure Static Web Apps instead of Netlify
- Still free, but takes an extra 20 minutes to set up
- Tell me if you want to go this route and I'll guide you through it

---

*Next step: paste your GitHub repo URL into the chat and I'll push the code.*
