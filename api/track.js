// Vercel Serverless Function — Tracking-Proxy für die VERDEA-Studie.
// Empfängt POST { ...trackingPayload } vom Browser und leitet es server-seitig
// an Google Apps Script weiter. Kein CORS-Problem, da Server-zu-Server.

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/test-vercel-ivory-omega\.vercel\.app(\/|$)/,
  /^https:\/\/test-vercel-[a-z0-9-]+\.vercel\.app(\/|$)/,
  /^http:\/\/localhost(:\d+)?(\/|$)/,
  /^http:\/\/127\.0\.0\.1(:\d+)?(\/|$)/,
];

const GAS_URL = 'https://script.google.com/macros/s/AKfycbyCpVWjN3UKMsh1OLv8FprGln5flGG6qNGs-i37XR-CAXZkGdGrYBGp5wMowCzP_p4/exec';

export default async function handler(req, res) {
  // CORS-Header damit der Browser die Antwort akzeptiert
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const origin = req.headers.origin || req.headers.referer || '';
  const originAllowed = ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin));
  if (!originAllowed) {
    console.warn('Blocked origin:', origin || '(empty)');
    return res.status(403).json({ error: 'Forbidden' });
  }

  try {
    const payload = req.body;
    if (!payload || typeof payload !== 'object') {
      return res.status(400).json({ error: 'Ungültiger Payload' });
    }

    const gasRes = await fetch(GAS_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'follow',
    });

    const text = await gasRes.text();
    let data;
    try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

    if (!gasRes.ok) {
      console.error('GAS-Fehler', gasRes.status, text.slice(0, 300));
      return res.status(502).json({ error: 'GAS-Anfrage fehlgeschlagen', details: data });
    }

    return res.status(200).json(data);
  } catch (err) {
    console.error('track-handler Fehler:', err);
    return res.status(500).json({ error: err.message || 'Interner Server-Fehler' });
  }
}
