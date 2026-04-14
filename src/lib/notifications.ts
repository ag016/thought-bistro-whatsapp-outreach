import webpush from 'web-push';
import { NextResponse } from 'next/server';

export async function triggerServerPush(payload: any, subscriptions: string[]) {
  if (!process.env.VAPID_PUBLIC_KEY || !process.env.VAPID_PRIVATE_KEY) {
    console.error('VAPID keys are missing in environment variables');
    return { success: false, error: 'VAPID keys missing' };
  }

  webpush.setVapidDetails(
    'mailto:' + (process.env.VAPID_EMAIL || 'admin@thoughtbistro.com'),
    process.env.VAPID_PUBLIC_KEY,
    process.env.VAPID_PRIVATE_KEY
  );

  const pushPromises = subscriptions.map(async (subString: string) => {
    try {
      const sub = JSON.parse(subString);
      return webpush.sendNotification(sub, JSON.stringify(payload));
    } catch (e) {
      console.error('Push failed for subscription', e);
      return null;
    }
  });

  await Promise.all(pushPromises);
  return { success: true };
}
