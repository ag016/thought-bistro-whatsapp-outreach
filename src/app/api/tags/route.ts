import { NextRequest, NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET ?? 'tb_secret_2024';

export async function POST(req: NextRequest) {
  const body = await req.json() as { leadId?: string; tag?: string; internalTag?: string };
  const tagValue = body.tag ?? body.internalTag; // accept both key names

  if (!body.leadId || tagValue === undefined) {
    return NextResponse.json({ error: 'leadId and tag required' }, { status: 400 });
  }

  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ success: true, warn: 'APPS_SCRIPT_URL not set — tag not persisted' });
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:    'updateTag',
        secret:    WEBHOOK_SECRET,
        leadId:    body.leadId,
        tag:       tagValue
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
