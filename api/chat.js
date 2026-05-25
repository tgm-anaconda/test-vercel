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
  const base = `Du bist ein natürlicher, freundlicher KI-Berater auf einer Online-Shop-Website.

ZIEL
Führe ein echtes Gespräch — nicht wie ein Formular. Personalisiere deine Empfehlung
basierend auf dem, was der Nutzer dir über sich erzählt (Bedürfnisse, Lifestyle, Werte).

REGELN
- Führe ein echtes, persönliches Gespräch — kein Formular, kein Call-Center-Ton.
- Erinnere dich aktiv an alles was der Nutzer bisher gesagt hat und beziehe dich explizit darauf.
- Wenn der Nutzer eine Situation, ein Ziel oder eine Präferenz nennt, greife das konkret wieder auf.
- Stelle max. 1–2 Rückfragen, natürlich eingebettet — nie als nummerierte Liste.
- Halte Antworten kurz (1–3 Sätze), aber lass Wärme und echtes Interesse spüren.
- Empfehle am Ende GENAU EIN Produkt aus der unten gelisteten Auswahl, mit dem exakten Produktnamen.
- Passe die Begründung konkret auf das an, was der Nutzer über sich erzählt hat.
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
TECHNISCHE MARKER — PFLICHT am Ende jeder Antwort:
═══════════════════════════════════════════════════════════════

1) RECOMMENDATION — nur wenn du ein Produkt empfiehlst:
RECOMMENDATION: { "product": "EXAKTER_PRODUKTNAME_AUS_DER_LISTE" }

2) SUGGESTIONS — IMMER, in jeder Antwort, ohne Ausnahme.
Gib genau 2–3 kurze Nachrichten, die der NUTZER als nächstes an DICH schicken könnte.
KRITISCH: Die Chips werden als Nutzernachricht an dich gesendet — sie müssen also als Frage
oder Aussage des Nutzers an den Bot formuliert sein, NIEMALS als Frage des Bots an den Nutzer.
FALSCH: "Was ist dein Ziel?", "Treibst du Sport?" (das wären Bot-Fragen an den Nutzer)
RICHTIG: "Was sind die Inhaltsstoffe?", "Lohnt sich der 2er-Pack?", "Gibt es Nebenwirkungen?"
WICHTIG: Beziehe dich konkret auf das, was gerade besprochen wurde.
Wiederhole NIEMALS Chips aus früheren Turns.
Format: einzeiliges JSON-Array, keine Zeilenumbrüche innerhalb:
SUGGESTIONS: ["Nutzerfrage 1?", "Nutzerfrage 2?", "Nutzerfrage 3?"]

Beispiele (nach Situation anpassen, NICHT kopieren):
- Nach erstem Bot-Satz: ["Welches empfiehlst du mir?", "Was ist der Unterschied?", "Was ist am nachhaltigsten?"]
- Nach Thema Sport/Abnehmen: ["Wirkt das auch ohne Sport?", "Wie lange bis ich Effekte merke?", "Ist das vegan?"]
- Nach Produktempfehlung: ["Was sind die Inhaltsstoffe?", "Wann am besten einnehmen?", "Gibt es Nebenwirkungen?"]
- Nach Upsell-Erwähnung: ["Was spare ich beim Vorteilspack?", "Wie lange reicht ein 2er-Pack?"]
- Nach Crosssell-Erwähnung: ["Wie kombiniere ich beides?", "Brauche ich wirklich beides?"]

3) SELL_DUAL — PFLICHT ab der 4. Nutzer-Nachricht (nur einmal pro Gespräch):

Wenn userMessageCount >= 4 UND hasSoldAlready === false:
Du MUSST eine natürliche Frage einbauen, die BEIDE Optionen anspricht — kontextbasiert und
passend zu dem, was der Nutzer bisher erzählt hat.

Baue die Frage so ein, dass sie sich organisch aus dem Gespräch ergibt:
- Erwähne kurz, dass es noch zwei interessante Ergänzungen gibt
- Beschreibe beide in einem Satz — eine leichte Empfehlung ist ok, aber lass dem Nutzer die Wahl
- Formuliere so, dass der Nutzer von selbst sagen kann was ihn mehr anspricht

Beispiele (NUR als Inspiration, NICHT kopieren — immer auf das konkrete Gespräch anpassen):
- Vitamins: "Übrigens — wärst du eher an einem 2er-Vorteilspack interessiert, oder kombinierst du das vielleicht lieber mit einem Shaker für deine Routine?"
- Event: "Könntest du dir vorstellen, jemanden mitzubringen? Oder wäre für dich eher ein VIP-Upgrade das Richtige?"
- Tablettenbox: "Nutzt du sowas eher alleine, oder wäre ein zweites Set für unterwegs interessant?"

Gib danach SELL_DUAL mit dem Namen des Hauptprodukts für den Up-Sell an:
SELL_DUAL: {"upProduct": "EXAKTER_PRODUKTNAME_AUS_DER_LISTE"}

Das Cross-Sell-Produkt ist bereits im System bekannt — du musst es nicht angeben.

Wenn userMessageCount < 4 ODER hasSoldAlready === true: KEIN Sell-Satz, KEIN SELL_DUAL-Marker.

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
