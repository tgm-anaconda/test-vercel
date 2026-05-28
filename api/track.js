// Vercel Serverless Function — Tracking-Proxy für die VERDEA-Studie.
// Empfängt POST { ...trackingPayload } vom Browser und leitet es server-seitig
// an Google Apps Script weiter. Kein CORS-Problem, da Server-zu-Server.
//
// FALLBACK-LOGIK: Wird Sheet 1 abgelehnt (GAS Concurrency-Limit), wird
// automatisch Sheet 2 versucht, dann Sheet 3, usw.
// Jedes Sheet kann 6 gleichzeitige Anfragen verarbeiten.
// Mit 4 Sheets: bis zu 24 gleichzeitige Antworten abgesichert.

// =============================================================
// ✏️  HIER NUR DIE GAS-URLS PFLEGEN — eine URL pro Zeile
// =============================================================
const GAS_URLS = [
  'https://script.google.com/macros/s/AKfycbweLt0Tl8JSS499dLBjcp19WyYiVnvRNjHgCVbIoryqseuEfh8cUucJhmyzasr5i_M/exec', // Sheet 1
  'https://script.google.com/macros/s/AKfycbz336NB3YpxSpanu6A6AHt3YerYOUMJTUr3IVK3Fss8Z2fkxvbumuJ6EOezss0J9VzF/exec', // Sheet 2
  'https://script.google.com/macros/s/AKfycbyNyD2iPT6MOHJNTmBUwdyll3EM2yR8jTi6dflteCzAV_pbtHFoBS7tXRCLAlp99She/exec', // Sheet 3
  'https://script.google.com/macros/s/AKfycbxwVvt9-jpOBQXQJ-QTHCRtHPoChWuIPTwVS5eqvrg0q2rDIDpbDCRJkHR-TCL5W_d2/exec', // Sheet 4
];
// =============================================================

const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/test-vercel-ivory-omega\.vercel\.app(\/|$)/,
  /^https:\/\/test-vercel-[a-z0-9-]+\.vercel\.app(\/|$)/,
  /^http:\/\/localhost(:\d+)?(\/|$)/,
  /^http:\/\/127\.0\.0\.1(:\d+)?(\/|$)/,
];

const RETRIES_PER_SHEET = 2;   // Versuche pro Sheet bevor zum nächsten gewechselt wird
const BASE_DELAY_MS    = 600;  // Wartezeit zwischen Versuchen (exponentiell)

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Versucht einen einzelnen GAS-Endpoint mehrfach anzusprechen.
// Gibt { ok: true, data } oder { ok: false } zurück.
async function tryGAS(url, payload, retries) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const gasRes = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        redirect: 'follow',
      });

      const text = await gasRes.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }

      if (gasRes.ok) {
        return { ok: true, data };
      }

      console.warn(`GAS ${url.slice(-20)} Fehler (Versuch ${attempt}/${retries}): ${gasRes.status}`);
    } catch (err) {
      console.warn(`GAS ${url.slice(-20)} Netzwerkfehler (Versuch ${attempt}/${retries}): ${err.message}`);
    }

    if (attempt < retries) {
      await sleep(BASE_DELAY_MS * attempt + Math.random() * 300);
    }
  }
  return { ok: false };
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST')    return res.status(405).json({ error: 'Method not allowed' });

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

    // Alle Sheets der Reihe nach versuchen
    for (let i = 0; i < GAS_URLS.length; i++) {
      const result = await tryGAS(GAS_URLS[i], payload, RETRIES_PER_SHEET);
      if (result.ok) {
        if (i > 0) console.log(`Gespeichert in Fallback-Sheet ${i + 1}`);
        return res.status(200).json(result.data);
      }
      console.warn(`Sheet ${i + 1} nicht erreichbar — wechsle zu Sheet ${i + 2}`);
    }

    // Alle Sheets gescheitert
    console.error('Alle GAS-Sheets fehlgeschlagen');
    return res.status(502).json({ error: 'Alle Tracking-Sheets nicht erreichbar' });

  } catch (err) {
    console.error('track-handler Fehler:', err);
    return res.status(500).json({ error: err.message || 'Interner Server-Fehler' });
  }
}
