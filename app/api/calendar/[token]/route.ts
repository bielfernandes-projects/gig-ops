import { createAdminClient } from '@/lib/supabase/admin';
import * as ics from 'ics';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const resolvedParams = await params;
  const token = resolvedParams.token;
  
  if (!token || token.length < 10) {
    return new NextResponse('Token is required or invalid', { status: 400 });
  }

  // Anonymous feed (calendar apps can't log in): the token acts as the password, so we use the service role here.
  const supabase = createAdminClient();

  // First, check if it's the ADMIN global token
  const { data: settingsData } = await supabase
    .from('go_settings')
    .select('admin_id')
    .eq('calendar_token', token)
    .maybeSingle();

  let targetMemberId: string | null = null;
  let scopeAdminId: string | null = null;
  let isAdmin = false;

  if (settingsData) {
    isAdmin = true;
    scopeAdminId = settingsData.admin_id;
  } else {
    // If not admin, check if it's a specific musician's token
    const { data: memberData } = await supabase
      .from('go_members')
      .select('id, admin_id')
      .eq('calendar_token', token)
      .maybeSingle();

    if (!memberData) {
      return new NextResponse('Invalid calendar token', { status: 401 });
    }
    targetMemberId = memberData.id;
    scopeAdminId = memberData.admin_id;
  }

  // Build the gigs query
  let gigsQuery = supabase
    .from('go_gigs')
    .select(`
      id, title, location, start_time, end_time, notes,
      go_projects (name)
    `)
    .eq('admin_id', scopeAdminId!); // never leak gigs across bands

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
      'Content-Disposition': `attachment; filename="agenda-gigueiros.ics"`,
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  });
}

function generateEmptyCalendar() {
  return new NextResponse(
    'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//Gigueiros//Calendar//EN\r\nCALSCALE:GREGORIAN\r\nEND:VCALENDAR', 
    { headers: { 'Content-Type': 'text/calendar; charset=utf-8' } }
  );
}
