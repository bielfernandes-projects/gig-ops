import { createClient } from '@supabase/supabase-js';
import * as ics from 'ics';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  const token = resolvedParams.token;
  
  if (!token || token.length < 10) {
    return new NextResponse('Token is required or invalid', { status: 400 });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Calendars are fetched anonymously via URL (like a password token). We use the service_role safely in this isolated route to bypass RLS since bots can't authenticate.
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!; 
  const supabase = createClient(supabaseUrl, supabaseKey);

  // First, check if it's the ADMIN global token
  const { data: settingsData } = await supabase
    .from('go_settings')
    .select('id')
    .eq('calendar_token', token)
    .single();

  let targetMemberId: string | null = null;
  let isAdmin = false;

  if (settingsData) {
    isAdmin = true;
  } else {
    // If not admin, check if it's a specific musician's token
    const { data: memberData } = await supabase
      .from('go_members')
      .select('id')
      .eq('calendar_token', token)
      .single();

    if (!memberData) {
      return new NextResponse('Invalid calendar token', { status: 401 });
    }
    targetMemberId = memberData.id;
  }

  // Build the gigs query
  let gigsQuery = supabase
    .from('go_gigs')
    .select(`
      id, title, location, start_time, end_time, notes,
      go_projects (name)
    `);

  // If simple viewer, filter to show only Gigs where the member is enrolled
  if (!isAdmin && targetMemberId) {
    const { data: lineupData } = await supabase
      .from('go_lineup')
      .select('gig_id')
      .eq('member_id', targetMemberId);
    
    if (!lineupData || lineupData.length === 0) {
      return generateEmptyCalendar();
    }
    
    const gigIds = lineupData.map(l => l.gig_id);
    gigsQuery = gigsQuery.in('id', gigIds);
  }

  const { data: gigs, error } = await gigsQuery.order('start_time', { ascending: true });

  if (error || !gigs || gigs.length === 0) {
    return generateEmptyCalendar();
  }

  // Parse Gigs into iCal Events
  const events: ics.EventAttributes[] = gigs.map(gig => {
    const startDate = new Date(gig.start_time);
    
    const startObj: ics.DateArray = [
      startDate.getUTCFullYear(),
      startDate.getUTCMonth() + 1,
      startDate.getUTCDate(),
      startDate.getUTCHours(),
      startDate.getUTCMinutes()
    ];

    let endObj: ics.DateArray;
    if (gig.end_time) {
      const endDate = new Date(gig.end_time);
      endObj = [
        endDate.getUTCFullYear(),
        endDate.getUTCMonth() + 1,
        endDate.getUTCDate(),
        endDate.getUTCHours(),
        endDate.getUTCMinutes()
      ];
    } else {
      // Default duration is 3 hours if strictly endtime is missing (Standard for music)
      const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);
      endObj = [
        endDate.getUTCFullYear(),
        endDate.getUTCMonth() + 1,
        endDate.getUTCDate(),
        endDate.getUTCHours(),
        endDate.getUTCMinutes()
      ];
    }

    const projectName = Array.isArray(gig.go_projects) 
      ? gig.go_projects[0]?.name 
      : (gig.go_projects as { name: string } | null)?.name;

    const titleSuffix = projectName ? ` [${projectName}]` : '';
    // Title + Project Suffix (eg. "Casamento de Ana [DNP]")
    const fullTitle = `${gig.title}${titleSuffix}`;

    return {
      title: fullTitle,
      start: startObj,
      end: endObj,
      location: gig.location && gig.location !== 'A definir' ? gig.location : undefined,
      startInputType: 'utc',
      startOutputType: 'utc',
    };
  });

  const { error: icsError, value } = ics.createEvents(events);

  if (icsError || !value) {
    return new NextResponse(`Error generating calendar: ${icsError}`, { status: 500 });
  }

  return new NextResponse(value, {
    headers: {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Content-Disposition': `attachment; filename="agenda-minha-banda.ics"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

function generateEmptyCalendar() {
  return new NextResponse(
    'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Minha Banda App//Calendar//EN\r\nCALSCALE:GREGORIAN\r\nEND:VCALENDAR', 
    { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } }
  );
}
