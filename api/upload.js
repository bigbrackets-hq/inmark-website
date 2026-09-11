/* Media uploads → Vercel Blob (Studio only) */
const verifyAuth = require('./_auth');
const { put } = require('@vercel/blob');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) {
    return res.status(501).json({ ok: false, error: 'No Blob store connected to this project yet' });
  }
  if (!verifyAuth(req)) return res.status(401).json({ ok: false, error: 'unauthorized' });
  try {
    const name = String(req.query.name || 'file').replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
    let buf;
    if (Buffer.isBuffer(req.body)) buf = req.body;
    else if (typeof req.body === 'string') buf = Buffer.from(req.body);
    else {
      const chunks = [];
      for await (const c of req) chunks.push(c);
      buf = Buffer.concat(chunks);
    }
    if (!buf.length || buf.length > 15e6) return res.status(400).json({ ok: false, error: 'empty or too large' });
    const blob = await put('uploads/' + Date.now().toString(36) + '-' + name, buf, {
      access: 'public',
      addRandomSuffix: false,
      contentType: req.headers['content-type'] || 'application/octet-stream'
    });
    return res.status(200).json({ ok: true, url: blob.url });
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
};
