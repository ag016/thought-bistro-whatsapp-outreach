import { NextResponse } from 'next/server';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET ?? 'tb_secret_2024';

export async function POST(req: Request) {
  try {
    const subscription = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }
    
    if (!APPS_SCRIPT_URL) {
      return NextResponse.json({ error: 'Apps Script URL not set' }, { status: 500 });
    }

    const res = await fetch(APPS_SCRIPT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'saveSubscription',
        secret: WEBHOOK_SECRET,
        subscription: JSON.stringify(subscription)
      })
    });

    if (!res.ok) throw new Error('Failed to save to sheet');

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message || 'Failed to save subscription' }, { status: 500 });
  }
}

export async function GET() {
  if (!APPS_SCRIPT_URL) {
    return NextResponse.json({ subscriptions: [] });
  }

  try {
    const res = await fetch(`${APPS_SCRIPT_URL}?action=getSubscriptions&secret=${WEBHOOK_SECRET}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (e) {
    return NextResponse.json({ subscriptions: [] });
  }
}
