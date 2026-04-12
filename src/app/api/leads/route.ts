import { NextResponse } from 'next/server';

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
  const range  = 'Clinic Mar 31!A:Z';
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
      // Map each column header → value
      const obj: Record<string, string> = {};
      headers.forEach((header: string, i: number) => {
        obj[header] = row[i]?.toString().trim() ?? '';
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
