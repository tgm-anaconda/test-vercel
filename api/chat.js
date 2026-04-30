// Vercel Serverless Function — KI-Berater für die VERDEA-Studie.
// Erwartet POST { message, scenarioContext, history }
// Gibt zurück { reply, recommendedProduct } oder { error }

// =============================================================
// SCHUTZ-KONFIG — Missbrauch der Function durch Fremde verhindern
// =============================================================

// Nur Aufrufe von diesen Origins/Referern erlauben.
// Wichtig: hier deine Production-URL plus ggf. localhost für Tests.
// Falls du später eine eigene Domain anbindest, hier ergänzen.
const ALLOWED_ORIGIN_PATTERNS = [
  /^https:\/\/test-vercel-ivory-omega\.vercel\.app(\/|$)/,
  // Auch Preview-URLs des gleichen Projekts erlauben (test-vercel-…-irgendwas.vercel.app)
  /^https:\/\/test-vercel-[a-z0-9-]+\.vercel\.app(\/|$)/,
  // Lokal entwickeln zulassen
  /^http:\/\/localhost(:\d+)?(\/|$)/,
  /^http:\/\/127\.0\.0\.1(:\d+)?(\/|$)/,
];

// Hard limits: User-Nachricht und Historie deckeln
const MAX_MESSAGE_LENGTH = 1000;       // 1000 Zeichen pro Frage reichen weit
const MAX_HISTORY_LENGTH = 30;         // mehr als 30 Turns ist nie sinnvoll

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // ---- Origin-Check ----
  // Browser senden bei fetch() automatisch Origin oder Referer mit. Andere Tools
  // (wie naïve Bots oder Scraper) tun das oft nicht oder mit anderem Wert.
  const origin = req.headers.origin || req.headers.referer || '';
  const originAllowed = ALLOWED_ORIGIN_PATTERNS.some(p => p.test(origin));
  if (!originAllowed) {
    console.warn('Blocked origin:', origin || '(empty)');
    return res.status(403).json({ error: 'Forbidden' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY fehlt (in Vercel unter Settings → Environment Variables setzen).' });
  }

  try {
    const { message, scenarioContext, history } = req.body || {};

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message fehlt oder ist ungültig' });
    }

    // ---- Längen-Limit für Nachricht ----
    if (message.length > MAX_MESSAGE_LENGTH) {
      return res.status(400).json({ error: `Nachricht zu lang (max ${MAX_MESSAGE_LENGTH} Zeichen)` });
    }

    // ---- Längen-Limit für Historie ----
    if (Array.isArray(history) && history.length > MAX_HISTORY_LENGTH) {
      return res.status(400).json({ error: `Historie zu lang (max ${MAX_HISTORY_LENGTH} Einträge)` });
    }

    // Konversations-Historie auf die letzten 10 Turns begrenzen (Token-Schonung)
    const safeHistory = Array.isArray(history)
      ? history
          .filter(m => m && typeof m.role === 'string' && typeof m.content === 'string')
          .slice(-10)
      : [];

    const messages = [
      { role: 'system', content: buildSystemPrompt(scenarioContext) },
      ...safeHistory,
      { role: 'user', content: message },
    ];

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages,
        temperature: 0.7,
        max_tokens: 350,
      }),
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('OpenAI-Error', response.status, errText);
      return res.status(502).json({
        error: 'OpenAI-Anfrage fehlgeschlagen',
        details: errText.slice(0, 300),
      });
    }

    const data = await response.json();
    const fullText = data?.choices?.[0]?.message?.content?.trim();
    if (!fullText) {
      return res.status(502).json({ error: 'Leere Antwort von OpenAI' });
    }

    // RECOMMENDATION-Marker extrahieren — KI markiert ihre Produktempfehlung explizit.
    // Beispiel: "… ich empfehle … RECOMMENDATION: { "product": "Pure D3 Premium" }"
    let recommendedProduct = null;
    const match = fullText.match(/RECOMMENDATION:\s*(\{[^}]*\})/);
    if (match) {
      try {
        const parsed = JSON.parse(match[1]);
        if (parsed && typeof parsed.product === 'string') {
          recommendedProduct = parsed.product.trim();
        }
      } catch (_) {
        // Marker fehlerhaft — egal, wir nutzen dann den Fallback im Frontend
      }
    }

    // Marker aus der dem User angezeigten Antwort entfernen
    const reply = fullText.replace(/RECOMMENDATION:\s*\{[^}]*\}/g, '').trim();

    return res.status(200).json({ reply, recommendedProduct });
  } catch (err) {
    console.error('handler-Fehler:', err);
    return res.status(500).json({ error: err.message || 'Interner Server-Fehler' });
  }
}

// Baut den System-Prompt dynamisch aus dem aktuellen Szenario.
// Damit kennt die KI immer genau die 3 Produkte, die zur aktuellen Aufgabe gehören.
function buildSystemPrompt(ctx) {
  const base = `Du bist ein natürlicher, freundlicher KI-Berater auf einer Online-Shop-Website.

ZIEL
Führe ein echtes Gespräch — nicht wie ein Formular.

REGELN
- Stelle maximal 2 persönliche Rückfragen, eingebettet in ein natürliches Gespräch.
- Keine nummerierten Fragen, keine langen Listen.
- Reagiere auf das, was der Nutzer sagt.
- Halte Antworten kurz (1–3 Sätze).
- Empfehle am Ende GENAU EIN Produkt aus der unten gelisteten Auswahl mit dem exakten Produktnamen.
- Erfinde keine Produkte und keine Eigenschaften, die nicht aufgelistet sind.
- Wenn die Frage nichts mit der Produktwahl zu tun hat, leite freundlich zurück zur Aufgabe.

ABLAUF
1. Verstehe den Nutzer.
2. Stelle ggf. Rückfragen (max. 2 insgesamt!).
3. Empfehle dann GENAU EIN Produkt aus der Liste.

WICHTIG — TECHNISCHER MARKER
Wenn du eine Produktempfehlung gibst, schreibe IMMER ans ENDE deiner Antwort:

RECOMMENDATION: { "product": "EXAKTER_PRODUKTNAME_AUS_DER_LISTE" }

Der Marker wird technisch entfernt, bevor der Nutzer die Antwort sieht — er ist nur fürs Tracking.`;

  if (!ctx || !Array.isArray(ctx.products) || ctx.products.length === 0) {
    return base;
  }

  const productLines = ctx.products
    .map(p => {
      const price = typeof p.price === 'number' ? `${p.price.toFixed(2)} €` : '—';
      const tagline = p.tagline ? `${p.tagline}. ` : '';
      const desc = p.desc || '';
      return `- "${p.name}" (${price}) — ${tagline}${desc}`;
    })
    .join('\n');

  return `${base}

AKTUELLE AUFGABE
${ctx.title || '(unbenannt)'}
${ctx.text || ''}

VERFÜGBARE PRODUKTE (genau aus diesen drei darf empfohlen werden):
${productLines}`;
}
