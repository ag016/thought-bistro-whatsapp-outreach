import { NextResponse } from 'next/server';

// In-memory store for subscriptions (In production, this would be a database or AppScript)
let subscriptions: string[] = [];

export async function GET() {
  return NextResponse.json({ count: subscriptions.length });
}

export async function POST(req: Request) {
  try {
    const subscription = await req.json();
    if (!subscription || !subscription.endpoint) {
      return NextResponse.json({ error: 'Invalid subscription object' }, { status: 400 });
    }
    
    const subString = JSON.stringify(subscription);
    if (!subscriptions.includes(subString)) {
      subscriptions.push(subString);
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: 'Failed to save subscription' }, { status: 500 });
  }
}
