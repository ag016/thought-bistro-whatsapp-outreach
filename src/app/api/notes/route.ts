import { NextRequest, NextResponse } from 'next/server';

const SPREADSHEET_ID  = process.env.SPREADSHEET_ID;
const GOOGLE_API_KEY  = process.env.GOOGLE_API_KEY;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET ?? 'tb_secret_2024';

// ── GET /api/notes?leadId=xxx ─────────────────────────────────────────────────
// Returns: { notes: Note[] }

export async function GET(req: NextRequest) {
  const leadId = req.nextUrl.searchParams.get('leadId') ?? '';

  if (!SPREADSHEET_ID || !GOOGLE_API_KEY) {
    return NextResponse.json({ notes: [] });
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent('Notes!A:D')}?key=${GOOGLE_API_KEY}`;
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    // Notes tab doesn't exist yet
    return NextResponse.json({ notes: [] });
  }

  const data = await res.json() as { values?: string[][] };
  const rows = data.values ?? [];

  if (rows.length < 2) return NextResponse.json({ notes: [] });

  const notes = rows.slice(1)
    .filter(row => {
      const rowLeadId = (row[0] ?? '').trim();
      const noteText  = (row[1] ?? '').trim();
      if (!noteText) return false;
      if (leadId && rowLeadId !== leadId) return false;
      return true;
    })
    .map(row => ({
      lead_id:    (row[0] ?? '').trim(),
      note_text:  (row[1] ?? '').trim(),
      created_at: (row[2] ?? '').trim(),
      source:     (row[3] ?? 'manual').trim(),
    }));

  return NextResponse.json({ notes });
}

// ── POST /api/notes ───────────────────────────────────────────────────────────
// Body: { leadId, noteText, createdAt? }

export async function POST(req: NextRequest) {
  const body = await req.json() as { leadId?: string; noteText?: string; createdAt?: string };

  if (!body.leadId || !body.noteText) {
    return NextResponse.json({ error: 'leadId and noteText required' }, { status: 400 });
  }

  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ success: true, warn: 'APPS_SCRIPT_URL not set — note not persisted' });
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:    'addNote',
        secret:    WEBHOOK_SECRET,
        leadId:    body.leadId,
        noteText:  body.noteText,
        createdAt: body.createdAt ?? new Date().toISOString(),
      }),
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

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const leadId = searchParams.get('leadId');
  const noteText = searchParams.get('noteText');

  if (!leadId || !noteText) {
    return NextResponse.json({ error: 'leadId and noteText required' }, { status: 400 });
  }

  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ success: true, warn: 'APPS_SCRIPT_URL not set — note not deleted' });
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:    'deleteNote',
        secret:    WEBHOOK_SECRET,
        leadId:    leadId,
        noteText:  noteText,
      }),
      redirect: 'follow',
    });

    return NextResponse.json({ success: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

