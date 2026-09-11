/* CMS store — Vercel Blob backed, falls back to the deployed snapshot */
const verifyAuth = require('./_auth');
const { put, list } = require('@vercel/blob');
const KEY = 'cms/content.json';

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');


  if (req.method === 'GET') {
    if ((process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) {
      try {
        const r = await list({ prefix: 'cms/' });
        const b = r.blobs.find((x) => x.pathname === KEY);
        if (b) {
          const data = await fetch(b.url + '?ts=' + Date.now()).then((r2) => r2.text());
          res.setHeader('Content-Type', 'application/json');
          return res.status(200).send(data);
        }
      } catch (e) { /* fall through to snapshot */ }
    }
    try {
      const txt = await fetch('https://' + (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL) + '/js/content-store.js').then((r2) => r2.text());
      const json = txt.replace(/^window\.INMARK_CONTENT = /, '').replace(/;\s*$/, '');
      res.setHeader('Content-Type', 'application/json');
      return res.status(200).send(json);
    } catch (e) {
      return res.status(500).json({ ok: false });
    }
  }

  if (req.method === 'PUT' || req.method === 'POST') {
    if (!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) {
      return res.status(501).json({ ok: false, error: 'No Blob store connected to this project yet' });
    }
    if (!verifyAuth(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
    try {
      const data = typeof req.body === 'object' && req.body !== null ? req.body : JSON.parse(String(req.body || ''));
      await put(KEY, JSON.stringify(data, null, 2), {
        access: 'public',
        addRandomSuffix: false,
        allowOverwrite: true,
        contentType: 'application/json'
      });
      return res.status(200).json({ ok: true });
    } catch (e) {
      return res.status(400).json({ ok: false, error: String(e && e.message || e).slice(0, 300) });
    }
  }

  res.status(405).end();
};
