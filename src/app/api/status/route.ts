import { NextRequest, NextResponse } from 'next/server';
import { handleAppsScriptResponse, apiError, apiWarn } from '@/lib/api-utils';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET ?? 'tb_secret_2024';

export async function POST(req: NextRequest) {
  const body = await req.json() as { leadId?: string; newStatus?: string };

  if (!body.leadId || !body.newStatus) {
    return apiError('leadId and newStatus required', 400);
  }

  if (!APPS_SCRIPT_URL) {
    return apiWarn('APPS_SCRIPT_URL not set — status not persisted');
  }

  try {
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:    'updateStatus',
        secret:    WEBHOOK_SECRET,
        leadId:    body.leadId,
        newStatus: body.newStatus
      }),
      redirect: 'follow',
    });

    return handleAppsScriptResponse(res);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Unknown error');
  }
}
