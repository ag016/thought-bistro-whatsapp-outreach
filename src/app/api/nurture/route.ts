import { NextRequest, NextResponse } from 'next/server';

const SPREADSHEET_ID   = process.env.SPREADSHEET_ID;
const GOOGLE_API_KEY   = process.env.GOOGLE_API_KEY;
const APPS_SCRIPT_URL  = process.env.APPS_SCRIPT_URL;
const WEBHOOK_SECRET   = process.env.WEBHOOK_SECRET ?? 'tb_secret_2024';

// ── Shared helper: read a tab from Google Sheets ──────────────────────────────

async function readSheetTab(tabName: string): Promise<string[][] | null> {
  if (!SPREADSHEET_ID || !GOOGLE_API_KEY) return null;
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(tabName + '!A:O')}?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null; // tab may not exist yet
  const data = await res.json() as { values?: string[][] };
  return data.values ?? null;
}

// ── GET /api/nurture ──────────────────────────────────────────────────────────
// Returns: { nurture: Record<leadId, NurtureSheetRow> }

export async function GET() {
  const rows = await readSheetTab('Nurture');

  if (!rows || rows.length < 2) {
    return NextResponse.json({ nurture: {} });
  }

  const headers = rows[0].map(h => h.trim());
  const nurture: Record<string, Record<string, string>> = {};

  rows.slice(1).forEach(row => {
    const leadId = (row[0] ?? '').trim();
    if (!leadId) return;
    const entry: Record<string, string> = {};
    headers.forEach((h, i) => { entry[h] = (row[i] ?? '').trim(); });
    nurture[leadId] = entry;
  });

  return NextResponse.json({ nurture });
}

// ── POST /api/nurture ─────────────────────────────────────────────────────────
// Body: { leadId, currentStep, status, lastSentAt?, msgIndex?, sentAt? }
// Forwards to Apps Script Web App → writes to Nurture tab + Clinic Mar 31

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;

  if (!APPS_SCRIPT_URL) {
    // No Apps Script URL yet — return success so the UI doesn't break
    // (localStorage fallback in the client will handle it)
    return NextResponse.json({ success: true, warn: 'APPS_SCRIPT_URL not set — data not persisted to Sheets' });
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ ...body, action: 'upsertNurture', secret: WEBHOOK_SECRET }),
      redirect: 'follow',
    });

    const text = await res.text();
    let parsed: unknown;
    try { parsed = JSON.parse(text); } catch { parsed = { raw: text }; }

    return NextResponse.json({ success: true, upstream: parsed });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
