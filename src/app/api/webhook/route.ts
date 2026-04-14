import { NextRequest, NextResponse } from 'next/server';
import { triggerServerPush } from '@/lib/notifications';

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const WEBHOOK_SECRET_GET = process.env.WEBHOOK_SECRET ?? 'tb_secret_2024';

export async function POST(req: NextRequest) {
  try {
    const incomingSecret = req.headers.get('x-webhook-secret');
    if (WEBHOOK_SECRET && incomingSecret !== WEBHOOK_SECRET) {
      console.warn('[Webhook] Rejected: invalid secret');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const lead = {
      full_name: body.full_name ?? 'New Lead',
      phone_number: body.phone_number ?? '',
      id: body.id || `lead_${Date.now()}`
    };

    console.log('[Webhook] New lead received:', {
      name:    lead.full_name,
      phone:   lead.phone_number,
      time:    new Date().toISOString(),
    });

    // TRIGGER SERVER PUSH
    if (APPS_SCRIPT_URL) {
      try {
        const subRes = await fetch(`${APPS_SCRIPT_URL}?action=getSubscriptions&secret=${WEBHOOK_SECRET_GET}`);
        const subData = await subRes.json();
        const subs = subData.subscriptions || [];
        
        if (subs.length > 0) {
          await triggerServerPush({
            title: '🎉 New Lead Arrived!',
            body: `${lead.full_name} just joined the machine.`,
            url: `/leads/${lead.id}?tab=all`,
            waLink: `https://wa.me/${lead.phone_number.replace(/\D/g, '')}`
          }, subs);
        }
      } catch (e) {
        console.error('[Webhook] Push failed:', e);
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Lead received and notification sent.',
    });
  } catch {
    return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
  }
}
