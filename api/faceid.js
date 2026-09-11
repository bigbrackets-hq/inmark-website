/* Face ID enrollment for the launch event.
   POST /api/faceid?c=<guestCode> (or ?r=<rsvpId>) with a JPEG body:
   stores the capture in Blob and forwards it to ThirdFactor when configured.

   ThirdFactor integration: set THIRDFACTOR_API_URL and THIRDFACTOR_API_KEY in the
   project env; enrollThirdFactor() below is the single place to adapt once the
   real API contract (endpoint shape, auth header, response field) is confirmed. */
const { put } = require('@vercel/blob');

async function enrollThirdFactor(imageBuf, meta) {
  const url = process.env.THIRDFACTOR_API_URL;
  const key = process.env.THIRDFACTOR_API_KEY;
  if (!url || !key) return { enrolled: false, pending: true };
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: 'Bearer ' + key, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        image: imageBuf.toString('base64'),
        reference: meta.ref,
        name: meta.name || undefined
      })
    });
    if (!r.ok) return { enrolled: false, pending: true, error: 'thirdfactor ' + r.status };
    const j = await r.json();
    return { enrolled: true, faceId: j.faceId || j.id || null };
  } catch (e) {
    return { enrolled: false, pending: true, error: 'thirdfactor unreachable' };
  }
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();
  if (!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) {
    return res.status(501).json({ ok: false, error: 'No Blob store connected' });
  }
  try {
    const ref = String(req.query.c || req.query.r || 'anon').replace(/[^a-z0-9._-]/gi, '').slice(0, 40);
    let buf;
    if (Buffer.isBuffer(req.body)) buf = req.body;
    else {
      const chunks = [];
      for await (const ch of req) chunks.push(ch);
      buf = Buffer.concat(chunks);
    }
    if (!buf.length || buf.length > 4e6) return res.status(400).json({ ok: false, error: 'empty or too large' });

    const blob = await put('faces/' + ref + '-' + Date.now().toString(36) + '.jpg', buf, {
      access: 'public',
      addRandomSuffix: true,
      contentType: 'image/jpeg'
    });

    const tf = await enrollThirdFactor(buf, { ref });

    // record the enrollment state alongside the capture
    await put('faceids/' + ref + '.json', JSON.stringify({
      ref,
      captureUrl: blob.url,
      enrolled: !!tf.enrolled,
      thirdfactorId: tf.faceId || null,
      pending: !!tf.pending,
      at: new Date().toISOString()
    }), { access: 'public', addRandomSuffix: false, contentType: 'application/json' });

    return res.status(200).json({ ok: true, enrolled: !!tf.enrolled, pending: !!tf.pending });
  } catch (e) {
    return res.status(500).json({ ok: false });
  }
};
