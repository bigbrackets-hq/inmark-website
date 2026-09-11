/* Launch-event registrations → Vercel Blob.
   POST (public, honeypot-guarded): {code?, name, org?, contact?, faceOptIn?}
     — a guest with an invite code overwrites their own record (re-registering updates it).
   GET (Studio auth required): full registration list with totals. */
const verifyAuth = require('./_auth');
const { put, list } = require('@vercel/blob');

module.exports = async (req, res) => {
  if (!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) {
    return res.status(501).json({ ok: false, error: 'No Blob store connected' });
  }

  if (req.method === 'POST') {
    try {
      let raw = req.body;
      if (Buffer.isBuffer(raw)) raw = raw.toString('utf8');
      const b = typeof raw === 'string' ? JSON.parse(raw) : raw || {};
      if (b.website) return res.status(200).json({ ok: true, id: 'x' }); // honeypot: pretend success
      const name = String(b.name || '').trim().slice(0, 120);
      const org = String(b.org || '').trim().slice(0, 160);
      const contact = String(b.contact || '').trim().slice(0, 160);
      const code = String(b.code || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48);
      const seats = Math.min(8, Math.max(1, parseInt(b.seats, 10) || 1));
      if (!name) return res.status(400).json({ ok: false, error: 'missing name' });
      const id = code || 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
      const entry = { id, code: code || null, name, org, contact, seats, faceOptIn: !!b.faceOptIn, at: new Date().toISOString() };
      await put('rsvps/' + id + '.json', JSON.stringify(entry), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json'
      });
      return res.status(200).json({ ok: true, id });
    } catch (e) {
      return res.status(500).json({ ok: false });
    }
  }

  if (req.method === 'GET') {
    if (!verifyAuth(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
    try {
      const out = [];
      let cursor;
      do {
        const page = await list({ prefix: 'rsvps/', cursor, limit: 1000 });
        for (const bl of page.blobs) {
          try { out.push(await fetch(bl.url).then((r) => r.json())); } catch (e) {}
        }
        cursor = page.hasMore ? page.cursor : undefined;
      } while (cursor);
      // attach face-enrollment state
      try {
        const faces = {};
        let fc;
        do {
          const fp = await list({ prefix: 'faceids/', cursor: fc, limit: 1000 });
          for (const bl of fp.blobs) {
            try { const f = await fetch(bl.url).then((r) => r.json()); faces[f.ref] = f; } catch (e) {}
          }
          fc = fp.hasMore ? fp.cursor : undefined;
        } while (fc);
        out.forEach((r) => {
          const f = faces[r.id] || (r.code && faces[r.code]);
          if (f) r.face = f.enrolled ? 'enrolled' : 'captured';
          else if (r.faceOptIn) r.face = 'opted-in';
        });
      } catch (e) {}
      out.sort((a, b2) => String(a.at).localeCompare(String(b2.at)));
      const seats = out.reduce((n, r) => n + (r.seats || 1), 0);
      return res.status(200).json({ ok: true, count: out.length, seats, rsvps: out });
    } catch (e) {
      return res.status(500).json({ ok: false });
    }
  }

  return res.status(405).end();
};
