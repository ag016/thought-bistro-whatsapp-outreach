import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { google } from 'googleapis';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: 'You must sign in with Google to use the Calendar feature.' }, { status: 401 });
  }

  const { leadName, phone, dateStr, summary, description } = await req.json() as { 
    leadName?: string; 
    phone?: string; 
    dateStr?: string; 
    summary?: string; 
    description?: string; 
  };

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

    // FIX: Instead of manual Date math, we append the IST offset (+05:30) to the local time string.
    // Input dateStr is 'YYYY-MM-DDTHH:mm'. We make it 'YYYY-MM-DDTHH:mm:00+05:30'.
    // Google Calendar API handles this RFC3339 string perfectly and schedules it for the correct local time.
    const istDateTime = `${dateStr}:00+05:30`;
    
    // Create a date object just to calculate the end time (30 mins later)
    const startDateObj = new Date(istDateTime);
    const endDateObj = new Date(startDateObj.getTime() + 30 * 60000);

    const event = {
      summary: summary || `Clinic Follow Up: ${leadName || 'Lead'}`,
      description: description || `Scheduled via Thought Bistro Lead Machine.\n\nPhone Number: ${phone || 'N/A'}`,
      start: {
        dateTime: istDateTime,
        timeZone: 'Asia/Kolkata',
      },
      end: {
        dateTime: endDateObj.toISOString(),
        timeZone: 'Asia/Kolkata',
      },
      reminders: {
        useDefault: true,
      },
    };

    const response = await calendar.events.insert({
      calendarId: 'primary',
      requestBody: event,
    });

    return NextResponse.json({ success: true, eventLink: response.data.htmlLink, eventId: response.data.id });
  } catch (error: any) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to create calendar event' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);

  if (!session || !(session as any).accessToken) {
    return NextResponse.json({ error: 'You must sign in with Google to use the Calendar feature.' }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const eventId = searchParams.get('eventId');
  const leadName = searchParams.get('leadName') || undefined;
  const phone = searchParams.get('phone') || undefined;

  try {
    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );
    
    oauth2Client.setCredentials({
      access_token: (session as any).accessToken,
    });

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    if (eventId) {
      await calendar.events.delete({
        calendarId: 'primary',
        eventId: eventId,
      });
      return NextResponse.json({ success: true });
    }

    if (leadName || phone) {
      const query = leadName || phone;
      const events = await calendar.events.list({
        calendarId: 'primary',
        q: query || undefined,
      });

      if (events.data.items && events.data.items.length > 0) {
        const eventToDelete = events.data.items[0];
        await calendar.events.delete({
          calendarId: 'primary',
          eventId: eventToDelete.id!,
        });
        return NextResponse.json({ success: true });
      }
      return NextResponse.json({ error: 'No matching event found to delete' }, { status: 404 });
    }

    return NextResponse.json({ error: 'eventId, leadName, or phone is required' }, { status: 400 });
  } catch (error: any) {
    console.error('Calendar API error:', error);
    return NextResponse.json({ error: error.message || 'Failed to delete calendar event' }, { status: 500 });
  }
}
