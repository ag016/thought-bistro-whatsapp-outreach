import { NextResponse } from 'next/server';
import webpush from 'web-push';

export async function POST(req: Request) {
  try {
    if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
      console.error('VAPID keys are missing in environment variables');
      return NextResponse.json({ error: 'Push service not configured' }, { status: 500 });
    }

    webpush.setVapidDetails(
      'mailto:' + (process.env.VAPID_EMAIL || 'admin@thoughtbistro.com'),
      process.env.VAPID_PUBLIC_KEY,
      process.env.VAPID_PRIVATE_KEY
    );

    const body = await req.json();
    const { notifications, subscriptions } = body;
    
    if (!Array.isArray(notifications)) {
      return NextResponse.json({ error: 'Notifications must be an array' }, { status: 400 });
    }
    if (!Array.isArray(subscriptions)) {
      return NextResponse.json({ error: 'Subscriptions must be an array' }, { status: 400 });
    }

    const pushPromises = subscriptions.map(async (sub: any) => {
      try {
        const notificationPromises = notifications.map(n => 
          webpush.sendNotification(sub, JSON.stringify(n))
        );
        await Promise.all(notificationPromises);
      } catch (e) {
        console.error('Push failed for subscription', e);
      }
    });

    await Promise.all(pushPromises);
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error('Push error:', e);
    return NextResponse.json({ error: 'Push failed' }, { status: 500 });
  }
}
