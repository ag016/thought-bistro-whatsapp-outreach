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

    // TIMEZONE FIX: 
    // Input dateStr is 'YYYY-MM-DDTHH:mm' (local time selected by user).
    // Vercel servers run in UTC. We want this time to be IST (+05:30).
    // We create the date object, then subtract 5.5 hours (330 mins) to get the correct UTC time.
    const startDate = new Date(dateStr); 
    startDate.setMinutes(startDate.getMinutes() - 330); 

    const endDate = new Date(startDate.getTime() + 30 * 60000); // 30 minutes later

    const event = {
      summary: summary || `Clinic Follow Up: ${leadName || 'Lead'}`,
      description: description || `Scheduled via Thought Bistro Lead Machine.\n\nPhone Number: ${phone || 'N/A'}`,
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
  const leadName = searchParams.get('leadName');
  const phone = searchParams.get('phone');

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
      // Search for events matching lead name or phone
      const query = leadName || phone;
      const events = await calendar.events.list({
        calendarId: 'primary',
        q: query,
      });

      if (events.data.items && events.data.items.length > 0) {
        // Delete the most recent matching event
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
