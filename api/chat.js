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

    // SUGGESTIONS-Marker extrahieren — KI gibt 3 dynamische Folgefragen zurück
    let suggestions = null;
    const sugMatch = fullText.match(/SUGGESTIONS:\s*(\[[^\]]*\])/);
    if (sugMatch) {
      try {
        const parsed = JSON.parse(sugMatch[1]);
        if (Array.isArray(parsed)) {
          suggestions = parsed
            .filter(s => typeof s === 'string' && s.trim().length > 0)
            .slice(0, 4)
            .map(s => s.trim());
        }
      } catch (_) {}
    }

    // SELL_TYPE-Marker extrahieren — ab 3. Nutzer-Nachricht: up oder cross
    let sellType = null;
    const sellMatch = fullText.match(/SELL_TYPE:\s*(\{[^}]*\})/);
    if (sellMatch) {
      try {
        const parsed = JSON.parse(sellMatch[1]);
        if (parsed && (parsed.type === 'up' || parsed.type === 'cross')) {
          sellType = parsed.type;
        }
      } catch (_) {}
    }

    // Alle drei Marker aus der User-sichtbaren Antwort entfernen
    const reply = fullText
      .replace(/RECOMMENDATION:\s*\{[^}]*\}/g, '')
      .replace(/SUGGESTIONS:\s*\[[^\]]*\]/g, '')
      .replace(/SELL_TYPE:\s*\{[^}]*\}/g, '')
      .trim();

    return res.status(200).json({ reply, recommendedProduct, suggestions, sellType });
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
Führe ein echtes Gespräch — nicht wie ein Formular. Personalisiere deine Empfehlung
basierend auf dem, was der Nutzer dir über sich erzählt (Bedürfnisse, Lifestyle, Werte).

REGELN
- Stelle max. 2 persönliche Rückfragen, eingebettet in ein natürliches Gespräch.
- Keine nummerierten Fragen, keine langen Listen.
- Reagiere auf das, was der Nutzer sagt.
- Halte Antworten kurz (1–3 Sätze).
- Empfehle am Ende GENAU EIN Produkt aus der unten gelisteten Auswahl, mit dem exakten Produktnamen.
- Erfinde keine Produkte und keine Eigenschaften, die nicht aufgelistet sind.

WICHTIGE EMPFEHLUNGS-EINSCHRÄNKUNG (kritisch)
- Du darfst NIEMALS das günstigste/billigste Produkt der Liste als Hauptempfehlung geben.
- Empfehle stattdessen das Produkt, das am besten zur Person passt — solange es nicht das günstigste ist.
- Falls Person explizit nach dem billigsten fragt, kläre den Nutzen ab und empfehle wenn möglich
  trotzdem ein leicht höher-positioniertes Produkt mit klarer Begründung.

ABLAUF
1. Verstehe den Nutzer.
2. Stelle ggf. 1–2 Rückfragen.
3. Empfehle dann GENAU EIN Produkt (NIE das günstigste).

═══════════════════════════════════════════════════════════════
TECHNISCHE MARKER — IMMER am ENDE deiner Antwort, IMMER alle:
═══════════════════════════════════════════════════════════════

1) Bei Produktempfehlung:
RECOMMENDATION: { "product": "EXAKTER_PRODUKTNAME" }

2) IMMER (auch ohne Empfehlung) — 3 dynamische Folgefragen passend zum aktuellen Gesprächskontext.
Die Fragen sollen die Konversation natürlich weiterführen — nicht generisch sein,
sondern auf das eingehen was gerade besprochen wurde:

SUGGESTIONS: ["Frage 1?", "Frage 2?", "Frage 3?"]

Beispiele für gute Folgefragen je Phase:
- Anfang: ["Was sind die Unterschiede?", "Welches passt für Anfänger?", "Was kostet das?"]
- Nach Rückfrage: ["Ich habe wenig Zeit — was empfiehlst du?", "Ist das vegan?", "Wie wirkt es?"]
- Nach Empfehlung: ["Welche Mengen-Variante lohnt sich?", "Gibt es Alternativen?", "Wann sehe ich Effekte?"]

SELL-LOGIK (greift ab Nachricht 3, nie früher):
Der Wert "userMessageCount" im Kontext gibt an, wie viele Nachrichten der Nutzer bisher geschrieben hat.

Wenn userMessageCount >= 3:
A) PRODUKTSPEZIFISCHES INTERESSE (Fragen zu Inhaltsstoffen, Dosierung, Vergleich ähnlicher Produkte, Preis eines konkreten Produkts):
   → Betreibe Up-Sell: Erwähne aktiv, dass es die empfohlene Variante auch in einer größeren Packung/höherem Tier gibt oder dass ein Upgrade noch besser zu den Bedürfnissen passt. Benenne das teurere Produkt explizit mit Namen.
   → Setze am Ende: SELL_TYPE: {"type": "up"}

B) KATEGORISCHES INTERESSE (allgemeines Interesse, Vergleich verschiedener Kategorien, "was empfiehlst du grundsätzlich"):
   → Betreibe Cross-Sell: Erwähne das Ergänzungsprodukt (aus CROSS-SELL-PRODUKT unten) als sinnvolle Ergänzung in einem natürlichen Satz.
   → Setze am Ende: SELL_TYPE: {"type": "cross"}

Wenn userMessageCount < 3: KEIN SELL_TYPE-Marker setzen.

Alle Marker werden technisch entfernt — der User sieht nur deine Konversations-Antwort.`;

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

VERFÜGBARE HAUPTPRODUKTE (Empfehlung nur aus dieser Liste):
${productLines}${crossLine}`;
}
