/* Pre-deploy build: snapshot content.json into a static script so Vercel
   (no Node server) still serves CMS-managed content. Locally, server.js
   injects a fresher copy after this one, so the live store always wins. */
const fs = require('fs');
const content = fs.readFileSync('content.json', 'utf8');
fs.writeFileSync('js/content-store.js', 'window.INMARK_CONTENT = ' + content.trim() + ';\n');
console.log('js/content-store.js written (' + content.length + ' bytes)');
