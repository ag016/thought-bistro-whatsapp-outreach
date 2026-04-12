# 🚀 Thought Bistro Lead Machine — Go-Live Setup Guide

Follow these steps **in order**. The whole process takes ~20 minutes.

---

## Step 1 — Google Cloud API Key

1. Go to **[console.cloud.google.com](https://console.cloud.google.com)**
2. Create a new project (or use an existing one)
3. In the search bar type **"Google Sheets API"** → Enable it
4. Go to **APIs & Services → Credentials → Create Credentials → API Key**
5. Copy the key — you'll need it in Step 3

> **Security tip:** Click "Restrict Key" → API restrictions → restrict to "Google Sheets API" only.

---

## Step 2 — Get Your Spreadsheet ID

Your Google Sheet URL looks like this:
```
https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms/edit
                                       ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                                       This part is your SPREADSHEET_ID
```

Also make sure the sheet's **sharing is set to "Anyone with the link can view"** — this lets the API key read it.

---

## Step 3 — Deploy to Vercel

### 3a. Push to GitHub
```bash
cd "/Users/akhilgupta/Downloads/HTML/Whatsapp Outreach/project"

git init
git add .
git commit -m "feat: initial Thought Bistro Lead Machine"
git branch -M main

# Create a repo on github.com, then:
git remote add origin https://github.com/YOUR_USERNAME/thought-bistro-leads.git
git push -u origin main
```

### 3b. Deploy on Vercel
1. Go to **[vercel.com](https://vercel.com)** → Sign up / Log in with GitHub
2. Click **"Add New Project"** → Import your GitHub repo
3. Leave all build settings as default → Click **Deploy**
4. After deploy, go to **Settings → Environment Variables** and add:

| Name | Value |
|---|---|
| `SPREADSHEET_ID` | your sheet ID from Step 2 |
| `GOOGLE_API_KEY` | your API key from Step 1 |
| `WEBHOOK_SECRET` | `tb_secret_2024` |

5. Go to **Deployments → Redeploy** (so the env vars take effect)
6. Copy your live URL e.g. `https://thought-bistro-leads.vercel.app`

---

## Step 4 — Set Up Google Apps Script

1. Open your Meta Ads leads Google Sheet
2. Click **Extensions → Apps Script**
3. Delete any existing code and paste the contents of `gas/script.gs`
4. At the top, replace:
   ```js
   const WEBHOOK_URL = 'https://YOUR_APP.vercel.app/api/webhook';
   ```
   with your actual Vercel URL + `/api/webhook`

5. Save (⌘S / Ctrl+S)
6. In the function dropdown, select **`setupTrigger`** → Click ▶ Run
7. Accept the Google permissions popup
8. ✅ The trigger is now active — every new lead row will auto-push to your dashboard

### Bulk backfill existing leads
Select **`syncAllLeads`** → Run → this pushes every existing row to the dashboard.

---

## Step 5 — Open the Dashboard

1. Go to your Vercel URL
2. Enter PIN: **1234**
3. Click **Sync** to pull all leads from your sheet
4. Start messaging! 🎉

---

## How it works day-to-day

1. Meta Ads lead comes in → appears as new row in Google Sheet (via Zapier/Make/native)
2. Apps Script detects the new row → POSTs to your dashboard webhook
3. Click **Sync** on the dashboard → shows your fresh leads
4. Under **Due Today**: click **"Send Msg X →"** → WhatsApp opens with pre-filled message
5. Send the message manually → come back and tap **"✓ Mark as Sent"** → step advances
6. Toggle **⏸** to pause a lead when they reply and you're in conversation

---

## Troubleshooting

| Problem | Fix |
|---|---|
| "Server not configured" error | Check Vercel env vars and redeploy |
| No leads showing after Sync | Check Google Sheets API is enabled; verify SPREADSHEET_ID |
| Apps Script error | Check Logger (View → Logs) in Apps Script editor |
| Leads not auto-syncing | Re-run `setupTrigger()` in Apps Script |
