/* Live content as a blocking script: window.INMARK_CONTENT = {...} */
module.exports = async (req, res) => {
  res.setHeader('Content-Type', 'text/javascript; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  try {
    const data = await fetch('https://' + (process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL) + '/api/content').then((r) => r.text());
    JSON.parse(data); // sanity
    res.status(200).send('window.INMARK_CONTENT = ' + data + ';');
  } catch (e) {
    res.status(200).send('/* live content unavailable — using bundled snapshot */');
  }
};
