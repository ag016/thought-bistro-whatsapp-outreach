import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: 'You must sign in with Google to use the Calendar feature.' }, { status: 401 });
  }

  const { leadName, phone, dateStr } = await req.json() as { leadName?: string; phone?: string; dateStr?: string };

  if (!dateStr) {
    return NextResponse.json({ error: 'dateStr is required' }, { status: 400 });
  }

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: (session as any).accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const startDate = new Date(dateStr);
    const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 minutes later

    const event = {
      summary: `Clinic Follow Up: ${leadName || 'Lead'}`,
      description: `Scheduled via Thought Bistro Lead Machine.\n\nPhone Number: ${phone || 'N/A'}`,
      start: {
        dateTime: startDate.toISOString(),
      },
      end: {
        dateTime: endDate.toISOString(),
      },
      reminders: {
        useDefault: true,
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return NextResponse.json({ success: true, eventLink: response.data.htmlLink });
  } catch (error: any) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create calendar event' }, { status: 500 });
  }
}
