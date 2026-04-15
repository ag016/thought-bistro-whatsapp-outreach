import { NextRequest, NextResponse } from 'next/server';
import { handleAppsScriptResponse, apiError, apiWarn } from '@/lib/api-utils';

const APPS_SCRIPT_URL = process.env.APPS_SCRIPT_URL;
const WEBHOOK_SECRET  = process.env.WEBHOOK_SECRET ?? 'tb_secret_2024';

export async function POST(req: NextRequest) {
  const body = await req.json() as { leadId?: string; tag?: string; internalTag?: string; nickname?: string };
  const tagValue = body.tag ?? body.internalTag;
  const nicknameValue = body.nickname;

  if (!body.leadId || (tagValue === undefined && nicknameValue === undefined)) {
    return apiError('leadId and (tag or nickname) required', 400);
  }

  if (!APPS_SCRIPT_URL) {
    return apiWarn('APPS_SCRIPT_URL not set — value not persisted');
  }

  try {
    const isNicknameUpdate = nicknameValue !== undefined;
    const res = await fetch(APPS_SCRIPT_URL, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({
        action:    isNicknameUpdate ? 'updateNickname' : 'updateTag',
        secret:    WEBHOOK_SECRET,
        leadId:    body.leadId,
        [isNicknameUpdate ? 'nickname' : 'tag']: isNicknameUpdate ? nicknameValue : tagValue
      }),
      redirect: 'follow',
    });

    return handleAppsScriptResponse(res);
  } catch (e) {
    return apiError(e instanceof Error ? e.message : 'Unknown error');
  }
}
