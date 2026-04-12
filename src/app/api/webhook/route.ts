import { NextRequest, NextResponse } from 'next/server';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

export async function POST(req: NextRequest) {
  try {
    // Validate the secret header sent by Apps Script
    const incomingSecret = req.headers.get('x-webhook-secret');
    if (WEBHOOK_SECRET && incomingSecret !== WEBHOOK_SECRET) {
      console.warn('[Webhook] Rejected: invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();

    // Log to Vercel Functions log — visible in Vercel dashboard
    console.log('[Webhook] New lead received:', {
      name:    body.full_name    ?? '—',
      phone:   body.phone_number ?? '—',
      company: body.company_name ?? '—',
      time:    new Date().toISOString(),
    });

    // No server-side storage needed.
    // The data lives in Google Sheets. The dashboard fetches fresh data
    // from /api/leads whenever the user hits "Sync".
    return NextResponse.json({
      success: true,
      message: 'Lead received. Dashboard will show it on next sync.',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
