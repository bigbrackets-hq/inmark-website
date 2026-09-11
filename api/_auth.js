/* Shared verifier: accepts a signed session token or the raw admin password */
const crypto = require('crypto');

module.exports = function verifyAuth(req) {
  const P = process.env.ADMIN_PASSWORD;
  if (!P) return false;
  const auth = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!auth) return false;
  if (auth === P) return true; // direct password (curl / scripts)
  const dot = auth.indexOf('.');
  if (dot < 1) return false;
  const exp = auth.slice(0, dot);
  const sig = auth.slice(dot + 1);
  if (!/^\d+$/.test(exp) || Number(exp) < Date.now()) return false;
  const expect = crypto.createHmac('sha256', P).update(exp).digest('hex');
  try {
    return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expect));
  } catch (e) { return false; }
};
