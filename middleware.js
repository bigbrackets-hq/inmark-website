/* Edge gate: /admin.html requires a valid session cookie */
export const config = { matcher: ['/admin.html'] };

async function hmacHex(key, msg) {
  const enc = new TextEncoder();
  const k = await crypto.subtle.importKey('raw', enc.encode(key), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', k, enc.encode(msg));
  return Array.from(new Uint8Array(sig)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

export default async function middleware(req) {
  const P = process.env.ADMIN_PASSWORD;
  if (!P) return; // no password configured — leave open rather than lock out
  const cookie = (req.headers.get('cookie') || '').match(/inmark_session=([^;\s]+)/);
  const token = cookie && cookie[1];
  if (token) {
    const dot = token.indexOf('.');
    if (dot > 0) {
      const exp = token.slice(0, dot);
      if (/^\d+$/.test(exp) && Number(exp) > Date.now()) {
        const expect = await hmacHex(P, exp);
        if (token.slice(dot + 1) === expect) return; // valid — let admin.html through
      }
    }
  }
  return Response.redirect(new URL('/login.html', req.url), 302);
}
