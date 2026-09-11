/* Guest registry (Studio auth required).
   GET  → full guest list with their unique invite links
   POST {name, org, role, code?} → creates one guest
   POST {bulk: [{name, org, role, code?}...], prefix?, start?, randomTail?} → creates many:
        codes become <prefix>-001[-x9f2], numbered from `start` (default 1);
        randomTail (default true) appends 4 unguessable chars — recommended, since
        purely sequential codes let anyone enumerate every guest's link.
   DELETE ?c=CODE → removes a guest */
const crypto = require('crypto');
const verifyAuth = require('./_auth');
const { put, list, del } = require('@vercel/blob');

const cleanCode = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48);
const LINK_BASE = () =>
  process.env.EVENT_LINK_BASE
    ? String(process.env.EVENT_LINK_BASE).replace(/\/$/, '') + '/'
    : 'https://' + (process.env.VERCEL_PROJECT_PRODUCTION_URL || 'inmark-website.vercel.app') + '/event/?i=';

async function createGuest(g) {
  const name = String(g.name || '').trim().slice(0, 120);
  const org = String(g.org || '').trim().slice(0, 160);
  const role = String(g.role || '').trim().slice(0, 120);
  if (!name) return { ok: false, error: 'name required' };
  const code = cleanCode(g.code) || crypto.randomBytes(5).toString('hex');
  if (code.length < 4) return { ok: false, error: 'code too short' };
  const guest = { code, name, org, role, createdAt: new Date().toISOString() };
  await put('guests/' + code + '.json', JSON.stringify(guest), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json'
  });
  return { ok: true, code, name, org, role, link: LINK_BASE() + code };
}

module.exports = async (req, res) => {
  if (!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) {
    return res.status(501).json({ ok: false, error: 'No Blob store connected' });
  }
  if (!verifyAuth(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });

  try {
    if (req.method === 'POST') {
      let raw = req.body;
      if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
      const b = typeof raw === 'string' ? JSON.parse(raw) : raw || {};

      if (Array.isArray(b.bulk)) {
        const rows = b.bulk.slice(0, 500);
        const prefix = cleanCode(b.prefix) || 'px-iml-usr';
        const start = Math.max(0, parseInt(b.start, 10) || 1);
        const tail = b.randomTail !== false;
        const out = [];
        for (let i = 0; i < rows.length; i++) {
          const seq = String(start + i).padStart(3, '0');
          const code = cleanCode(rows[i].code) ||
            prefix + '-' + seq + (tail ? '-' + crypto.randomBytes(2).toString('hex') : '');
          out.push(await createGuest({ ...rows[i], code }));
        }
        const made = out.filter((r) => r.ok);
        return res.status(200).json({ ok: true, created: made.length, failed: out.length - made.length, guests: made });
      }

      const one = await createGuest(b);
      return res.status(one.ok ? 200 : 400).json(one);
    }

    if (req.method === 'PUT') {
      let raw = req.body;
      if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
      const b = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
      const c = cleanCode(b.code);
      if (!c) return res.status(400).json({ ok: false });
      const page = await list({ prefix: 'guests/' + c + '.json', limit: 1 });
      if (!page.blobs.length) return res.status(404).json({ ok: false });
      const g = await fetch(page.blobs[0].url).then((r) => r.json());
      if (b.checked !== undefined) {
        g.checked = !!b.checked;
        g.checkedAt = g.checked ? new Date().toISOString() : null;
      }
      if (b.status !== undefined) {
        const ok = ['listed', 'invited', "rsvp'd", 'checkin', 'no-show', 'cancelled'];
        if (!ok.includes(b.status)) return res.status(400).json({ ok: false, error: 'bad status' });
        g.status = b.status;
        g.statusAt = new Date().toISOString();
      }
      await put('guests/' + c + '.json', JSON.stringify(g), {
        access: 'public', addRandomSuffix: false, allowOverwrite: true, contentType: 'application/json'
      });
      return res.status(200).json({ ok: true, checked: g.checked, status: g.status || null });
    }

    if (req.method === 'DELETE') {
      const c = cleanCode(req.query.c);
      if (!c) return res.status(400).json({ ok: false });
      const page = await list({ prefix: 'guests/' + c + '.json', limit: 1 });
      if (page.blobs.length) await del(page.blobs[0].url);
      return res.status(200).json({ ok: true });
    }

    if (req.method === 'GET') {
      const out = [];
      let cursor;
      do {
        const page = await list({ prefix: 'guests/', cursor, limit: 1000 });
        for (const bl of page.blobs) {
          try { out.push(await fetch(bl.url).then((r) => r.json())); } catch (e) {}
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      out.sort((a, b) => String(a.code).localeCompare(String(b.code)));
      const base = LINK_BASE();
      out.forEach((g) => { g.link = base + g.code; });
      return res.status(200).json({ ok: true, count: out.length, guests: out });
    }

    return res.status(405).end();
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
};
