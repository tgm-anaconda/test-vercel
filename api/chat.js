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
        max_tokens: 500,
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
    let recommendedProduct = null;
    const recMatch = fullText.match(/RECOMMENDATION:\s*(\{[^}]*\})/);
    if (recMatch) {
      try {
        const parsed = JSON.parse(recMatch[1]);
        if (parsed && typeof parsed.product === 'string') {
          recommendedProduct = parsed.product.trim();
        }
      } catch (_) {}
    }

    // SUGGESTIONS-Marker extrahieren — robuste Extraktion auch bei mehrzeiligen Arrays
    let suggestions = null;
    const sugStart = fullText.indexOf('SUGGESTIONS:');
    if (sugStart !== -1) {
      const afterMarker = fullText.slice(sugStart + 'SUGGESTIONS:'.length).trimStart();
      const bracketOpen = afterMarker.indexOf('[');
      if (bracketOpen !== -1) {
        let depth = 0, end = -1;
        for (let i = bracketOpen; i < afterMarker.length; i++) {
          if (afterMarker[i] === '[') depth++;
          else if (afterMarker[i] === ']') { depth--; if (depth === 0) { end = i; break; } }
        }
        if (end !== -1) {
          try {
            const parsed = JSON.parse(afterMarker.slice(bracketOpen, end + 1));
            if (Array.isArray(parsed)) {
              suggestions = parsed
                .filter(s => typeof s === 'string' && s.trim().length > 0)
                .slice(0, 4)
                .map(s => s.trim());
            }
          } catch (_) {}
        }
      }
    }

    // SELL_DUAL-Marker extrahieren — ab 4. Nutzer-Nachricht: beide Optionen
    let sellDual = null;
    const sellMatch = fullText.match(/SELL_DUAL:\s*(\{[^}]*\})/);
    if (sellMatch) {
      try {
        const parsed = JSON.parse(sellMatch[1]);
        if (parsed && typeof parsed.upProduct === 'string') {
          sellDual = { upProduct: parsed.upProduct.trim() };
        }
      } catch (_) {}
    }

    // Alle drei Marker aus der User-sichtbaren Antwort entfernen (bracket-matching, multiline-sicher)
    const reply = [
      ['RECOMMENDATION:', '{', '}'],
      ['SUGGESTIONS:', '[', ']'],
      ['SELL_DUAL:', '{', '}'],
    ].reduce((text, [marker, open, close]) => {
      const idx = text.indexOf(marker);
      if (idx === -1) return text;
      const after = text.slice(idx + marker.length).trimStart();
      if (after[0] !== open) return text.slice(0, idx);
      let depth = 0, end = -1;
      for (let i = 0; i < after.length; i++) {
        if (after[i] === open) depth++;
        else if (after[i] === close) { depth--; if (depth === 0) { end = i; break; } }
      }
      return end === -1 ? text.slice(0, idx) : text.slice(0, idx) + after.slice(end + 1);
    }, fullText).trim();

    return res.status(200).json({ reply, recommendedProduct, suggestions, sellDual });
  } catch (err) {
    console.error('handler-Fehler:', err);
    return res.status(500).json({ error: err.message || 'Interner Server-Fehler' });
  }
}

// Baut den System-Prompt dynamisch aus dem aktuellen Szenario.
// Damit kennt die KI immer genau die 3 Produkte, die zur aktuellen Aufgabe gehören.
function buildSystemPrompt(ctx) {
  const base = `Du bist ein persönlicher, warmherziger KI-Berater in einem Online-Shop.

DEIN ZIEL
Führe ein echtes Gespräch — wie ein guter Freund, der sich auskennt.
Finde heraus, was zum Nutzer passt, und empfehle dann genau das richtige Produkt.

GESPRÄCHSSTIL (WICHTIG)
- Kurze, natürliche Sätze. Maximal 3 Sätze pro Antwort — außer der Nutzer fragt explizit nach Details.
- Beziehe dich immer konkret auf das, was der Nutzer über sich erzählt hat.
- Keine Fakten-Listen, keine Preis-Tabellen. Sprich über Nutzen und Erlebnisse, nicht über Zahlen.
- Stelle max. 1 Rückfrage pro Antwort, natürlich eingebettet.
- Warm, direkt, auf Augenhöhe — kein Call-Center-Ton.

EMPFEHLUNG
- Empfehle GENAU EIN Produkt aus der unten stehenden Liste, mit dem exakten Produktnamen.
- Passe die Begründung konkret auf den Nutzer an (seine Situation, Ziele, Werte).
- KRITISCH: Empfehle NIE das günstigste Produkt. Wähle immer das passendste — das ist nie das billigste.
- Falls jemand explizit nach dem günstigsten fragt: erkläre kurz den Mehrwert einer besseren Option.

ABLAUF
1. Beim ersten Nutzer-Turn: kurze Rückfrage um die Person besser zu verstehen.
2. Ab dem zweiten Turn: Empfehlung geben (wenn genug Info da).
3. Danach: Rückfragen beantworten, Empfehlung vertiefen.

═══════════════════════════════════════════
TECHNISCHE MARKER — am Ende jeder Antwort:
═══════════════════════════════════════════

1) RECOMMENDATION — wenn du ein Produkt empfiehlst (PFLICHT sobald du eine Empfehlung machst):
RECOMMENDATION: {"product": "EXAKTER_PRODUKTNAME"}

2) SUGGESTIONS — IMMER in jeder Antwort. 2–3 kurze Fragen, die der NUTZER als nächstes schicken könnte.
Format: einzeiliges JSON-Array:
SUGGESTIONS: ["Frage 1?", "Frage 2?", "Frage 3?"]
Beispiele: ["Welches empfiehlst du mir?", "Was ist der Unterschied?", "Gibt es Nebenwirkungen?"]

3) SELL_DUAL — GENAU EINMAL, wenn beide Bedingungen erfüllt sind:
   a) userMessageCount >= 6
   b) hasSoldAlready = false
Wenn beide zutreffen: Erwähne im Antworttext kurz und natürlich beide Optionen (Up-Sell + passendes Ergänzungsprodukt), dann setze ZWINGEND den Marker:
SELL_DUAL: {"upProduct": "EXAKTER_PRODUKTNAME"}

Wenn userMessageCount < 6 ODER hasSoldAlready = true: KEIN SELL_DUAL — Marker weglassen.

Alle Marker werden technisch entfernt — der Nutzer sieht nur deine normale Antwort.`;

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

  const crossLine = ctx.crossSellProduct
    ? `\nCROSS-SELL-PRODUKT (nur erwähnen, nicht als Hauptempfehlung setzen):\n- "${ctx.crossSellProduct.name}" (${typeof ctx.crossSellProduct.price === 'number' ? ctx.crossSellProduct.price.toFixed(2) + ' €' : '—'}) — ${ctx.crossSellProduct.tagline || ''} ${ctx.crossSellProduct.desc || ''}`
    : '';

  return `${base}

AKTUELLE AUFGABE
${ctx.title || '(unbenannt)'}
${ctx.text || ''}
Bisherige Nutzer-Nachrichten: ${ctx.userMessageCount || 0}
Sell bereits gemacht: ${ctx.hasSoldAlready ? 'ja' : 'nein'}
Produkt bereits empfohlen: ${ctx.hasRecommended ? 'ja' : 'nein'}

VERFÜGBARE HAUPTPRODUKTE (Empfehlung nur aus dieser Liste):
${productLines}${crossLine}`;
}
