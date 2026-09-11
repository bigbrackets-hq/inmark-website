/* Studio sign-in → signed session token (stateless HMAC, 7 days) */
const crypto = require('crypto');

module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).end();
  const { username, password } = (typeof req.body === 'object' && req.body) || {};
  const U = process.env.ADMIN_USER || 'ashish';
  const P = process.env.ADMIN_PASSWORD;
  if (!P || username !== U || password !== P) {
    return res.status(401).json({ ok: false, error: 'Wrong username or password' });
  }
  const exp = Date.now() + 7 * 24 * 3600 * 1000;
  const sig = crypto.createHmac('sha256', P).update(String(exp)).digest('hex');
  return res.status(200).json({ ok: true, token: exp + '.' + sig, exp });
};
