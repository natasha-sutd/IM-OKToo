import express from 'express'
import { eachMinuteOfInterval, format } from 'date-fns'
import { google , calendar_v3 } from 'googleapis'
import getConnection from '../db.js'

// Log environment variables for debugging
console.log('📅 Calendar Service - Environment Check:');
console.log('- CLIENT_ID:', process.env.CLIENT_ID ? '✅ Set' : '❌ Missing');
console.log('- CLIENT_SECRET:', process.env.CLIENT_SECRET || process.env.SECRET_ID ? '✅ Set' : '❌ Missing');
console.log('- REDIRECT_URI:', process.env.REDIRECT_URI || process.env.REDIRECT ? '✅ Set' : '❌ Missing');

const oauth2Client = new google.auth.OAuth2(
  process.env.CLIENT_ID,
  process.env.CLIENT_SECRET || process.env.SECRET_ID,
  process.env.REDIRECT_URI || process.env.REDIRECT
);

const router = express.Router();

router.get('/testing',(req,res) => {
  console.log("Calendar service endpoint working");
  res.json({ 
    status: 'ok', 
    message: 'calendar endpoint works',
    oauth_configured: !!(process.env.CLIENT_ID && (process.env.CLIENT_SECRET || process.env.SECRET_ID))
  });
})

//  authgooglecalendar for backward compatibility
router.get('/auth', (req, res) => {
  // Redirect to the actual Google OAuth endpoint
  res.redirect('/calendar/authgooglecalendar' + (req.url.includes('?') ? req.url.substring(req.url.indexOf('?')) : ''));
})

router.get('/all', async (req, res) => {
    const email = req.query.email;
    if (!email){
      return res.status(400).send("Missing email");
    }
    const db = await getConnection();
    const [rs] = await db.query(
      'SELECT * FROM Events WHERE email = ?',
      [email, `%${email}%`] // match if user is the caretaker or invited guest
    );
    await db.end();

    res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
    res.json(rs);
})

router.post('/add', async (req, res) => {

    const data = req.body;
    let columns = ['title', 'category', 'start', 'end', 'caretaker','email'];

    const startTimes = data.startTime.split(":");
    const endTimes = data.endTime.split(":");

    const start = new Date(data.startDate.year, data.startDate.month-1, data.startDate.day, parseInt(startTimes[0]), parseInt(startTimes[1]), 0);
    const formattedStart = format(start, 'yyyy-MM-dd HH:mm:ss');

    const end = new Date(data.endDate.year, data.endDate.month-1, data.endDate.day, parseInt(endTimes[0]), parseInt(endTimes[1]), 0);
    const formattedEnd = format(end, 'yyyy-MM-dd HH:mm:ss');

    let values = [data.elderly + ": " + data.title, data.category, formattedStart, formattedEnd, data.caretaker,data.email];

    if (end < start) {
        res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.send('Creation of event failed as end date and time is earlier than start date and time');
    } 
    else {
        if (data.guests && data.guests.length > 0) {
            columns.push('guests');
            values.push(data.guests);
        }

        if (data.location && data.location.length > 0) {
            columns.push('location');
            values.push(data.location);
        }

        if (data.description && data.description.length > 0) {
            columns.push('description');
            values.push(data.description);    
        }

        columns.push('recurrence');
        if (data.recurrence && data.recurrence.length > 0) {
            values.push(data.recurrence);
        }
        else
        {
            values.push("FREQ=DAILY;COUNT=1")
        }

        // Use parameterized query to prevent SQL injection
        const placeholders = values.map(() => '?').join(',');
        const query = `INSERT INTO Events ( ${columns.join(',')} ) VALUES ( ${placeholders} )`;
        
        const db = await getConnection();
        const [rs] = await db.query(query, values);  // pass values as parameters
        console.log('Connection successful! Test result:', rs);
        await db.end();
        res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
        res.send('Event created!');
    }
});

router.post('/delete', async (req, res) => {

  const data = req.body;
  const db = await getConnection();
  const [rs] = await db.query('DELETE FROM Events WHERE event_id = ?', [data.id]);
  console.log('Connection successful! Test result:', rs);
  await db.end();
  res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.send('Event deleted!');

});

router.post('/modify', async (req, res) => {

  const data = req.body;
  const db = await getConnection();
  const [rs] = await db.query(
    `
    UPDATE Events
    SET start = ?, end = ?
    WHERE event_id = ?;
    `,
  [data.start, data.end, data.id]);
  console.log('Connection successful! Test result:', rs);
  await db.end();
  res.set('Access-Control-Allow-Origin', 'http://localhost:5173');
  res.send('Event modified!');

})

// Route to initiate Google OAuth2 flow
router.get('/authgooglecalendar', (req, res) => {
  try {
    console.log('🔐 Starting Google Calendar OAuth flow');
    console.log('- Request query params:', req.query);
    
    // Check if OAuth client is properly configured
    if (!process.env.CLIENT_ID || !(process.env.CLIENT_SECRET || process.env.SECRET_ID)) {
      console.error('❌ OAuth not configured - missing CLIENT_ID or CLIENT_SECRET');
      return res.status(500).json({ 
        error: 'OAuth not configured', 
        message: 'Missing Google OAuth credentials' 
      });
    }

    // Generate the Google authentication URL
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline', // Request offline access to receive a refresh token
      scope: 'https://www.googleapis.com/auth/calendar.readonly', // Scope for read-only access to the calendar
      state: req.query.email as string | undefined,
    });
    
    console.log('✅ Generated OAuth URL:', url);
    console.log('📧 User email from state:', req.query.email);
    
    // Redirect the user to Google's OAuth 2.0 server
    res.redirect(url);
  } catch (error) {
    console.error('❌ Error in OAuth flow initiation:', error);
    res.status(500).json({ 
      error: 'OAuth initialization failed', 
      message: error instanceof Error ? error.message : 'Unknown error' 
    });
  }
});

// Route to list all calendars
router.get('/calendars', async (req, res) => {
  try {
    console.log('📋 Fetching user calendars...');
    
    // Check if OAuth client has credentials
    if (!oauth2Client.credentials || !oauth2Client.credentials.access_token) {
      console.error('❌ No OAuth credentials available');
      return res.status(401).json({ 
        error: 'Not authenticated', 
        message: 'Please authenticate with Google Calendar first' 
      });
    }
    
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    const response = await calendar.calendarList.list();
    const calendars = response.data.items ?? [];
    
    console.log(`✅ Successfully fetched ${calendars.length} calendars`);
    res.json(calendars);
  } catch (err) {
    console.error("❌ Error fetching calendars:", err);
    console.error("Error details:", {
      name: err instanceof Error ? err.name : 'Unknown',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
    
    res.status(500).json({ 
      error: 'Error fetching calendars',
      message: err instanceof Error ? err.message : 'Unknown error'
    });
  }
});


// Route to list events from a specified calendar
router.get('/events', async (req, res) => {
  try {
    console.log('📅 Processing calendar events request');
    console.log('- Query params:', req.query);

    if (!req.query.code) {
      console.error('❌ Missing authorization code');
      return res.status(400).json({ error: 'Missing authorization code' });
    }

    const code = req.query.code as string;
    const email = req.query.state as string;
    
    console.log('🔑 Exchanging code for tokens...');
    console.log('- Email from state:', email);
    
    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);
    
    console.log('✅ OAuth tokens obtained successfully');

    const calendarId = (req.query.calendar as string) || 'primary';
    console.log('📋 Fetching events from calendar:', calendarId);

    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

    const response = await calendar.events.list({
      calendarId,
      timeMin: (new Date()).toISOString(),
      maxResults: 15,
      singleEvents: true,
      orderBy: 'startTime'
    });

    const events = response.data.items || [];
    console.log(`📅 Fetched ${events.length} events from Google Calendar`);

    // Save fetched events to DB
    await saveEventsToDB(events, email);
    console.log('💾 Events saved to database successfully');

    // Check environment to determine redirect URL
    const isProduction = process.env.NODE_ENV === 'production' || 
                        process.env.RENDER === 'true' || 
                        !!process.env.RENDER_SERVICE_ID;
    
    const redirectUrl = isProduction 
      ? 'https://api-gateway-latest-d2sg.onrender.com/calendar'
      : 'http://localhost:5173/calendar';
    
    console.log('🔄 Redirecting to:', redirectUrl);
    res.redirect(redirectUrl);
    
  } catch (err) {
    console.error("❌ OAuth or Calendar error:", err);
    console.error("Error details:", {
      name: err instanceof Error ? err.name : 'Unknown',
      message: err instanceof Error ? err.message : 'Unknown error',
      stack: err instanceof Error ? err.stack : 'No stack trace'
    });
    
    res.status(500).json({ 
      error: 'Error fetching or saving events',
      message: err instanceof Error ? err.message : 'Unknown error',
      details: 'Check server logs for more information'
    });
  }
});


type GoogleCalendarEvent = calendar_v3.Schema$Event;

const saveEventsToDB = async (events: GoogleCalendarEvent[],email:string) => {
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const db = await getConnection();
  console.log('its saving events')
  await db.query(
    `DELETE FROM Events WHERE category = 'Google Sync' AND email = ?`,
    [email]
  );
  for (const event of events) {
    const title = event.summary ?? '';
    const start = event.start?.dateTime ?? null;
    const end = event.end?.dateTime ?? null;
    const description = event.description ?? null;
    const guests = event.attendees
      ? event.attendees.map((a) => a.email).join(', ')
      : null;
    const location = event.location ?? null;

    // Default/fallback values
    const category = 'Google Sync';
    const caretaker = 'System';
    const recurrence = event.recurrence?.join(', ') ?? 'FREQ=DAILY;COUNT=1';


    if (!start || !end) continue; // Skip events without start/end

    await db.query(
      `
      INSERT INTO Events (title, category, start, end, caretaker, guests, location, description, recurrence, email)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        title,
        category,
        new Date(start),
        new Date(end),
        caretaker,
        guests,
        location,
        description,
        recurrence,
        email
      ]
    );
  }
};



export default router;