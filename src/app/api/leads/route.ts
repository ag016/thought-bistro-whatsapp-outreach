import { NextResponse } from 'next/server';
import { triggerServerPush } from '@/lib/notifications';

const SPREADSHEET_ID = process.env.SPREADSHEET_ID;
const GOOGLE_API_KEY  = process.env.GOOGLE_API_KEY;

export async function GET() {
  if (!SPREADSHEET_ID || !GOOGLE_API_KEY) {
    return NextResponse.json(
      {
        error:
          'Server not configured. Add SPREADSHEET_ID and GOOGLE_API_KEY in Vercel → Settings → Environment Variables.',
      },
      { status: 500 }
    );
  }

  // Tab name confirmed from your Google Sheet
  const range  = 'Clinic Mar 31!A:ZZ';
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}/values/${encodeURIComponent(range)}?key=${GOOGLE_API_KEY}`;

  let sheetData: { values?: string[][] };
  try {
    const res = await fetch(apiUrl, { cache: 'no-store' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({})) as { error?: { message?: string } };
      return NextResponse.json(
        { error: `Google Sheets API: ${err?.error?.message ?? res.statusText}` },
        { status: 500 }
      );
    }
    sheetData = await res.json();
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Unknown error';
    return NextResponse.json({ error: `Fetch failed: ${msg}` }, { status: 500 });
  }

  const rows = sheetData.values;
  if (!rows || rows.length < 2) {
    return NextResponse.json({ leads: [] });
  }

  const headers = rows[0].map((h: string) => h.trim());

  const leads = rows
    .slice(1)
    .filter((row: string[]) => row.some((cell) => cell?.trim()))
    .map((row: string[], index: number) => {
      // Map each column header → value (case-insensitive)
      const obj: Record<string, string> = {};
      headers.forEach((header: string, i: number) => {
        obj[header.toLowerCase()] = row[i]?.toString().trim() ?? '';
      });

      // Parse created_time safely
      let createdAt = new Date().toISOString();
      if (obj['created_time']) {
        const parsed = new Date(obj['created_time']);
        if (!isNaN(parsed.getTime())) createdAt = parsed.toISOString();
      }

      return {
        sheet_id:     obj['id'] || `row_${index + 2}`,
        full_name:    obj['full_name']    || '',
        phone_number: obj['phone_number'] || '',
        company_name: obj['company_name'] || '',
        nickname:     obj['nickname']     || '',
        internal_tag:   obj['internal_tag'] || '',
        created_at:   createdAt,
        metadata: {
          clinic_type:       obj['What type of clinic do you run?']                                  ?? '',
          treatment_price:   obj['Typical full treatment price?']                                    ?? '',
          lead_quality_desc: obj['Which of these best describes your current leads?']               ?? '',
          notes:             obj['anything_else_you_would_like_us_to_know_before_we_contact_you?'] ?? '',
          ad_name:           obj['ad_name']       ?? '',
          campaign_name:     obj['campaign_name'] ?? '',
          platform:          obj['platform']      ?? '',
          india_time:        obj['India Time']    ?? '',
          lead_status:       obj['lead_status']   ?? '',
        },
      };
    })
    // Filter out rows that have neither a name nor a phone number
    .filter((l) => l.full_name || l.phone_number);

  return NextResponse.json({ leads });
}

// ── POST /api/leads — Create a manual lead ─────────────────────────────────────

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET ?? 'tb_secret_2024';

export async function POST(req: Request) {
  const body = await req.json() as {
    full_name?: string;
    phone_number?: string;
    company_name?: string;
    clinic_type?: string;
    nickname?: string;
    lead_quality_desc?: string;
  };

  if (!body.full_name && !body.phone_number) {
    return NextResponse.json({ error: 'full_name or phone_number required' }, { status: 400 });
  }

  // Generate a unique manual lead ID
  const manualId = `manual_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const now = new Date().toISOString();

  const newLead = {
    sheet_id:     manualId,
    full_name:    body.full_name     || '',
    phone_number: body.phone_number  || '',
    company_name: body.company_name  || '',
    internal_tag: '',
    created_at:   now,
    metadata: {
      clinic_type:       body.clinic_type       || '',
      treatment_price:   '',
      lead_quality_desc: body.lead_quality_desc || '',
      notes:             '',
      ad_name:           'Manual Entry',
      campaign_name:     'Manual Entry',
      platform:          'Manual',
      india_time:        now,
      lead_status:       'CREATED',
    },
  };

  // Forward to AppScript if configured
  if (APPS_SCRIPT_URL) {
    try {
      await fetch(APPS_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:      'addManualLead',
          secret:      WEBHOOK_SECRET,
          leadId:      manualId,
          nickname:    body.nickname || '',
          ...newLead,
        }),
        redirect: 'follow',
      });

      // TRIGGER SERVER PUSH for manual leads
      try {
        const subRes = await fetch(`${APPS_SCRIPT_URL}?action=getSubscriptions&secret=${WEBHOOK_SECRET}`);
        const subData = await subRes.json();
        const subs = subData.subscriptions || [];
        
        if (subs.length > 0) {
          await triggerServerPush({
            title: '🎉 New Lead Arrived!',
            body: `${newLead.full_name} was added manually.`,
            url: `/leads/${manualId}?tab=all`,
            waLink: `https://wa.me/${newLead.phone_number.replace(/\D/g, '')}`
          }, subs);
        }
      } catch (pushErr) {
        console.error('Manual lead push failed:', pushErr);
      }

    } catch {
      // Non-fatal — return lead to client anyway; sheet sync may lag
    }
  }

  // Also bootstrap the nurture row so the lead is immediately trackable
  if (APPS_SCRIPT_URL) {
    try {
      await fetch(APPS_SCRIPT_URL, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          action:      'upsertNurture',
          secret:      WEBHOOK_SECRET,
          leadId:      manualId,
          currentStep: 0,
          status:      'active',
          lastSentAt:  '',
          nickname:    body.nickname || '',
        }),
        redirect: 'follow',
      });
    } catch { /* non-fatal */ }
  }

  return NextResponse.json({ lead: newLead, id: manualId });
}
