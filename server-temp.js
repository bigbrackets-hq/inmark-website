/* InMark site + Studio content server (no dependencies).
   - Serves the static site
   - Injects window.INMARK_CONTENT into every HTML page
   - GET/PUT /api/content persists content.json (the CMS store)
   - Missing routes get 404.html with a real 404 status */
const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const STORE = path.join(ROOT, 'content.json');
const PORT = 3440;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2'
};

function readContent() {
  try { return fs.readFileSync(STORE, 'utf8'); } catch (e) { return '{}'; }
}

function send(res, status, body, type) {
  res.writeHead(status, { 'Content-Type': type || 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

function serveHtml(res, file, status) {
  let html = fs.readFileSync(file, 'utf8');
  const inject = '<script>window.INMARK_CONTENT = ' + readContent() + ';</script>';
  html = html.includes('</head>') ? html.replace('</head>', inject + '\n</head>') : inject + html;
  send(res, status || 200, html, MIME['.html']);
}

const server = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');
  let p = decodeURIComponent(url.pathname);

  if (p === '/api/upload' && req.method === 'POST') {
    const name = (url.searchParams.get('name') || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 15e6) return req.destroy(); chunks.push(c); });
    req.on('end', () => {
      try {
        const dir = path.join(ROOT, 'assets', 'uploads');
        fs.mkdirSync(dir, { recursive: true });
        const fn = Date.now().toString(36) + '-' + name;
        fs.writeFileSync(path.join(dir, fn), Buffer.concat(chunks));
        send(res, 200, JSON.stringify({ ok: true, url: 'assets/uploads/' + fn }), MIME['.json']);
      } catch (e) { send(res, 500, '{"ok":false}', MIME['.json']); }
    });
    return;
  }

  if (p === '/api/login' && req.method === 'POST') {
    return send(res, 200, JSON.stringify({ ok: true, token: (Date.now() + 864e5) + '.local-dev' }), MIME['.json']);
  }

  const readL = (f) => { const fp = path.join(ROOT, f); return fs.existsSync(fp) ? JSON.parse(fs.readFileSync(fp, 'utf8')) : []; };
  const writeL = (f, v) => fs.writeFileSync(path.join(ROOT, f), JSON.stringify(v, null, 2));

  if (p === '/api/rsvp') {
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 1e5) req.destroy(); });
      req.on('end', () => {
        try {
          const b = JSON.parse(body || '{}');
          if (b.website) return send(res, 200, '{"ok":true,"id":"x"}', MIME['.json']);
          if (!b.name) return send(res, 400, '{"ok":false}', MIME['.json']);
          const all = readL('rsvps.local.json');
          const id = b.code || 'w' + Date.now().toString(36);
          const i = all.findIndex((r) => r.id === id);
          const entry = { id, code: b.code || null, name: b.name, org: b.org || '', contact: b.contact || '', seats: Math.min(8, Math.max(1, parseInt(b.seats, 10) || 1)), faceOptIn: !!b.faceOptIn, at: new Date().toISOString() };
          if (i >= 0) all[i] = entry; else all.push(entry);
          writeL('rsvps.local.json', all);
          send(res, 200, JSON.stringify({ ok: true, id }), MIME['.json']);
        } catch (e) { send(res, 500, '{"ok":false}', MIME['.json']); }
      });
      return;
    }
    if (req.method === 'GET') {
      const all = readL('rsvps.local.json');
      return send(res, 200, JSON.stringify({ ok: true, count: all.length, rsvps: all }), MIME['.json']);
    }
  }

  if (p === '/api/guest' && req.method === 'GET') {
    const c = url.searchParams.get('c') || '';
    const g = readL('guests.local.json').find((x) => x.code === c);
    if (!g) return send(res, 404, '{"ok":false}', MIME['.json']);
    return send(res, 200, JSON.stringify({ ok: true, name: g.name, org: g.org || '', role: g.role || '', rsvped: readL('rsvps.local.json').some((r) => r.id === c) }), MIME['.json']);
  }

  if (p === '/api/guests') {
    if (req.method === 'GET') {
      const all = readL('guests.local.json');
      all.forEach((g) => { g.link = 'http://localhost:3440/event/?i=' + g.code; });
      return send(res, 200, JSON.stringify({ ok: true, count: all.length, guests: all }), MIME['.json']);
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 5e5) req.destroy(); });
      req.on('end', () => {
        try {
          const b = JSON.parse(body || '{}');
          const all = readL('guests.local.json');
          const clean = (x) => String(x || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48);
          const mk = (row, code) => {
            const g = { code, name: row.name, org: row.org || '', role: row.role || '', createdAt: new Date().toISOString() };
            const i = all.findIndex((x) => x.code === code);
            if (i >= 0) all[i] = g; else all.push(g);
            return { ok: true, code, name: g.name, link: 'http://localhost:3440/event/?i=' + code };
          };
          if (Array.isArray(b.bulk)) {
            const prefix = clean(b.prefix) || 'px-iml-usr';
            const start = parseInt(b.start, 10) || 1;
            const tail = b.randomTail !== false;
            const made = b.bulk.filter((x) => x.name).map((row, i) => {
              const code = clean(row.code) || prefix + '-' + String(start + i).padStart(3, '0') + (tail ? '-' + require('crypto').randomBytes(2).toString('hex') : '');
              return mk(row, code);
            });
            writeL('guests.local.json', all);
            return send(res, 200, JSON.stringify({ ok: true, created: made.length, guests: made }), MIME['.json']);
          }
          if (!b.name) return send(res, 400, '{"ok":false}', MIME['.json']);
          const one = mk(b, clean(b.code) || require('crypto').randomBytes(5).toString('hex'));
          writeL('guests.local.json', all);
          send(res, 200, JSON.stringify(one), MIME['.json']);
        } catch (e) { send(res, 500, '{"ok":false}', MIME['.json']); }
      });
      return;
    }
    if (req.method === 'PUT') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 1e4) req.destroy(); });
      req.on('end', () => {
        try {
          const b = JSON.parse(body || '{}');
          const all = readL('guests.local.json');
          const g = all.find((x) => x.code === b.code);
          if (!g) return send(res, 404, '{"ok":false}', MIME['.json']);
          if (b.checked !== undefined) { g.checked = !!b.checked; g.checkedAt = g.checked ? new Date().toISOString() : null; }
          if (b.status !== undefined) { g.status = b.status; g.statusAt = new Date().toISOString(); }
          writeL('guests.local.json', all);
          send(res, 200, JSON.stringify({ ok: true, checked: g.checked, status: g.status || null }), MIME['.json']);
        } catch (e) { send(res, 500, '{"ok":false}', MIME['.json']); }
      });
      return;
    }
    if (req.method === 'DELETE') {
      const c = url.searchParams.get('c') || '';
      writeL('guests.local.json', readL('guests.local.json').filter((g) => g.code !== c));
      return send(res, 200, '{"ok":true}', MIME['.json']);
    }
  }

  if (p === '/api/faceid' && req.method === 'POST') {
    const chunks = [];
    let size = 0;
    req.on('data', (c) => { size += c.length; if (size > 4e6) return req.destroy(); chunks.push(c); });
    req.on('end', () => {
      try {
        const dir = path.join(ROOT, 'assets', 'uploads');
        fs.mkdirSync(dir, { recursive: true });
        const ref = (url.searchParams.get('c') || url.searchParams.get('r') || 'anon').replace(/[^a-z0-9._-]/gi, '');
        fs.writeFileSync(path.join(dir, 'face-' + ref + '.jpg'), Buffer.concat(chunks));
        send(res, 200, '{"ok":true,"enrolled":false,"pending":true}', MIME['.json']);
      } catch (e) { send(res, 500, '{"ok":false}', MIME['.json']); }
    });
    return;
  }

  if (p === '/api/content-js') {
    return send(res, 200, 'window.INMARK_CONTENT = ' + readContent() + ';', MIME['.js']);
  }

  if (p === '/api/content') {
    if (req.method === 'GET') return send(res, 200, readContent(), MIME['.json']);
    if (req.method === 'PUT' || req.method === 'POST') {
      let body = '';
      req.on('data', (c) => { body += c; if (body.length > 2e6) req.destroy(); });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const tmp = STORE + '.tmp';
          fs.writeFileSync(tmp, JSON.stringify(parsed, null, 2));
          fs.renameSync(tmp, STORE);
          send(res, 200, '{"ok":true}', MIME['.json']);
        } catch (e) {
          send(res, 400, '{"ok":false,"error":"invalid json"}', MIME['.json']);
        }
      });
      return;
    }
    return send(res, 405, 'method not allowed');
  }

  if (/^\/[a-z0-9]+(?:-[a-z0-9]+)+$/.test(p) && readL('guests.local.json').some((g) => '/' + g.code === p)) {
    res.writeHead(302, { Location: '/event/?i=' + p.slice(1) });
    return res.end();
  }
  if (p === '/') p = '/index.html';
  if (p.endsWith('/')) p += 'index.html';
  else if (!path.extname(p) && fs.existsSync(path.join(ROOT, p, 'index.html'))) p += '/index.html';
  const file = path.join(ROOT, path.normalize(p).replace(/^(\.\.[\/\\])+/, ''));
  if (!file.startsWith(ROOT)) return send(res, 403, 'forbidden');

  fs.stat(file, (err, st) => {
    if (err || !st.isFile()) {
      try { return serveHtml(res, path.join(ROOT, '404.html'), 404); }
      catch (e) { return send(res, 404, 'not found'); }
    }
    const ext = path.extname(file).toLowerCase();
    if (ext === '.html') return serveHtml(res, file);
    res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream', 'Cache-Control': ext === '.png' || ext === '.svg' ? 'public, max-age=3600' : 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
});

server.listen(PORT, '127.0.0.1', () => console.log('InMark site + Studio on http://localhost:' + PORT));
