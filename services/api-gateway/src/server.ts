import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Enhanced CORS configuration with security headers
app.use(cors({
  origin: [
    // Local development
    'http://localhost:5173', 
    'http://localhost:3000', 
    'http://localhost:3001',
    // Production URLs
    'https://frontend-e2tf.onrender.com',
    'https://api-gateway-latest-d2sg.onrender.com',
    // Allow all Render domains for flexibility
    /https:\/\/.*\.onrender\.com$/
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'x-requested-with', 'Access-Control-Allow-Origin']
}));

// Additional security headers for Google OAuth
app.use((req: any, res: any, next: any) => {
  res.header('Cross-Origin-Opener-Policy', 'same-origin-allow-popups');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  next();
});

app.use(express.json());

// ===========================================
// ENVIRONMENT-AWARE SERVICE CONFIGURATION
// ===========================================

// Detect environment - Force production mode on Render
// Explicitly check for Render environment variables
const isRender = process.env.RENDER === 'true' || 
                 !!process.env.RENDER_SERVICE_ID || 
                 !!process.env.RENDER_EXTERNAL_URL ||
                 process.env.NODE_ENV === 'production';

const isDocker = !isRender && 
                 (process.env.NODE_ENV === 'docker' || process.env.DOCKER === 'true');

console.log('🔍 Environment Detection:');
console.log('- RENDER:', process.env.RENDER);
console.log('- RENDER_SERVICE_ID:', !!process.env.RENDER_SERVICE_ID);
console.log('- RENDER_EXTERNAL_URL:', !!process.env.RENDER_EXTERNAL_URL);
console.log('- NODE_ENV:', process.env.NODE_ENV);
console.log('- DOCKER:', process.env.DOCKER);
console.log('- isRender:', isRender);
console.log('- isDocker:', isDocker);

// Service URL configuration based on environment
const SERVICES = isDocker ? {
  // Docker internal network URLs (only for local Docker Compose)
  login: 'http://login-service:3004',
  tasks: 'http://tasks-service:3006',
  forum: 'http://forum-service:3003',
  calendar: 'http://calendar-service:3005',
  claude: 'http://claude-service:3002',
  scraper: 'http://scraper-service:3007'
} : {
  // Production URLs for Render deployment
  login: 'https://login-service-uezx.onrender.com',
  tasks: 'https://tasks-service-dlpw.onrender.com',
  forum: 'https://forum-service-oj46.onrender.com',
  calendar: 'https://calendar-service-qrrh.onrender.com',
  claude: 'https://claude-service.onrender.com',
  scraper: 'https://scraper-service-365p.onrender.com'
};

console.log(`🌍 Environment: ${isDocker ? 'Docker' : 'Production'}`);
console.log('📍 Service URLs:', SERVICES);

// Health check
app.get('/health', (req: any, res: any) => {
  res.json({ 
    status: 'ok', 
    service: 'api-gateway',
    environment: isDocker ? 'docker' : 'local',
    services: SERVICES
  });
});

console.log('Setting up API Gateway routes...');

// ===========================================
// LOGIN SERVICE ROUTES (/api prefix)
// ===========================================

app.post('/api/validate', async (req: any, res: any) => {
  try {
    console.log('Routing /api/validate to login-service');
    console.log('Request body:', req.body);
    console.log('Target URL:', `${SERVICES.login}/login/validate`);
    
    const response = await fetch(`${SERVICES.login}/login/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    console.log('Response status:', response.status);
    console.log('Response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      console.log('Response not OK, status:', response.status);
    }
    
    const data = await response.json();
    console.log('Response data:', data);
    
    res.status(response.status).json(data);
  } catch (error: any) {
    console.error('Error routing to login service:', error);
    res.status(500).json({ 
      error: 'Gateway routing error', 
      message: error?.message || 'Unknown error',
      details: error?.toString() || 'No details available'
    });
  }
});

app.post('/api/register', async (req, res) => {
  try {
    console.log('Routing /api/register to login-service');
    const response = await fetch(`${SERVICES.login}/login/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to login service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.post('/api/check-google-user', async (req, res) => {
  try {
    console.log('Routing /api/check-google-user to login-service');
    console.log('Request body:', JSON.stringify(req.body, null, 2));
    console.log('Target URL:', `${SERVICES.login}/login/check-google-user`);
    
    const response = await fetch(`${SERVICES.login}/login/check-google-user`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    
    console.log('Login service response status:', response.status);
    console.log('Login service response headers:', response.headers);
    
    if (!response.ok) {
      console.error('Login service returned error status:', response.status);
      const errorText = await response.text();
      console.error('Login service error response:', errorText);
      return res.status(response.status).json({ 
        error: 'Login service error', 
        details: errorText,
        status: response.status 
      });
    }
    
    const data = await response.json();
    console.log('Login service response data:', data);
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to login service:', error);
    console.error('Error details:', {
      name: error?.name,
      message: error?.message,
      stack: error?.stack
    });
    res.status(500).json({ 
      error: 'Gateway routing error', 
      message: error?.message || 'Unknown error',
      details: error?.toString() || 'No details available'
    });
  }
});

app.post('/api/update-last-login', async (req, res) => {
  try {
    console.log('Routing /api/update-last-login to login-service');
    const response = await fetch(`${SERVICES.login}/login/update-last-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to login service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// ===========================================
// TASKS SERVICE ROUTES (/api/tasks)
// ===========================================

app.get('/api/tasks', async (req, res) => {
  try {
    console.log('Routing /api/tasks to tasks-service');
    const queryString = new URLSearchParams(req.query as any).toString();
    const url = `${SERVICES.tasks}/tasks${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to tasks service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.post('/api/tasks', async (req, res) => {
  try {
    console.log('Routing POST /api/tasks to tasks-service');
    const response = await fetch(`${SERVICES.tasks}/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to tasks service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.patch('/api/tasks/:id', async (req, res) => {
  try {
    console.log(`Routing PATCH /api/tasks/${req.params.id} to tasks-service`);
    const response = await fetch(`${SERVICES.tasks}/tasks/${req.params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to tasks service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.delete('/api/tasks/:id', async (req, res) => {
  try {
    console.log(`Routing DELETE /api/tasks/${req.params.id} to tasks-service`);
    const response = await fetch(`${SERVICES.tasks}/tasks/${req.params.id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to tasks service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// ===========================================
// FORUM/POSTS SERVICE ROUTES
// ===========================================

// Get all posts
app.get('/api/posts', async (req, res) => {
  try {
    console.log('Routing /api/posts to forum-service');
    const queryString = new URLSearchParams(req.query as any).toString();
    const url = `${SERVICES.forum}/posts${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to forum service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Get categories
app.get('/api/posts/categories', async (req, res) => {
  try {
    console.log('Routing /api/posts/categories to forum-service');
    const response = await fetch(`${SERVICES.forum}/posts/categories`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to forum service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Add posts
app.post('/api/posts/addposts', async (req, res) => {
  try {
    console.log('Routing POST /api/posts/addposts to forum-service');
    const response = await fetch(`${SERVICES.forum}/posts/addposts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to forum service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Add comments
app.post('/api/posts/addcomments', async (req, res) => {
  try {
    console.log('Routing POST /api/posts/addcomments to forum-service');
    const response = await fetch(`${SERVICES.forum}/posts/addcomments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to forum service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Get comments for a post
app.get('/api/posts/:postId/comments', async (req, res) => {
  try {
    console.log(`Routing /api/posts/${req.params.postId}/comments to forum-service`);
    const response = await fetch(`${SERVICES.forum}/posts/${req.params.postId}/comments`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to forum service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Delete comment
app.delete('/api/posts/deletecomment/:commentId', async (req, res) => {
  try {
    console.log(`Routing DELETE /api/posts/deletecomment/${req.params.commentId} to forum-service`);
    const response = await fetch(`${SERVICES.forum}/posts/deletecomment/${req.params.commentId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to forum service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Edit post
app.put('/api/posts/:postId/edit', async (req, res) => {
  try {
    console.log(`Routing PUT /api/posts/${req.params.postId}/edit to forum-service`);
    const response = await fetch(`${SERVICES.forum}/posts/${req.params.postId}/edit`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to forum service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Delete post
app.delete('/api/posts/delete/:postId', async (req, res) => {
  try {
    console.log(`Routing DELETE /api/posts/delete/${req.params.postId} to forum-service`);
    const response = await fetch(`${SERVICES.forum}/posts/delete/${req.params.postId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to forum service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// ===========================================
// CALENDAR SERVICE ROUTES (/api prefix)
// ===========================================

app.get('/api/calendar/testing', async (req, res) => {
  try {
    console.log('Routing /api/calendar/testing to calendar-service');
    const response = await fetch(`${SERVICES.calendar}/calendar/testing`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to calendar service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.get('/api/calendar/all', async (req, res) => {
  try {
    console.log('Routing /api/calendar/all to calendar-service');
    const queryString = new URLSearchParams(req.query as any).toString();
    const url = `${SERVICES.calendar}/calendar/all${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to calendar service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.post('/api/calendar/add', async (req, res) => {
  try {
    console.log('Routing POST /api/calendar/add to calendar-service');
    const response = await fetch(`${SERVICES.calendar}/calendar/add`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to calendar service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.post('/api/calendar/delete', async (req, res) => {
  try {
    console.log('Routing POST /api/calendar/delete to calendar-service');
    const response = await fetch(`${SERVICES.calendar}/calendar/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to calendar service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.post('/api/calendar/modify', async (req, res) => {
  try {
    console.log('Routing POST /api/calendar/modify to calendar-service');
    const response = await fetch(`${SERVICES.calendar}/calendar/modify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to calendar service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Google Calendar routes
app.get('/api/calendar/authgooglecalendar', async (req, res) => {
  try {
    console.log('Routing /api/calendar/authgooglecalendar to calendar-service');
    const queryString = new URLSearchParams(req.query as any).toString();
    const url = `${SERVICES.calendar}/calendar/authgooglecalendar${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (response.redirected) {
      return res.redirect(response.url);
    }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to calendar service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Auth route
app.get('/api/calendar/auth', async (req, res) => {
  try {
    console.log('Routing /api/calendar/auth to calendar-service');
    const queryString = new URLSearchParams(req.query as any).toString();
    const url = `${SERVICES.calendar}/calendar/auth${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (response.redirected) {
      return res.redirect(response.url);
    }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to calendar service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Calendars route
app.get('/api/calendar/calendars', async (req, res) => {
  try {
    console.log('Routing /api/calendar/calendars to calendar-service');
    const response = await fetch(`${SERVICES.calendar}/calendar/calendars`);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to calendar service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// Events route
app.get('/api/calendar/events', async (req, res) => {
  try {
    console.log('Routing /api/calendar/events to calendar-service');
    const queryString = new URLSearchParams(req.query as any).toString();
    const url = `${SERVICES.calendar}/calendar/events${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    if (response.redirected) {
      return res.redirect(response.url);
    }
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to calendar service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// ===========================================
// CLAUDE SERVICE ROUTES
// ===========================================

app.post('/api/claude', async (req, res) => {
  try {
    console.log('Routing /api/claude to claude-service');
    const response = await fetch(`${SERVICES.claude}/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to claude service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

// ===========================================
// SCRAPER SERVICE ROUTES
// ===========================================

app.get('/api/scrape-*', async (req, res) => {
  try {
    console.log(`Routing ${req.path} to scraper-service /scraper endpoint`);
    const queryString = new URLSearchParams(req.query as any).toString();
    
    const url = `${SERVICES.scraper}/scraper${queryString ? '?' + queryString : ''}`;
    
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to scraper service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.get('/api/scraper', async (req, res) => {
  try {
    console.log('Routing /api/scraper to scraper-service');
    const queryString = new URLSearchParams(req.query as any).toString();
    const url = `${SERVICES.scraper}/scraper${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to scraper service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});



// ===========================================
// BACKWARD COMPATIBILITY ROUTES (without /api)
// ===========================================

app.get('/posts', async (req, res) => {
  try {
    console.log('Routing /posts to forum-service');
    const queryString = new URLSearchParams(req.query as any).toString();
    const url = `${SERVICES.forum}/posts${queryString ? '?' + queryString : ''}`;
    const response = await fetch(url);
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to forum service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.post('/claude', async (req, res) => {
  try {
    console.log('Routing /claude to claude-service');
    const response = await fetch(`${SERVICES.claude}/claude`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req.body)
    });
    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    console.error('Error routing to claude service:', error);
    res.status(500).json({ error: 'Gateway routing error' });
  }
});

app.listen(PORT, () => {
  console.log(`🚪 API Gateway running on port ${PORT}`);
  console.log(`🌍 Environment: ${isDocker ? 'Docker' : 'Local Development'}`);
  console.log('🔀 Complete routing to all microservices configured!');
});