// Lightweight Express server replacing `npm run preview`
// Handles SSR meta tag injection for Career Chronicle routes

import express from 'express';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();
const PORT = process.env.PORT || 4173;
const API_URL = process.env.VITE_API_URL;
const DIST = join(__dirname, 'dist');
const INDEX_HTML = readFileSync(join(DIST, 'index.html'), 'utf-8');

// Static assets (JS, CSS, images) — served directly, skip index.html fallback
app.use(express.static(DIST, { index: false }));

// Chronicle SSR handler: /:slug (single segment, valid slug chars, 3-50 length)
app.get('/:slug([a-z0-9][a-z0-9-]{1,48}[a-z0-9])', async (req, res, next) => {
  if (!API_URL) return next();

  try {
    const response = await fetch(`${API_URL}/api/v1/users/chronicle/${req.params.slug}`);
    if (!response.ok) return next(); // Not a valid chronicle — fall through to SPA

    const body = await response.json();
    if (!body.success || !body.data) return next();

    const { user, stories, meta } = body.data;

    // Escape values for safe HTML injection
    const esc = (s) => String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    const ogTitle = esc(`${user.name} — ${user.title || ''} ${user.company ? 'at ' + user.company : ''}`.trim());
    const ogDescription = esc(`${stories.length} published career ${stories.length === 1 ? 'story' : 'stories'}`);
    const ogImage = esc(user.avatar || '');
    const ogUrl = esc(`https://inchronicle.com/${user.profileUrl}`);

    const ogTags = [
      `<title>${esc(user.name)} — Career Chronicle | inchronicle</title>`,
      `<meta property="og:title" content="${ogTitle}" />`,
      `<meta property="og:description" content="${ogDescription}" />`,
      `<meta property="og:image" content="${ogImage}" />`,
      `<meta property="og:url" content="${ogUrl}" />`,
      `<meta property="og:type" content="profile" />`,
      `<meta name="twitter:card" content="summary" />`,
      !meta.allowSearchEngineIndexing ? '<meta name="robots" content="noindex">' : '',
      `<script>window.__CHRONICLE_DATA__ = ${JSON.stringify(body.data).replace(/</g, '\\u003c')};</script>`,
    ].filter(Boolean).join('\n    ');

    const html = INDEX_HTML.replace('</head>', `    ${ogTags}\n  </head>`);
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch {
    next(); // API unreachable — serve SPA, let client handle error
  }
});

// SPA fallback for all other routes
app.get('*', (req, res) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(INDEX_HTML);
});

app.listen(PORT, '0.0.0.0', () => console.log(`Frontend server on 0.0.0.0:${PORT}`));
