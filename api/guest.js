/* Public guest lookup for personalized invitations: GET /api/guest?c=CODE → {ok, name, org}.
   Only returns the name/org for an exact, unguessable code. */
const { list } = require('@vercel/blob');

module.exports = async (req, res) => {
  if (req.method !== 'GET') return res.status(405).end();
  if (!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) {
    return res.status(501).json({ ok: false });
  }
  const c = String(req.query.c || '').toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 48);
  if (!c) return res.status(400).json({ ok: false });
  try {
    const page = await list({ prefix: 'guests/' + c + '.json', limit: 1 });
    if (!page.blobs.length) return res.status(404).json({ ok: false });
    const g = await fetch(page.blobs[0].url).then((r) => r.json());
    let rsvped = false;
    try { rsvped = (await list({ prefix: 'rsvps/' + c + '.json', limit: 1 })).blobs.length > 0; } catch (e) {}
    return res.status(200).json({ ok: true, name: g.name, org: g.org || '', role: g.role || '', rsvped });
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
};
