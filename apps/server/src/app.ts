import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { progressRouter } from './routes/progress.routes';
import { employeeRouter } from './routes/employee.routes';
import { projectRouter } from './routes/project.routes';
import { clientRouter } from './routes/client.routes';
import { taskRouter } from './routes/task.routes';
import auditRouter from './routes/audit.routes';
import notificationRouter from './routes/notification.routes';

dotenv.config();

export const app = express();

const clientUrl = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(
  cors({
    origin: [clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
  })
);

app.use(express.json());

// Root Welcome & Status Endpoint (HTML for browsers, JSON for API requests)
app.get('/', (req: Request, res: Response) => {
  if (req.accepts('html')) {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Inspection Platform API — Online</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; }
    body { background-color: #0f172a; color: #f8fafc; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 16px; padding: 36px; max-width: 600px; width: 100%; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .header { display: flex; align-items: center; gap: 16px; margin-bottom: 24px; }
    .badge { background: #10b981; color: #022c22; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 0.05em; display: inline-flex; align-items: center; gap: 6px; }
    .badge::before { content: ""; width: 6px; height: 6px; background: #047857; border-radius: 50%; display: inline-block; }
    h1 { font-size: 22px; font-weight: 700; color: #ffffff; }
    p { font-size: 13px; color: #94a3b8; line-height: 1.6; margin-top: 6px; }
    .divider { height: 1px; background: #334155; margin: 24px 0; }
    .endpoints { list-style: none; display: flex; flex-direction: column; gap: 8px; }
    .endpoint { display: flex; align-items: center; justify-content: space-between; padding: 10px 14px; background: #0f172a; border-radius: 8px; border: 1px solid #1e293b; text-decoration: none; color: #e2e8f0; font-size: 12px; transition: border-color 0.2s; }
    .endpoint:hover { border-color: #6366f1; color: #ffffff; }
    .method { font-weight: 700; font-family: monospace; font-size: 11px; color: #818cf8; }
    .path { font-family: monospace; }
    .cta { margin-top: 28px; text-align: center; }
    .btn { display: inline-block; background: #6366f1; color: #ffffff; font-weight: 600; font-size: 13px; padding: 12px 24px; border-radius: 8px; text-decoration: none; transition: background 0.2s; }
    .btn:hover { background: #4f46e5; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div>
        <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 6px;">
          <span class="badge">Online</span>
          <span style="font-size: 11px; color: #64748b; font-family: monospace;">Port 5000</span>
        </div>
        <h1>Inspection Platform API</h1>
        <p>Backend microservice engine for the Inspection Project Management Platform.</p>
      </div>
    </div>
    <div class="divider"></div>
    <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: #64748b; margin-bottom: 12px;">Active REST Endpoints</div>
    <div class="endpoints">
      <a class="endpoint" href="/api/health"><span class="method">GET</span><span class="path">/api/health</span></a>
      <a class="endpoint" href="/api/projects"><span class="method">GET</span><span class="path">/api/projects</span></a>
      <a class="endpoint" href="/api/clients"><span class="method">GET</span><span class="path">/api/clients</span></a>
      <a class="endpoint" href="/api/employees"><span class="method">GET</span><span class="path">/api/employees</span></a>
      <a class="endpoint" href="/api/audit-logs"><span class="method">GET</span><span class="path">/api/audit-logs</span></a>
      <a class="endpoint" href="/api/notifications"><span class="method">GET</span><span class="path">/api/notifications</span></a>
    </div>
    <div class="cta">
      <a class="btn" href="${clientUrl}">Open Inspection Web Application &rarr;</a>
    </div>
  </div>
</body>
</html>
    `);
  }

  return res.json({
    status: 'online',
    service: 'Inspection Project Management Platform API',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      projects: '/api/projects',
      clients: '/api/clients',
      employees: '/api/employees',
      audit_logs: '/api/audit-logs',
      notifications: '/api/notifications',
      manager_dashboard: '/api/dashboard/manager',
      progress_recalculate: '/api/stages/:id/recalculate',
      stage_override: '/api/stages/:id/override',
    },
  });
});

// Health Check Endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Inspection Project Management Platform API',
  });
});

// Mount Routes
app.use('/api', progressRouter);
app.use('/api', employeeRouter);
app.use('/api', projectRouter);
app.use('/api', clientRouter);
app.use('/api', taskRouter);
app.use('/api/audit-logs', auditRouter);
app.use('/api/notifications', notificationRouter);

// Graceful 404 Handler
app.use((req: Request, res: Response) => {
  if (req.accepts('html')) {
    return res.status(404).send(`
      <body style="background:#0f172a;color:#f8fafc;font-family:sans-serif;text-align:center;padding:50px;">
        <h2 style="color:#ef4444;">404 &mdash; Inspection API Endpoint Not Found</h2>
        <p style="color:#94a3b8;margin:16px 0;">Cannot ${req.method} ${req.originalUrl}</p>
        <a href="/" style="color:#818cf8;text-decoration:none;font-weight:600;">&larr; View Available Endpoints</a>
      </body>
    `);
  }
  return res.status(404).json({
    success: false,
    error: `Cannot ${req.method} ${req.originalUrl}`,
    suggestion: 'Visit / for list of active endpoints',
  });
});
