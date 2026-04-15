import { NextResponse } from 'next/server';

/**
 * Standardized handler for forwarding requests to the Apps Script Web App.
 * Handles response parsing and consistent error reporting.
 */
export async function handleAppsScriptResponse(res: Response) {
  const text = await res.text();
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  return NextResponse.json({ success: true, upstream: parsed });
}

/**
 * Standardized error response for API routes.
 */
export function apiError(message: string, status: number = 500) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * Standardized "warn" response for when the Apps Script URL is missing.
 */
export function apiWarn(message: string) {
  return NextResponse.json({ success: true, warn: message });
}
