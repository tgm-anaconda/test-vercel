export default async function handler(req, res) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({ error: "API Key fehlt" });
  }

  const { messages } = req.body;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "gpt-4o-mini", // 💸 günstig
      messages: [
        {
          role: "system",
          content: `
Du bist ein natürlicher, freundlicher KI-Berater für Nahrungsergänzung.

ZIEL:
Führe ein echtes Gespräch – nicht wie ein Formular.

REGELN:
- Stelle maximal 2 persönliche Fragen
- Stelle sie eingebettet in ein natürliches Gespräch
- Keine nummerierten Fragen
- Reagiere auf das, was der Nutzer sagt
- Halte Antworten kurz (1–3 Sätze)

PRODUKTE:
- Ashwagandha → Stress, Entspannung
- Vitamin D3 + K2 → Energie, Immunsystem
- Omega-3 → Gehirn, Herz
- Probiotika → Darm, Immunsystem

ABLAUF:
1. Verstehe den Nutzer
2. Stelle ggf. Rückfragen (max. 2 insgesamt!)
3. Empfehle dann genau EIN Produkt

WICHTIG:
Am Ende deiner Empfehlung schreibe IMMER:

RECOMMENDATION: { "product": "NAME" }

(Unsichtbar für Nutzer, wird technisch ausgewertet)
`
        },
        ...messages
      ]
    })
  });

  const data = await response.json();
  const text = data.choices[0].message.content;

  // 🔍 Produkt extrahieren
  let recommendedProduct = null;

  try {
    const match = text.match(/RECOMMENDATION:\s*(\{.*\})/);
    if (match) {
      const parsed = JSON.parse(match[1]);
      recommendedProduct = parsed.product;
    }
  } catch (e) {}

  return res.status(200).json({
    reply: text.replace(/RECOMMENDATION:\s*\{.*\}/, "").trim(),
    recommendedProduct
  });
}
