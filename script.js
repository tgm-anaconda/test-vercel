// ── Android-Sperre & Querformat-Warnung ────────────────────────────────
(function() {
  // Android sperren
  if (/android/i.test(navigator.userAgent)) {
    const el = document.getElementById('androidBlock');
    if (el) el.style.display = 'flex';
    return; // Kein weiteres JS ausführen
  }
  // Querformat-Warnung
  function checkOrientation() {
    const warn = document.getElementById('landscapeWarning');
    if (!warn) return;
    const isLandscape = window.innerWidth > window.innerHeight && window.innerWidth < 1024;
    warn.style.display = isLandscape ? 'flex' : 'none';
  }
  window.addEventListener('resize', checkOrientation);
  window.addEventListener('orientationchange', checkOrientation);
  checkOrientation();
})();

// ============================================================================
// VERDEA STUDIE — VerdTracker (Vollständiges Tracking-System)
// ============================================================================
// Muss vor allem anderen stehen — wird in init() mit Variante initialisiert.
// ============================================================================

(function () {
  // Vercel-Proxy — leitet Tracking-Daten server-seitig an Google Sheets weiter
  const SHEETS_URL = '/api/track';

  // Hilfsfunktion: UUID v4
  function uuidv4() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  // Leeres Szenario-Datenobjekt
  function emptyScenario(idx) {
    return {
      scenario_id: '',
      product_chosen_id: '',
      product_chosen_name: '',
      option_chosen: '',
      price_paid: '',
      task_completed: false,
      time_task_seconds: '',
      bot_used: false,
      bot_msg_count_user: 0,
      bot_msg_avg_len_user: 0,
      bot_msg_total_len_user: 0,
      bot_chat_duration_seconds: '',
      bot_first_or_pdp_first: 'keins',
      pdp_ids_viewed: '',
      pdp_total_time_seconds: 0,
      pdp_tab_ingredients_clicked: false,
      pdp_tab_usage_clicked: false,
      pdp_tab_faq_clicked: false,
      suggestions_used_count: 0,
      upsell_recommended: false,
      upsell_purchased: false,
      crosssell_recommended: false,
      crosssell_purchased: false,
      ai_recommended_product_id: '',
      ai_recommendation_followed: false,
      bot_open_source_c: '',
      // Interne Hilfsfelder (nicht direkt an Sheets)
      _startTime: null,
      _botOpenTime: null,
      _botFirstMsgTime: null,
      _botLastMsgTime: null,
      _pdpOpenTimes: {}, // productId -> openTimestamp
      _pdpIdsArray: [],
      _userMsgLengths: [],
      _chatLog: [], // [{role, text}]
      _pdpFirstTime: null,
      _botFirstTime: null,
    };
  }

  const VT = {
    _sessionId: null,
    _timestampStart: null,
    _studyStartMs: null,
    _completedAt: null,

    _variant: null,
    _device: null,
    _scenarios: [emptyScenario(0), emptyScenario(1), emptyScenario(2)],
    _currentScenarioIdx: -1,
    _demographics: {},
    _surveyAnswers: {},
    _allChatLog: [], // Globaler Log über alle Szenarien
    _complete: false,
    _surveyStartMs: null,
    _displayStep: 1,  // 1-3 = Aufgabe, 4 = Umfrage, 5 = Demographik
    _abbruchAt: '',

    init(variant) {
      this._sessionId = uuidv4();
      this._timestampStart = new Date().toISOString();
      this._variant = variant;
      this._device = window.innerWidth < 768 ? 'mobile' : 'desktop';

      // Abbruch-Tracking: beim Schließen des Tabs Teilabbruch senden
      window.addEventListener('beforeunload', () => {
        if (!this._complete) {
          const completedCount = this._scenarios.filter(s => s.task_completed).length;
          if (completedCount < 2) return; // Nur senden wenn mindestens 2 Aufgaben abgeschlossen
          const labels = {1:'aufgabe_1', 2:'aufgabe_2', 3:'aufgabe_3', 4:'umfrage', 5:'demographik'};
          this._abbruchAt = labels[this._displayStep] || `aufgabe_${this._displayStep}`;
          this.flush('beforeunload');
        }
      });
    },

    setDemographics(data) {
      this._demographics = {
        demo_age: data.age || '',
        demo_gender: data.gender || '',
        demo_income: data.income || '',
        demo_occupation: data.occupation || '',
      };
    },

    startScenario(idx, id) {
      this._currentScenarioIdx = idx;
      const sc = this._scenarios[idx];
      sc.scenario_id = id;
      sc._startTime = Date.now();
    },

    trackBotOpen() {
      const sc = this._currentScenario();
      if (!sc) return;
      sc._botOpenTime = Date.now();
      if (!sc._botFirstTime) sc._botFirstTime = Date.now();
      // bot_first_or_pdp_first Logik
      if (sc._pdpFirstTime && !sc._botFirstTime_set) {
        sc.bot_first_or_pdp_first = 'pdp_zuerst';
        sc._botFirstTime_set = true;
      } else if (!sc._pdpFirstTime && !sc._botFirstTime_set) {
        sc.bot_first_or_pdp_first = 'bot_zuerst';
        sc._botFirstTime_set = true;
      }
    },

    trackBotClose() {
      // Kein besonderer State notwendig — duration wird bei complete() berechnet
    },

    trackUserMessage(text, scenarioIdx) {
      const idx = scenarioIdx !== undefined ? scenarioIdx : this._currentScenarioIdx;
      const sc = this._scenarios[idx];
      if (!sc) return;
      sc.bot_used = true;
      sc.bot_msg_count_user++;
      const len = typeof text === 'string' ? text.length : 0;
      sc._userMsgLengths.push(len);
      sc.bot_msg_total_len_user = sc._userMsgLengths.reduce((a, b) => a + b, 0);
      sc.bot_msg_avg_len_user = Math.round(sc.bot_msg_total_len_user / sc._userMsgLengths.length);
      const now = Date.now();
      if (!sc._botFirstMsgTime) sc._botFirstMsgTime = now;
      sc._botLastMsgTime = now;
      sc._chatLog.push({ role: 'user', text: text || '' });
      this._allChatLog.push({ scenario: idx + 1, role: 'user', text: text || '' });
    },

    trackAiReply(text, scenarioIdx, recommendedProductId, sellType) {
      const idx = scenarioIdx !== undefined ? scenarioIdx : this._currentScenarioIdx;
      const sc = this._scenarios[idx];
      if (!sc) return;
      const now = Date.now();
      if (!sc._botFirstMsgTime) sc._botFirstMsgTime = now;
      sc._botLastMsgTime = now;
      sc._chatLog.push({ role: 'ai', text: text || '' });
      this._allChatLog.push({ scenario: idx + 1, role: 'ai', text: text || '' });
      if (recommendedProductId) {
        sc.ai_recommended_product_id = recommendedProductId;
      }
      if (sellType === 'up' || sellType === 'dual') sc.upsell_recommended = true;
      if (sellType === 'cross' || sellType === 'dual') sc.crosssell_recommended = true;
    },

    trackSuggestionUsed(scenarioIdx) {
      const sc = this._scenarioAt(scenarioIdx);
      if (!sc) return;
      sc.suggestions_used_count++;
    },

    trackPdpOpen(productId, scenarioIdx) {
      const sc = this._scenarioAt(scenarioIdx);
      if (!sc) return;
      sc._pdpOpenTimes[productId] = Date.now();
      if (!sc._pdpIdsArray.includes(productId)) sc._pdpIdsArray.push(productId);
      if (!sc._pdpFirstTime) {
        sc._pdpFirstTime = Date.now();
        // bot_first_or_pdp_first: pdp zuerst geöffnet → nur setzen wenn Bot noch nicht war
        if (!sc._botFirstTime_set) {
          sc.bot_first_or_pdp_first = 'pdp_zuerst';
        }
      }
    },

    trackPdpClose(productId, scenarioIdx) {
      const sc = this._scenarioAt(scenarioIdx);
      if (!sc) return;
      const openTime = sc._pdpOpenTimes[productId];
      if (openTime) {
        const duration = Math.round((Date.now() - openTime) / 1000);
        sc.pdp_total_time_seconds = (sc.pdp_total_time_seconds || 0) + duration;
        delete sc._pdpOpenTimes[productId];
      }
      sc.pdp_ids_viewed = sc._pdpIdsArray.join(',');
    },

    trackTabClick(tabName, scenarioIdx) {
      const sc = this._scenarioAt(scenarioIdx);
      if (!sc) return;
      if (tabName === 'ingredients') sc.pdp_tab_ingredients_clicked = true;
      if (tabName === 'usage') sc.pdp_tab_usage_clicked = true;
      if (tabName === 'faq') sc.pdp_tab_faq_clicked = true;
    },

    trackCartAdd(productId, scenarioIdx, price, isUpsell, isCrosssell) {
      const sc = this._scenarioAt(scenarioIdx);
      if (!sc) return;
      if (isUpsell) sc.upsell_purchased = true;
      if (isCrosssell) sc.crosssell_purchased = true;
    },

    trackCheckout(scenarioIdx, cartData) {
      const sc = this._scenarioAt(scenarioIdx);
      if (!sc) return;
      sc.task_completed = true;
      if (sc._startTime) {
        sc.time_task_seconds = Math.round((Date.now() - sc._startTime) / 1000);
      }
      if (sc._botFirstMsgTime && sc._botLastMsgTime) {
        sc.bot_chat_duration_seconds = Math.round((sc._botLastMsgTime - sc._botFirstMsgTime) / 1000);
      }
      // Close any still-open PDPs
      Object.keys(sc._pdpOpenTimes).forEach(pid => {
        const dur = Math.round((Date.now() - sc._pdpOpenTimes[pid]) / 1000);
        sc.pdp_total_time_seconds = (sc.pdp_total_time_seconds || 0) + dur;
        delete sc._pdpOpenTimes[pid];
      });
      sc.pdp_ids_viewed = sc._pdpIdsArray.join(',');

      // Main product from cart
      if (cartData && cartData.mainChosen) {
        const m = cartData.mainChosen;
        sc.product_chosen_id = m.id || '';
        sc.product_chosen_name = m.name || '';
        sc.option_chosen = m.optionLabel || '';
        sc.price_paid = m.price || '';
        if (sc.ai_recommended_product_id && sc.ai_recommended_product_id === m.id) {
          sc.ai_recommendation_followed = true;
        }
      }

      // bot_first_or_pdp_first — Sonderfälle
      if (!sc._pdpFirstTime && !sc._botFirstTime_set) {
        sc.bot_first_or_pdp_first = 'keins';
      } else if (sc._botFirstTime_set && !sc._pdpFirstTime) {
        sc.bot_first_or_pdp_first = 'nur_bot';
      } else if (!sc._botFirstTime_set && sc._pdpFirstTime) {
        sc.bot_first_or_pdp_first = 'nur_pdp';
      }

      // Rolling update ans Sheet
      this._sendToSheets(false);
    },

    trackSurveyAnswer(questionId, answer) {
      this._surveyAnswers['survey_' + questionId] = answer;
    },

    trackBotOpenSource(source) {
      const sc = this._currentScenario();
      if (sc && !sc.bot_open_source_c) sc.bot_open_source_c = source;
    },

    complete() {
      this._complete = true;
      this._completedAt = Date.now();
      this._sendToSheets(true);
    },

    flush(reason) {
      const sc = this._currentScenarioIdx >= 0 ? this._scenarios[this._currentScenarioIdx] : null;
      // Nur setzen wenn das Szenario NICHT abgeschlossen wurde — sonst kein Abbruch-Eintrag
      if (sc && !sc.abbruch_at && !sc.task_completed) {
        sc.abbruch_at = reason || 'flush';
      }
      this._sendToSheets(false);
    },

    _scenarioAt(idx) {
      const i = idx !== undefined ? idx : this._currentScenarioIdx;
      return this._scenarios[i] || null;
    },

    _currentScenario() {
      return this._currentScenarioIdx >= 0 ? this._scenarios[this._currentScenarioIdx] : null;
    },

    _buildPayload(isFinal) {
      const p = {
        session_id: this._sessionId,
        timestamp_start: this._timestampStart,
        variant: this._variant,
        device: this._device,
        is_complete: isFinal ? 'ja' : 'nein',
        abbruch_at: '',
      };

      // Szenarien
      this._scenarios.forEach((sc, i) => {
        const prefix = `sc${i + 1}_`;
        p[prefix + 'scenario_id'] = sc.scenario_id;
        p[prefix + 'product_chosen_id'] = sc.product_chosen_id;
        p[prefix + 'product_chosen_name'] = sc.product_chosen_name;
        p[prefix + 'option_chosen'] = sc.option_chosen;
        p[prefix + 'price_paid'] = sc.price_paid;
        p[prefix + 'task_completed'] = sc.task_completed ? 'ja' : 'nein';
        p[prefix + 'time_task_seconds'] = sc.time_task_seconds;
        p[prefix + 'bot_used'] = sc.bot_used ? 'ja' : 'nein';
        p[prefix + 'bot_msg_count_user'] = sc.bot_msg_count_user;
        p[prefix + 'bot_msg_avg_len_user'] = sc.bot_msg_avg_len_user;
        p[prefix + 'bot_msg_total_len_user'] = sc.bot_msg_total_len_user;
        p[prefix + 'bot_chat_duration_seconds'] = sc.bot_chat_duration_seconds;
        p[prefix + 'bot_first_or_pdp_first'] = sc.bot_first_or_pdp_first;
        p[prefix + 'pdp_ids_viewed'] = sc.pdp_ids_viewed;
        p[prefix + 'pdp_total_time_seconds'] = sc.pdp_total_time_seconds;
        p[prefix + 'pdp_tab_ingredients_clicked'] = sc.pdp_tab_ingredients_clicked ? 'ja' : 'nein';
        p[prefix + 'pdp_tab_usage_clicked'] = sc.pdp_tab_usage_clicked ? 'ja' : 'nein';
        p[prefix + 'pdp_tab_faq_clicked'] = sc.pdp_tab_faq_clicked ? 'ja' : 'nein';
        p[prefix + 'suggestions_used_count'] = sc.suggestions_used_count;
        p[prefix + 'upsell_recommended'] = sc.upsell_recommended ? 'ja' : 'nein';
        p[prefix + 'upsell_purchased'] = sc.upsell_purchased ? 'ja' : 'nein';
        p[prefix + 'crosssell_recommended'] = sc.crosssell_recommended ? 'ja' : 'nein';
        p[prefix + 'crosssell_purchased'] = sc.crosssell_purchased ? 'ja' : 'nein';
        p[prefix + 'ai_recommended_product_id'] = sc.ai_recommended_product_id;
        p[prefix + 'ai_recommendation_followed'] = sc.ai_recommendation_followed ? 'ja' : 'nein';
        p[prefix + 'bot_open_source_c'] = sc.bot_open_source_c;
      });

      // Gesamtbearbeitungszeit
      p.total_duration_seconds = (this._completedAt && this._studyStartMs)
        ? Math.round((this._completedAt - this._studyStartMs) / 1000)
        : '';

      // Demographik
      Object.assign(p, this._demographics);

      // Umfrage
      Object.assign(p, this._surveyAnswers);

      // Globaler Abbruch-Status
      p.abbruch_at = this._abbruchAt || '';

      // Chat-Log
      const logParts = this._allChatLog.map(entry => `[Szenario${entry.scenario}-${entry.role === 'user' ? 'User' : 'AI'}]${entry.text}`);
      p.chat_log_raw = logParts.join(';');

      return p;
    },

    _sendToSheets(isFinal) {
      if (!SHEETS_URL) return;
      const payload = this._buildPayload(isFinal);
      const body = JSON.stringify(payload);
      // sendBeacon für beforeunload (Browser-Tab schließen), sonst fetch
      if (!isFinal && typeof navigator.sendBeacon === 'function') {
        const blob = new Blob([body], { type: 'application/json' });
        navigator.sendBeacon(SHEETS_URL, blob);
      } else {
        fetch(SHEETS_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body,
        }).catch(err => console.warn('[VerdTracker] Sheets-Send fehlgeschlagen:', err));
      }
    },
  };

  window.VerdTracker = VT;
})();

// ============================================================================
// VERDEA STUDIE — Chatbot-Positionierungs-Varianten
// ============================================================================
// Beim ersten Aufruf zufällig eine der drei Varianten zuweisen (A/B/C, je 33%).
// window.VERDEA_VARIANT wird für den gesamten Seitenaufruf gesetzt.
// ============================================================================
(function assignVariant() {
  const r = Math.random();
  window.VERDEA_VARIANT = r < 0.333 ? 'A' : r < 0.667 ? 'B' : 'C';
})();

// ============================================================================
// VERDEA STUDIE — Produktdaten & Szenarien
// ============================================================================
//
// PHILOSOPHIE
//   Produktdaten in CSV-ähnlicher Form ganz oben → leicht editierbar
//   (Preise, Namen, Taglines anpassen ohne JS-Kenntnisse).
//   Komplexe Felder (Inhaltsstoffe, FAQs, Optionen/Up-Sell) als separate
//   Maps mit Produkt-ID als Key — auch dort einfach pro Eintrag anpassbar.
//
// 3 SZENARIEN × 5 Produkte:
//   1. Vitamine D3+K2 (4 Hauptprodukte)   + Ashwagandha (Cross-Sell)
//   2. Tablettenboxen (4 Hauptprodukte)   + Shaker (Cross-Sell)
//   3. Festival-Tickets (4 Hauptprodukte) + Festival-Shirt (Cross-Sell)
//
// UP-SELL: läuft über OPTIONS_BY_ID (Mengen-/Größen-Varianten mit Rabatt).
//          Jede Option hat ein isUpsell-Flag → KI nutzt das für ihre Empfehlung.
// CROSS-SELL: ist ein eigenes Produkt mit role=cross-sell (siehe CSV).
// ============================================================================

// ─── PRODUKT-CSV ────────────────────────────────────────────────────────────
// Bearbeitung:  Du kannst Preise, Namen, Beschreibungen direkt hier ändern.
// Format:       Spalten getrennt durch Semikolon, Zeilen durch Newline.
// Sonderzeichen:
//   - certs:        Pipe-getrennt, z.B. "🌱 Bio|🐇 Vegan"
//   - Kommentare:   Zeilen mit # vorne werden ignoriert
// ⚠️  KEIN Semikolon innerhalb von Zellen verwenden (würde die Spalten verschieben)!
// ────────────────────────────────────────────────────────────────────────────
const PRODUCTS_CSV = `
id;scenario;role;category;name;brand;tagline;price;unit;emoji;rating;reviews;certs;short_desc

# ─── Szenario 1: Vitamin D3 + K2 (4 Haupt) + Ashwagandha (Cross-Sell) ───
vit-1;vitamine;main;vitamine;Vitamin D3 + K2 Basis;VERDEA;Solide Grundversorgung;14.90;90 Kapseln · 3 Monate;☀️;4.4;89;🔬 GMP|🇩🇪 DE;Vitamin D3 1.000 IU + K2 50 µg. Hergestellt in Deutschland nach GMP-Standard.
vit-2;vitamine;main;vitamine;Vitamin D3 + K2 Plus;VERDEA;Vegan & laborgeprüft;24.90;90 Kapseln · 3 Monate;☀️;4.6;201;🐇 Vegan|🔬 Laborgeprüft|🇩🇪 DE;Vitamin D3 1.500 IU aus Flechten + K2 100 µg in MCT-Öl-Träger.
vit-3;vitamine;main;vitamine;Vitamin D3 + K2 Premium;VERDEA;Bio & klimaneutral;34.90;90 Kapseln · 3 Monate;☀️;4.8;164;🌱 Bio|🐇 Vegan|🌍 CO₂ neutral;Bio-Vitamin D3 2.000 IU + K2 150 µg. Klimaneutrale Produktion in Glasflasche.
vit-4;vitamine;main;vitamine;Vitamin D3 + K2 Pro;VERDEA;Liposomal · höchste Bioverfügbarkeit;49.90;90 Kapseln · 3 Monate;☀️;4.9;112;🌱 Bio|🐇 Vegan|🔬 Liposomal;Liposomales Vitamin D3 2.500 IU + K2 200 µg. Bis zu 300 % höhere Aufnahme.
ada-1;vitamine;cross-sell;adaptogen;Ashwagandha KSM-66®;VERDEA;Stressbalance & Resilienz — perfekte Ergänzung zu Vitamin D;32.90;90 Kapseln · 3 Monate;🌿;4.7;243;🌱 Bio|🐇 Vegan|🔬 KSM-66®;Adaptogen aus indischer Wurzel. 600 mg KSM-66®-Vollspektrum-Extrakt pro Tagesdosis.

# ─── Szenario 2: Tablettenboxen (4 Haupt) + Shaker (Cross-Sell) ───
box-1;tablettenbox;main;tablettenbox;TagesBox Basic;VERDEA;Solide Grundausstattung;7.90;7 Fächer · 1 Woche;💊;4.3;156;🇩🇪 DE;BPA-freies Standard-Plastik mit einfachem Schiebeverschluss.
box-2;tablettenbox;main;tablettenbox;TagesBox Smart;VERDEA;Wochentag-Beschriftung & sicherer Verschluss;14.90;7 Fächer · 1 Woche;💊;4.6;234;🇩🇪 DE|🔒 Klick-Verschluss;BPA-frei mit abriebfester Wochentag-Beschriftung und einrastendem Verschluss.
box-3;tablettenbox;main;tablettenbox;TagesBox Premium;VERDEA;Spülmaschinenfest · luftdicht · medizinisches Silikon;22.90;7 Fächer · 1 Woche;💊;4.8;189;🔬 Med-Silikon|💧 Luftdicht;Medizinisches Silikon (FDA-zertifiziert), abnehmbare Einzelfächer, vollständig spülmaschinenfest.
box-4;tablettenbox;main;tablettenbox;TagesBox Eco-Pro;VERDEA;Bambus & Edelstahl · ergonomisch · kompostierbar;32.90;7 Fächer · 1 Woche;💊;4.9;121;🌱 Bambus|🌍 Kompostierbar|🔒 Magnet;FSC-Bambus + Edelstahl 304, ergonomisches Design, magnetischer Verschluss.
shk-1;tablettenbox;cross-sell;shaker;VERDEA Edelstahl-Shaker 600 ml;VERDEA;Doppelwandig & geruchsneutral — ideale Ergänzung zur TagesBox;19.90;600 ml · doppelwandig;🥤;4.7;278;🔬 Edelstahl 304|💧 Auslaufsicher;Premium-Shaker aus medizinischem Edelstahl 304. Geruchsneutral, doppelwandig und auslaufsicher.

# ─── Szenario 3: VERDEA Wellness Festival 2026 (4 Tickets) + Shirt (Cross-Sell) ───
tic-1;event;main;ticket;Standard-Ticket;VERDEA Festival;Festivaleintritt · Zugang zu allen Bühnen;49;1 Tag · 1 Person;🎫;4.5;1247;🎵 Alle Bühnen;Tageseintritt zum VERDEA Wellness Festival 2026 mit Zugang zu allen Open-Air-Bühnen und Talks.
tic-2;event;main;ticket;Premium-Ticket;VERDEA Festival;Standard + Lunch + Goodie-Bag + Sitzbereich;89;1 Tag · 1 Person;🎫;4.7;643;🍽 Lunch|🎁 Goodie-Bag|🪑 Sitzplatz;Standard plus 3-Gänge-Lunch, exklusive Goodie-Bag (Wert ~25 €) und reservierter Sitzbereich vor den Bühnen.
tic-3;event;main;ticket;VIP-Ticket;VERDEA Festival;Premium + Workshops + Meet-and-Greet + Gourmet-Catering;149;1 Tag · 1 Person;🎫;4.8;312;✨ Workshops|🎤 Meet-and-Greet|🍽 Gourmet;Premium plus exklusive Workshop-Slots, Meet-and-Greet mit Speakern und ganztägiges Gourmet-Catering.
tic-4;event;main;ticket;Backstage-Ticket;VERDEA Festival;VIP + Übernachtung + Welcome-Reception + Fahrer-Service;249;1 Tag · 1 Person;🎫;4.9;87;🏨 Übernachtung|🥂 Reception|🚐 Fahrer;VIP plus Übernachtung im Festival-Hotel, private Welcome-Reception am Vorabend und Fahrer-Service hin und zurück.
tee-1;event;cross-sell;shirt;VERDEA Festival-Shirt 2026;VERDEA Festival;Bio-Baumwolle · limitierte Edition;24.90;1 Stück · Größe S–XL;👕;4.6;456;🌱 Bio-Baumwolle|🌍 Fair Trade;Limitiertes Festival-Shirt aus 100 % Bio-Baumwolle. Mit dem offiziellen 2026er-Design.
`;

// ─── INHALTSSTOFFE / WAS-IST-ENTHALTEN pro Produkt ──────────────────────────
// Wird auf der Detailseite im Tab „Inhaltsstoffe" angezeigt.
// Bei Tickets: „Was ist enthalten" (Eintritt, Catering, …).
// Bei Boxen:   Material und Funktionen.
// ────────────────────────────────────────────────────────────────────────────
const INGREDIENTS_BY_ID = {
  // ─── Vitamine ────────────────────────────────────────────────────────────
  'vit-1': [
    { name: 'Vitamin D3 (Cholecalciferol)', sub: 'aus Lanolin', amount: '1.000 IU · 25 µg', origin: '🇩🇪 Deutschland' },
    { name: 'Vitamin K2 (MK-7)', sub: 'all-trans, höchste Reinheit', amount: '50 µg', origin: '🇯🇵 Japan' },
    { name: 'Mikrokristalline Cellulose', sub: 'pflanzlicher Trägerstoff', amount: 'Füllstoff', origin: '🇪🇺 EU' },
    { name: 'Magnesiumstearat', sub: 'pflanzlich, Fließmittel', amount: 'Hilfsstoff', origin: '🇩🇪 Deutschland' },
    { name: 'HPMC-Kapsel', sub: 'pflanzlich (vegan)', amount: '—', origin: '🌱' },
    { name: 'Empfohlene Tagesdosis', sub: '1 Kapsel täglich zu einer Mahlzeit', amount: '1 Kps.', origin: '—' },
  ],
  'vit-2': [
    { name: 'Vitamin D3', sub: 'aus Flechten · 100 % vegan', amount: '1.500 IU · 37,5 µg', origin: '🇩🇪 Deutschland' },
    { name: 'Vitamin K2 (MK-7)', sub: 'all-trans, Bioaktiv-Form', amount: '100 µg', origin: '🇯🇵 Japan' },
    { name: 'MCT-Öl', sub: 'aus Bio-Kokosöl, kaltgepresst', amount: 'Trägeröl', origin: '🇵🇭 Philippinen' },
    { name: 'Sonnenblumen-Lecithin', sub: 'GMO-frei, verbessert Aufnahme', amount: 'Hilfsstoff', origin: '🇪🇺 EU' },
    { name: 'HPMC-Kapsel', sub: 'pflanzlich (vegan)', amount: '—', origin: '🌱' },
    { name: 'Empfohlene Tagesdosis', sub: '1 Kapsel täglich, vorzugsweise mit Fett', amount: '1 Kps.', origin: '—' },
  ],
  'vit-3': [
    { name: 'Bio-Vitamin D3', sub: 'aus Bio-Flechten · vegan', amount: '2.000 IU · 50 µg', origin: '🇩🇪 Deutschland' },
    { name: 'Vitamin K2 (MK-7)', sub: 'all-trans, Bio-zertifiziert', amount: '150 µg', origin: '🇯🇵 Japan' },
    { name: 'Bio-MCT-Öl', sub: 'aus Bio-Kokos, fair trade', amount: 'Trägeröl', origin: '🇵🇭 Philippinen' },
    { name: 'Bio-Olivenöl', sub: 'kaltgepresst, antioxidativ', amount: 'Co-Träger', origin: '🇮🇹 Italien' },
    { name: 'HPMC-Kapsel (Bio)', sub: 'pflanzlich, kompostierbar', amount: '—', origin: '🌱' },
    { name: 'Klimakompensation', sub: 'CO₂-Footprint vollständig ausgeglichen', amount: 'Climate Partner ID 1234', origin: '🌍' },
    { name: 'Empfohlene Tagesdosis', sub: '1 Kapsel mit einer Hauptmahlzeit', amount: '1 Kps.', origin: '—' },
  ],
  'vit-4': [
    { name: 'Liposomales Vitamin D3', sub: 'Bio-Flechten-Extrakt, liposomal verkapselt', amount: '2.500 IU · 62,5 µg', origin: '🇮🇸 Island' },
    { name: 'Vitamin K2 (MK-7)', sub: 'all-trans, pharmazeutische Reinheit', amount: '200 µg', origin: '🇯🇵 Japan' },
    { name: 'Bio-MCT-Öl', sub: 'aus Bio-Kokos', amount: 'Trägeröl', origin: '🇵🇭 Philippinen' },
    { name: 'Phosphatidylcholin', sub: 'aus Sonnenblumen, GMO-frei', amount: 'Liposom-Matrix', origin: '🇩🇪 Deutschland' },
    { name: 'Vitamin E (Tocopherol)', sub: 'natürliches Antioxidans', amount: '5 mg', origin: '🇪🇺 EU' },
    { name: 'Glasflasche', sub: 'recyclebar, plastikfrei', amount: 'Verpackung', origin: '🇩🇪' },
    { name: 'Empfohlene Tagesdosis', sub: '1 Kapsel täglich', amount: '1 Kps.', origin: '—' },
  ],
  'ada-1': [
    { name: 'Ashwagandha-Wurzelextrakt', sub: 'KSM-66® Vollspektrum', amount: '600 mg', origin: '🇮🇳 Indien' },
    { name: 'Standardisierung', sub: '≥ 5 % Withanolide (Wirkstoffe)', amount: '30+ mg', origin: '—' },
    { name: 'BioPerine®', sub: 'Schwarzer-Pfeffer-Extrakt, +20× Bioverfügbarkeit', amount: '5 mg', origin: '🇮🇳 Kerala' },
    { name: 'HPMC-Kapsel', sub: 'pflanzlich (vegan)', amount: '—', origin: '🌱' },
    { name: 'Allergen-Status', sub: 'frei von Gluten, Soja, Milch, Nüssen', amount: 'hypoallergen', origin: '—' },
    { name: 'Empfohlene Tagesdosis', sub: '1 Kapsel abends, idealerweise zur Mahlzeit', amount: '1 Kps.', origin: '—' },
  ],

  // ─── Tablettenboxen — „Inhaltsstoffe" = Material und Funktionen ─────────
  'box-1': [
    { name: 'Material', sub: 'BPA-freies Polypropylen, lebensmittelecht', amount: 'Hauptkörper', origin: '🇩🇪 DE-Produktion' },
    { name: 'Verschluss', sub: 'Schiebeverschluss, einhändig bedienbar', amount: '—', origin: '—' },
    { name: 'Abmessungen', sub: 'kompakt, taschentauglich', amount: '14 × 7 × 2 cm', origin: '—' },
    { name: 'Fachgröße', sub: 'für Kapseln und mittelgroße Tabletten', amount: '25 × 25 × 18 mm', origin: '—' },
    { name: 'Gewicht', sub: 'leicht, ideal für unterwegs', amount: '65 g', origin: '—' },
    { name: 'Spülmaschine', sub: 'Oberkorb, niedrige Temperatur', amount: '—', origin: '—' },
  ],
  'box-2': [
    { name: 'Material', sub: 'BPA-freies PP + ABS-Kunststoff', amount: 'Hauptkörper', origin: '🇩🇪 DE-Produktion' },
    { name: 'Beschriftung', sub: 'Wochentage MO–SO, UV-resistenter Druck', amount: '7×', origin: '—' },
    { name: 'Verschluss', sub: 'einrastender Klick-Verschluss, kindersicher', amount: '—', origin: '—' },
    { name: 'Abmessungen', sub: 'leicht größer durch Beschriftungsfläche', amount: '15 × 7,5 × 2,5 cm', origin: '—' },
    { name: 'Gewicht', sub: 'mit Beschriftung etwas schwerer', amount: '85 g', origin: '—' },
    { name: 'Spülmaschine', sub: 'Oberkorb, Beschriftung bleibt erhalten', amount: '—', origin: '—' },
  ],
  'box-3': [
    { name: 'Material', sub: 'medizinisches Silikon (FDA-zertifiziert)', amount: 'Hauptkörper', origin: '🇩🇪 DE-Produktion' },
    { name: 'Fächer', sub: 'einzeln entnehmbar — 1 Tag separat mitnehmen', amount: '7×', origin: '—' },
    { name: 'Verschluss', sub: 'luftdicht, IP67-zertifiziert', amount: '—', origin: '—' },
    { name: 'Hitzebeständigkeit', sub: 'auch heißes Wasser möglich', amount: 'bis 220 °C', origin: '—' },
    { name: 'Abmessungen', sub: 'etwas dicker durch Silikon', amount: '16 × 8 × 3 cm', origin: '—' },
    { name: 'Gewicht', sub: 'Silikon ist robust aber schwerer', amount: '110 g', origin: '—' },
    { name: 'Spülmaschine', sub: 'vollständig — auch bei hoher Temperatur', amount: '—', origin: '—' },
  ],
  'box-4': [
    { name: 'Material', sub: 'FSC-zertifizierter Bambus + Edelstahl 304', amount: 'Hauptkörper', origin: '🌍 nachhaltige Forstwirtschaft' },
    { name: 'Verschluss', sub: 'magnetisch, geräuschlos', amount: '—', origin: '—' },
    { name: 'Design', sub: 'ergonomisch geformt, abgerundete Kanten', amount: '—', origin: '—' },
    { name: 'Abmessungen', sub: 'edel, Tisch- und reisetauglich', amount: '17 × 8,5 × 2,8 cm', origin: '—' },
    { name: 'Gewicht', sub: 'durch Bambus + Stahl höher', amount: '145 g', origin: '—' },
    { name: 'Pflege', sub: 'Handwäsche, kein Einweichen, Bambusöl 1×/Jahr', amount: '—', origin: '—' },
    { name: 'Lebensende', sub: 'Bambus kompostierbar, Stahl recycelbar', amount: '—', origin: '—' },
  ],
  'shk-1': [
    { name: 'Material', sub: 'medizinischer Edelstahl 304, geruchsneutral', amount: 'Hauptkörper', origin: '🇩🇪 DE-Produktion' },
    { name: 'Volumen', sub: 'doppelwandig vakuum-isoliert', amount: '600 ml', origin: '—' },
    { name: 'Isolierung', sub: 'hält Getränke kalt oder warm', amount: '6 h kalt / 4 h warm', origin: '—' },
    { name: 'Auslaufschutz', sub: 'Schraubdeckel + Silikondichtung', amount: '—', origin: '—' },
    { name: 'Mixfunktion', sub: 'Edelstahl-Mischball für klumpenfreie Shakes', amount: 'inkl.', origin: '—' },
    { name: 'Pflege', sub: 'spülmaschinenfest, BPA- & weichmacherfrei', amount: '—', origin: '—' },
  ],

  // ─── Tickets — „Inhaltsstoffe" = Was ist enthalten ──────────────────────
  'tic-1': [
    { name: 'Festivaleintritt', sub: 'gesamter Tag', amount: '1×', origin: '—' },
    { name: 'Zugang Bühnen', sub: 'alle Open-Air-Bühnen + Talks', amount: 'unbegrenzt', origin: '—' },
    { name: 'Datum', sub: 'Samstag, 18.07.2026', amount: '10:00–23:00', origin: '🇩🇪' },
    { name: 'Ort', sub: 'Olympiapark München, Eingang Süd', amount: '—', origin: '🇩🇪' },
    { name: 'Garderobe', sub: 'kostenlos', amount: '—', origin: '—' },
    { name: 'Altersgrenze', sub: 'ab 16 Jahren (mit Ausweis)', amount: '—', origin: '—' },
  ],
  'tic-2': [
    { name: 'Festivaleintritt', sub: 'gesamter Tag, alle Bühnen', amount: '1×', origin: '—' },
    { name: 'Lunch', sub: '3-Gänge-Menü, vegan-optional', amount: '1×', origin: '🇩🇪 regional' },
    { name: 'Goodie-Bag', sub: 'VERDEA-Proben + Trinkflasche + Programm', amount: '1×', origin: '~25 € Wert' },
    { name: 'Sitzbereich', sub: 'reserviert vor den Hauptbühnen', amount: 'unbegrenzt', origin: '—' },
    { name: 'Wassergutschein', sub: 'unbegrenzt am Tag', amount: 'inkl.', origin: '—' },
    { name: 'Datum & Ort', sub: '18.07.2026 · Olympiapark München', amount: '10:00–23:00', origin: '🇩🇪' },
    { name: 'Garderobe', sub: 'kostenlos', amount: '—', origin: '—' },
  ],
  'tic-3': [
    { name: 'Festivaleintritt + Lunch + Goodie-Bag', sub: 'wie Premium', amount: '1×', origin: '—' },
    { name: 'Workshop-Slots', sub: 'exklusive Plätze in 3 Workshops nach Wahl', amount: '3×', origin: '—' },
    { name: 'Meet-and-Greet', sub: 'mit Speakern in der VIP-Lounge', amount: '1×', origin: '—' },
    { name: 'Gourmet-Catering', sub: 'ganztägig, mit Getränken inkl. Wein/Bier', amount: 'unbegrenzt', origin: '—' },
    { name: 'VIP-Eingang', sub: 'separater Einlass ohne Wartezeit', amount: 'inkl.', origin: '—' },
    { name: 'VIP-Toiletten', sub: 'separat, gepflegt, mit Lounge-Bereich', amount: 'inkl.', origin: '—' },
    { name: 'Datum & Ort', sub: '18.07.2026 · Olympiapark München', amount: '10:00–23:00', origin: '🇩🇪' },
  ],
  'tic-4': [
    { name: 'VIP-Programm', sub: 'alles aus dem VIP-Ticket', amount: 'inkl.', origin: '—' },
    { name: 'Übernachtung', sub: '4★-Festival-Hotel, Doppelzimmer', amount: '1 Nacht', origin: '🇩🇪 vor Ort' },
    { name: 'Welcome-Reception', sub: 'private Veranstaltung mit Künstlern am Vorabend', amount: '1×', origin: '—' },
    { name: 'Fahrer-Service', sub: 'Hin- und Rückfahrt zur Festival-Location', amount: 'innerhalb München', origin: '🚐' },
    { name: 'Backstage-Tour', sub: 'geführte Tour mit Festival-Manager', amount: '1×', origin: '—' },
    { name: 'Frühstücks-Buffet', sub: 'am Folgetag im Hotel', amount: '1×', origin: '🇩🇪 regional' },
    { name: 'Persönlicher Concierge', sub: 'während des Events erreichbar', amount: 'WhatsApp', origin: '—' },
    { name: 'Datum & Ort', sub: '18.07.2026 · Olympiapark + Hotel Bayerischer Hof', amount: '—', origin: '🇩🇪' },
  ],
  'tee-1': [
    { name: 'Material', sub: '100 % Bio-Baumwolle, GOTS-zertifiziert', amount: '180 g/m²', origin: '🇮🇳 fair trade' },
    { name: 'Druck', sub: 'wasserbasierte Tinten, schadstofffrei', amount: 'Frontprint', origin: '—' },
    { name: 'Schnitt', sub: 'Unisex, leicht oversized', amount: '—', origin: '—' },
    { name: 'Größen', sub: 'S, M, L, XL — kostenloser Größen­tausch', amount: '—', origin: '—' },
    { name: 'Pflegehinweis', sub: '30 °C bunt waschen, nicht in den Trockner', amount: '—', origin: '—' },
    { name: 'Versand', sub: 'in recycelter Papier-Versandtasche', amount: '—', origin: '—' },
  ],
};

// ─── FAQs pro Produkt ───────────────────────────────────────────────────────
const FAQS_BY_ID = {
  // ─── Vitamine ────────────────────────────────────────────────────────────
  'vit-1': [
    { q: 'Wie hoch ist die Dosierung?', a: '1.000 IU Vitamin D3 + 50 µg K2 pro Kapsel. Empfohlen: 1× täglich zu einer fetthaltigen Mahlzeit.' },
    { q: 'Ist das Produkt vegan?', a: 'Die Kapsel ist pflanzlich, das Vitamin D3 stammt jedoch aus Lanolin (Schafwolle), also nicht vegan. Für eine vegane Variante siehe Vitamin D3 + K2 Plus.' },
    { q: 'Wann sehe ich erste Effekte?', a: 'Bei nachgewiesenem Mangel meist nach 4–8 Wochen. Bei normalem Spiegel vor allem im Winter spürbar (mehr Energie, stabileres Immunsystem).' },
    { q: 'Kann man überdosieren?', a: 'Bei dieser Dosis nicht. Vitamin D wird vom Körper gespeichert, aber 1.000 IU täglich ist auch bei Sonnenlicht-Tagen unbedenklich.' },
  ],
  'vit-2': [
    { q: 'Warum aus Flechten?', a: 'Flechten sind die einzige pflanzliche Quelle für natürliches Vitamin D3 — somit ist das Produkt vollständig vegan.' },
    { q: 'Was bringt der MCT-Öl-Träger?', a: 'Vitamin D ist fettlöslich. MCT-Öl verbessert die Aufnahme messbar — auch ohne dass Sie zur Mahlzeit einnehmen.' },
    { q: 'Wie unterscheidet sich Plus von Basis?', a: 'Plus ist vegan (Flechten statt Lanolin), höher dosiert (1.500 vs 1.000 IU), und hat MCT-Öl als Träger für bessere Aufnahme.' },
    { q: 'Welche Wechselwirkungen gibt es?', a: 'K2 kann die Wirkung von Blutverdünnern (Marcumar) beeinflussen. Bei Einnahme bitte mit Arzt abstimmen.' },
    { q: 'Wann ist die beste Einnahmezeit?', a: 'Morgens oder mittags zu einer Mahlzeit. Vitamin D abends genommen kann bei manchen den Schlaf stören.' },
  ],
  'vit-3': [
    { q: 'Was bedeutet klimaneutral?', a: 'Der gesamte CO₂-Fußabdruck (Anbau, Produktion, Versand) wird durch zertifizierte Klimaschutzprojekte (Climate Partner) vollständig kompensiert. Zertifikat einsehbar.' },
    { q: 'Wie hoch ist die Dosierung?', a: '2.000 IU Vitamin D3 + 150 µg K2 — höhere Dosis für Menschen mit nachgewiesenem Mangel oder im Winter ohne Sonnenexposition.' },
    { q: 'Ist es für Schwangere geeignet?', a: 'Bei dieser Dosis grundsätzlich ja, aber Schwangere sollten ihre D-Werte vorab vom Arzt prüfen lassen.' },
    { q: 'Was bedeutet Bio bei Vitamin D?', a: 'Die Flechten stammen aus zertifiziert biologischer Wildsammlung, das MCT-Öl aus EU-Bio-zertifizierten Plantagen, alle Hilfsstoffe sind bio-zugelassen.' },
  ],
  'vit-4': [
    { q: 'Was ist liposomale Verkapselung?', a: 'Der Wirkstoff wird in winzige Fett-Vesikel (Liposomen) verpackt, die im Darm besser durchdringen. Studien zeigen bis zu 300 % höhere Bioverfügbarkeit gegenüber konventionellen Kapseln.' },
    { q: 'Für wen ist Pro sinnvoll?', a: 'Für Menschen mit nachgewiesenen Resorptionsproblemen (z.B. nach Magen-OP), älteren Personen mit reduzierter Aufnahme, oder bei sehr hohem nachgewiesenem Bedarf. Für die meisten reicht Premium oder Plus.' },
    { q: 'Wie hoch ist die Dosierung?', a: '2.500 IU Vitamin D3 + 200 µg K2. Durch die Liposom-Technologie entspricht die Aufnahme aber etwa 5.000 IU einer normalen Kapsel.' },
    { q: 'Warum die Glasflasche?', a: 'Liposomale Inhalte reagieren empfindlich auf Plastik-Weichmacher. Die Glasflasche schützt Wirkstoff und ist zudem komplett plastikfrei.' },
  ],
  'ada-1': [
    { q: 'Was ist Ashwagandha?', a: 'Ein Adaptogen aus der ayurvedischen Medizin — unterstützt den Umgang mit Stress, hilft beim Einschlafen und kann den Cortisol-Spiegel regulieren.' },
    { q: 'Wie kombiniere ich es mit Vitamin D?', a: 'Vitamin D morgens (Energie), Ashwagandha abends (Entspannung) — beide ergänzen sich ideal für Energie tagsüber und besseren Schlaf nachts.' },
    { q: 'Wie lange dauert, bis es wirkt?', a: 'Nach 2–3 Wochen regelmäßiger Einnahme. Klinische Studien (KSM-66®) zeigen signifikante Stress-Reduktion nach 8 Wochen.' },
    { q: 'Macht es schläfrig?', a: 'Nicht direkt — es macht nicht müde wie ein Schlafmittel. Es senkt nur den Cortisol-Spiegel, was abends das Einschlafen erleichtert.' },
    { q: 'Gibt es Nebenwirkungen?', a: 'Bei normaler Dosierung sehr selten. Bei Schwangerschaft, Schilddrüsen-Erkrankungen oder Immunsuppressiva: vorab Arzt fragen.' },
  ],

  // ─── Tablettenboxen ──────────────────────────────────────────────────────
  'box-1': [
    { q: 'Ist sie spülmaschinenfest?', a: 'Ja, aber nur im Oberkorb bei niedriger Temperatur (max. 50 °C). Bei Handwäsche hält der Verschluss länger geschmeidig.' },
    { q: 'Wie groß sind die Fächer?', a: 'Jedes Fach fasst 4–6 mittelgroße Tabletten oder Kapseln. Größere Tabletten (z.B. Magnesium-Brausetabletten) passen evtl. einzeln.' },
    { q: 'Passt sie in eine Handtasche?', a: 'Ja — mit 14 × 7 × 2 cm flach genug für jede Hand- oder Reisetasche.' },
    { q: 'Wie reinige ich sie am besten?', a: 'Lauwarmes Wasser mit Spülmittel, mit weicher Bürste die Ecken erreichen. Trocken zurück in die Schublade.' },
  ],
  'box-2': [
    { q: 'Verblasst die Beschriftung?', a: 'Nein — UV-resistenter Druck, hält auch nach 100+ Spülgängen.' },
    { q: 'Sind die Wochentage farbig markiert?', a: 'Schwarze Buchstaben auf weißem Grund, mit dezenter grüner Farbleiste am unteren Rand jedes Fachs zur schnelleren Orientierung.' },
    { q: 'Springt der Verschluss versehentlich auf?', a: 'Nein — der Klick-Verschluss muss aktiv gedrückt werden. Auch in der Tasche sicher.' },
    { q: 'Wie öffne ich den Verschluss einhändig?', a: 'Mit dem Daumen den seitlichen Druckpunkt drücken, der Deckel klappt automatisch. Bei Routine nach 2–3 Tagen einhändig flüssig.' },
  ],
  'box-3': [
    { q: 'Was bringt das medizinische Silikon?', a: 'Geschmacks- und geruchsneutral, hochtemperaturbeständig (bis 220 °C), vollständig hygienisch — ideal für sensible oder schnell oxidierende Medikamente.' },
    { q: 'Sind die Fächer wirklich luftdicht?', a: 'Ja, IP67-zertifiziert — schützt Tabletten vor Luftfeuchtigkeit (wichtig im Bad/Strand) und Geruch (kein Übertrag bei verschiedenen Medikamenten).' },
    { q: 'Wie reinige ich am besten?', a: 'Spülmaschine bei 75 °C — das Silikon übersteht es problemlos. Für besonders gründliche Reinigung können die Fächer einzeln entnommen werden.' },
    { q: 'Kann ich einzelne Fächer mitnehmen?', a: 'Ja — jedes der 7 Fächer ist einzeln entnehmbar und bleibt für sich luftdicht. Praktisch für Tagesausflüge.' },
  ],
  'box-4': [
    { q: 'Hält Bambus dauerhaft?', a: 'Bei normaler Pflege (Handwäsche, kein Einweichen) hält Bambus 5+ Jahre. Bei Bedarf 1× pro Jahr mit Bambusöl pflegen — dann sieht sie ewig gut aus. Am Lebensende: vollständig kompostierbar.' },
    { q: 'Wie funktioniert der Magnetverschluss?', a: 'Der Deckel rastet sanft per Magnet ein — geräuschlos und elegant. Kein Klicken oder Klappern, ideal als Geschenk oder für ruhige Umgebungen.' },
    { q: 'Ist Bambus wirklich hygienisch?', a: 'Bambus ist von Natur aus antibakteriell (durch Bambus-Kun). Mit gelegentlichem Reinigen mit Essigwasser bleibt sie hygienisch und geruchsneutral.' },
    { q: 'Hält der Magnet dem Reisen stand?', a: 'Ja — Magnetkraft ist stark genug, dass die Box auch im Koffer geschlossen bleibt. Edelstahl-Verstärkung verhindert Verziehen.' },
  ],
  'shk-1': [
    { q: 'Hält der Shaker mein Getränk kalt?', a: 'Ja, durch die doppelwandige Vakuum-Isolierung bleibt der Inhalt 6+ Stunden kalt oder 4 Stunden warm.' },
    { q: 'Bleibt der Geschmack neutral?', a: 'Edelstahl 304 nimmt keine Aromen auf. Eiweißshake heute, Kaffee morgen, Smoothie übermorgen — kein Übertrag.' },
    { q: 'Wie reinige ich den Shaker?', a: 'Spülmaschine im Oberkorb, oder von Hand mit warmem Wasser und Bürste. Mischball gleich mit reinigen, nicht im Shaker liegen lassen.' },
    { q: 'Geht der Mischball kaputt?', a: 'Edelstahl-Mischball — praktisch unzerstörbar. Falls er trotzdem mal verschwindet: kostenlos nachbestellbar.' },
    { q: 'Kann ich heißes Wasser einfüllen?', a: 'Ja — der Shaker ist hitzebeständig bis 90 °C. Aber: Deckel nicht sofort verschließen, damit kein Druck entsteht.' },
  ],

  // ─── Tickets ─────────────────────────────────────────────────────────────
  'tic-1': [
    { q: 'Wo findet das Festival statt?', a: 'Olympiapark München, Eingang Süd. 18. Juli 2026, 10:00–23:00 Uhr.' },
    { q: 'Kann ich das Ticket umtauschen?', a: 'Ja, bis 7 Tage vor Veranstaltung kostenfrei stornierbar. Tickets sind personalisiert, Namensänderung kostenlos via E-Mail.' },
    { q: 'Was bringe ich mit?', a: 'Personalausweis, dein digitales Ticket auf dem Handy, wetterfeste Kleidung. Trinkflasche darfst du mitbringen, Essen nicht.' },
    { q: 'Sind Hunde erlaubt?', a: 'Nein, aus Rücksicht auf Andere und das große Publikum sind Tiere nicht erlaubt. Ausnahme: Assistenzhunde mit Nachweis.' },
  ],
  'tic-2': [
    { q: 'Was ist im Lunch enthalten?', a: 'Vorspeise, Hauptgang und Dessert — vegan, vegetarisch oder Fleisch wählbar bei Buchung.' },
    { q: 'Was ist in der Goodie-Bag?', a: 'VERDEA-Produktproben, Zero-Waste-Trinkflasche, Festival-Programm, Lavendel-Roll-on, Bio-Sonnencreme und kleine Überraschungen.' },
    { q: 'Bekomme ich Tickets per Post?', a: 'Nein — alle Tickets sind digital. Du erhältst sie 48h vor dem Event per E-Mail mit QR-Code.' },
    { q: 'Wo ist mein Sitzplatz?', a: 'Reservierter Bereich vor den 2 Hauptbühnen. Plätze nicht nummeriert, freie Wahl im Bereich.' },
    { q: 'Was bei schlechtem Wetter?', a: 'Festival findet bei jedem Wetter statt. Bei Sturm gibt es überdachte Bühnen und einen Wetterschutz im Premium-Sitzbereich.' },
  ],
  'tic-3': [
    { q: 'Welche Workshops kann ich besuchen?', a: '3 freie Slots aus dem Workshop-Programm: Yoga, Meditation, Breathwork, Ernährungstalks, Schlaf-Coaching, Kalt-Therapie u.v.m. Buchung 7 Tage vor Event.' },
    { q: 'Mit welchen Speakern?', a: 'Renommierte Health-Experten — die Identität wird bei Buchung bekannt gegeben. Erwartung: 2025 waren u.a. Dr. Andrew Huberman, Dr. Rangan Chatterjee zu Gast.' },
    { q: 'Wie lange dauert das Meet-and-Greet?', a: 'Ca. 60 Minuten in der VIP-Lounge, mit jedem Speaker einige Minuten persönlich. Foto-Möglichkeit garantiert.' },
    { q: 'Was unterscheidet VIP vom Premium?', a: 'VIP hat zusätzlich: 3 exklusive Workshops, Meet-and-Greet, separater Eingang ohne Wartezeit, ganztägiges Gourmet-Catering inkl. Wein/Bier.' },
  ],
  'tic-4': [
    { q: 'Wie ist das Hotel?', a: 'Hotel Bayerischer Hof — 4★, direkt im Zentrum Münchens. 4 km vom Olympiapark, durch Fahrer-Service problemlos. Frühstück inklusive.' },
    { q: 'Wie weit reicht der Fahrer-Service?', a: 'Innerhalb Münchens kostenlos, hin und zurück zum Hotel und zum Festival. Größere Distanzen (z.B. zum Flughafen) auf Anfrage gegen Aufpreis.' },
    { q: 'Was beinhaltet die Backstage-Tour?', a: '60-90 Minuten geführte Tour mit dem Festival-Manager — hinter den Bühnen, Künstler-Garderoben, Technik-Bereich. Inkl. Foto-Möglichkeiten.' },
    { q: 'Kann ich eine Begleitperson mitbringen?', a: 'Das Backstage-Ticket ist personalisiert. Für 2 Personen empfehlen wir 2 Tickets mit Bring-A-Friend-Option (15 % Rabatt).' },
    { q: 'Was ist die Welcome-Reception?', a: 'Privater Empfang am Vorabend (17.07., 19:00) im Hotel mit Künstlern, Live-Musik und 4-Gänge-Menü. Limitiert auf 50 Backstage-Gäste.' },
  ],
  'tee-1': [
    { q: 'Welche Größen sind verfügbar?', a: 'S, M, L, XL — Unisex-Schnitt, leicht oversized. Bei Unsicherheit: lieber eine Nummer kleiner. Kostenloser Tausch innerhalb von 14 Tagen.' },
    { q: 'Wie wird das Shirt produziert?', a: 'In einer GOTS-zertifizierten Manufaktur in Indien, mit fairer Bezahlung (Fair Trade) und ohne Schadstoffe. Wasserbasierte Tinten beim Druck.' },
    { q: 'Wie wasche ich es?', a: '30 °C bunt mit ähnlichen Farben. Nicht in den Trockner — Bio-Baumwolle hält länger an der Luft. Bügeln auf links, Druck nicht direkt.' },
    { q: 'Welche Größe passt mir?', a: 'Größentabelle (Brustumfang): S = 88-92 cm, M = 96-100 cm, L = 104-108 cm, XL = 112-116 cm. Im Zweifel das größere wählen für oversized-Look.' },
  ],
};

// ─── TAB-LABELS pro Produktkategorie ────────────────────────────────────────
// Die Detailseite hat 3 Tabs. Inhaltsstoffe + Einnahme passen für Vitamine,
// aber für Tablettenboxen/Tickets/Shirts brauchen wir andere Labels.
// ────────────────────────────────────────────────────────────────────────────
const TAB_LABELS_BY_CATEGORY = {
  vitamine:     { ingredients: 'Inhaltsstoffe',         usage: 'Einnahme',           sectionTitle: 'Vollständige Zutatenliste',   disclaimer: 'Alle Rohstoffzertifikate auf Anfrage erhältlich. Chargenprüfbericht auf unserer Website einsehbar.' },
  adaptogen:    { ingredients: 'Inhaltsstoffe',         usage: 'Einnahme',           sectionTitle: 'Vollständige Zutatenliste',   disclaimer: 'Alle Rohstoffzertifikate auf Anfrage erhältlich. Chargenprüfbericht auf unserer Website einsehbar.' },
  tablettenbox: { ingredients: 'Material & Funktion',   usage: 'Pflege',             sectionTitle: 'Material & Eigenschaften',     disclaimer: 'Materialprüfungen und Zertifikate auf Anfrage einsehbar.' },
  shaker:       { ingredients: 'Material & Funktion',   usage: 'Pflege',             sectionTitle: 'Material & Eigenschaften',     disclaimer: 'Materialprüfungen und Zertifikate auf Anfrage einsehbar.' },
  ticket:       { ingredients: 'Im Paket enthalten',    usage: 'Hinweise zum Event', sectionTitle: 'Was im Ticket enthalten ist',  disclaimer: 'Tickets werden 48 h vor dem Event als QR-Code per E-Mail versandt.' },
  shirt:        { ingredients: 'Material',              usage: 'Pflege',             sectionTitle: 'Material & Verarbeitung',     disclaimer: 'Versand in plastikfreier Recycling-Verpackung.' },
};
function getTabLabels(category) {
  return TAB_LABELS_BY_CATEGORY[category] || { ingredients: 'Details', usage: 'Hinweise', sectionTitle: 'Eigenschaften', disclaimer: '' };
}

// ─── EINNAHME / PFLEGE / HINWEISE pro Produkt ───────────────────────────────
// Wird im 2. Tab der Detailseite angezeigt. Format: { strong, text } pro Zeile.
// Bei fehlenden Einträgen wird der Tab leer gelassen.
// ────────────────────────────────────────────────────────────────────────────
const USAGE_BY_ID = {
  // Vitamine
  'vit-1': [
    { strong: 'Empfohlene Tagesdosis', text: '1 Kapsel täglich zu einer Mahlzeit, am besten morgens.' },
    { strong: 'Einnahmezeit', text: 'Vorzugsweise mit fetthaltigem Frühstück (verbessert die Aufnahme).' },
    { strong: 'Lagerung', text: 'Trocken, unter 25 °C, vor direkter Sonne geschützt.' },
    { strong: 'Hinweis', text: 'Nahrungsergänzungsmittel ersetzen keine ausgewogene Ernährung. Schwangere bitte Arzt fragen.' },
    { strong: 'Versand', text: 'Kostenlos ab 60 €. Lieferzeit 1–2 Werktage.' },
    { strong: 'Garantie', text: '30 Tage Geld-zurück-Garantie, kein Risiko.' },
  ],
  'vit-2': [
    { strong: 'Empfohlene Tagesdosis', text: '1 Kapsel täglich, vorzugsweise zur Mahlzeit.' },
    { strong: 'Einnahmezeit', text: 'Morgens oder mittags. Abends nicht empfohlen — kann bei Sensiblen den Schlaf beeinflussen.' },
    { strong: 'Lagerung', text: 'Trocken, unter 25 °C. Nach Anbruch innerhalb von 6 Monaten verwenden.' },
    { strong: 'Wechselwirkungen', text: 'K2 kann die Wirkung von Blutverdünnern beeinflussen — bei Marcumar bitte Arzt fragen.' },
    { strong: 'Versand', text: 'Kostenlos ab 60 €. Lieferzeit 1–2 Werktage.' },
    { strong: 'Garantie', text: '30 Tage Geld-zurück-Garantie.' },
  ],
  'vit-3': [
    { strong: 'Empfohlene Tagesdosis', text: '1 Kapsel mit einer Hauptmahlzeit (höhere Dosis = wichtige Mahlzeitenkopplung).' },
    { strong: 'Einnahmezeit', text: 'Morgens zum Frühstück optimal — Vitamin D wirkt am besten bei Tageslichtkopplung.' },
    { strong: 'Lagerung', text: 'In der Glasflasche, kühl und trocken. Klimaneutrale Verpackung — bitte recyclen.' },
    { strong: 'Hinweis', text: 'Bei nachgewiesenem Mangel evtl. höhere Dosis nötig — Bluttest beim Arzt empfohlen.' },
    { strong: 'Versand', text: 'Kostenlos ab 60 €. Klimaneutraler Versand.' },
    { strong: 'Garantie', text: '30 Tage Geld-zurück-Garantie.' },
  ],
  'vit-4': [
    { strong: 'Empfohlene Tagesdosis', text: '1 Kapsel täglich. Durch Liposom-Technologie reicht 1 Kapsel pro Tag — keine Mehrfachgabe nötig.' },
    { strong: 'Einnahmezeit', text: 'Tagsüber zu einer Hauptmahlzeit. Liposomale Aufnahme ist auch ohne Fett gut.' },
    { strong: 'Lagerung', text: 'Glasflasche, kühl und dunkel. Nach Anbruch 4 Monate haltbar.' },
    { strong: 'Hinweis', text: 'Premium-Variante speziell für Resorptionsprobleme. Sonst reicht meist Premium oder Plus.' },
    { strong: 'Versand', text: 'Kostenlos ab 60 €. Klimaneutraler Versand.' },
    { strong: 'Garantie', text: '30 Tage Geld-zurück-Garantie.' },
  ],
  'ada-1': [
    { strong: 'Empfohlene Tagesdosis', text: '1 Kapsel abends, idealerweise zur Mahlzeit.' },
    { strong: 'Einnahmezeit', text: 'Abends 1–2 h vor dem Schlafengehen — unterstützt die Cortisol-Senkung und das Einschlafen.' },
    { strong: 'Lagerung', text: 'Trocken, unter 25 °C, vor Licht geschützt.' },
    { strong: 'Wann sehe ich Effekte?', text: 'Erste Effekte nach 2–3 Wochen, klinisch volle Wirkung nach 8 Wochen Einnahme.' },
    { strong: 'Hinweis', text: 'Bei Schilddrüsen-Erkrankungen, Schwangerschaft oder Immunsuppressiva: vorab Arzt fragen.' },
    { strong: 'Versand', text: 'Kostenlos ab 60 €. Lieferzeit 1–2 Werktage.' },
  ],

  // Tablettenboxen
  'box-1': [
    { strong: 'Reinigung', text: 'Spülmaschine im Oberkorb bei max. 50 °C. Bei Handwäsche hält der Verschluss länger geschmeidig.' },
    { strong: 'Trocknen', text: 'Vollständig trocknen lassen vor dem Befüllen — schützt Tabletten vor Feuchtigkeit.' },
    { strong: 'Pflege', text: 'Bei verschmiertem Verschluss: lauwarmes Wasser mit weicher Bürste reinigen.' },
    { strong: 'Hinweis', text: 'Nicht in Mikrowelle. Plastik kann sich bei zu hoher Temperatur verformen.' },
    { strong: 'Versand', text: 'Kostenlos ab 60 €. Plastikfreie Verpackung.' },
    { strong: 'Garantie', text: '30 Tage Rückgaberecht, 2 Jahre Funktionsgarantie auf Verschluss.' },
  ],
  'box-2': [
    { strong: 'Reinigung', text: 'Spülmaschine im Oberkorb. UV-Druck bleibt auch nach 100+ Spülgängen erhalten.' },
    { strong: 'Trocknen', text: 'Vor dem Befüllen vollständig trocknen — auch im Klick-Verschluss-Bereich.' },
    { strong: 'Pflege Beschriftung', text: 'Keine scharfen Lösungsmittel verwenden — abriebfest, aber kein Aceton.' },
    { strong: 'Hinweis', text: 'Klick-Verschluss-Mechanik: erst nach 2–3 Tagen wird einhändige Bedienung flüssig.' },
    { strong: 'Versand', text: 'Kostenlos ab 60 €. Plastikfreie Verpackung.' },
    { strong: 'Garantie', text: '30 Tage Rückgaberecht, 2 Jahre Funktionsgarantie.' },
  ],
  'box-3': [
    { strong: 'Reinigung', text: 'Spülmaschine bei beliebiger Temperatur — Silikon ist hitzebeständig bis 220 °C.' },
    { strong: 'Trocknen', text: 'Silikon trocknet schnell. Fächer einzeln entnehmen für gründliche Reinigung.' },
    { strong: 'Pflege', text: 'Geruchsbildung? 30 Min in Essigwasser einlegen — entfernt alle Rückstände.' },
    { strong: 'Hinweis', text: 'IP67-Luftdichtigkeit: nur wenn Verschluss vollständig eingerastet ist.' },
    { strong: 'Versand', text: 'Kostenlos ab 60 €. Plastikfreie Verpackung.' },
    { strong: 'Garantie', text: '30 Tage Rückgaberecht, 5 Jahre Materialgarantie auf Silikon.' },
  ],
  'box-4': [
    { strong: 'Reinigung', text: 'Handwäsche mit lauwarmem Wasser. Kein Einweichen — Bambus saugt sich sonst voll.' },
    { strong: 'Trocknen', text: 'Mit weichem Tuch abreiben, dann an der Luft komplett trocknen.' },
    { strong: 'Pflege Bambus', text: '1× pro Jahr mit Bambusöl behandeln. Verhindert Austrocknen und Risse.' },
    { strong: 'Hinweis', text: 'Edelstahl-Magnetverschluss bleibt jahrelang funktional. Magnetkraft hält auch im Koffer.' },
    { strong: 'Lebensende', text: 'Bambus kompostierbar, Edelstahl recycelbar. Beides separat entsorgen.' },
    { strong: 'Garantie', text: '30 Tage Rückgaberecht, 3 Jahre Materialgarantie.' },
  ],
  'shk-1': [
    { strong: 'Reinigung', text: 'Spülmaschinenfest oben. Mischball gleich mitwaschen, nicht im Shaker liegen lassen.' },
    { strong: 'Trocknen', text: 'Komplett trocknen vor dem nächsten Befüllen — verhindert Geruchsbildung.' },
    { strong: 'Pflege Edelstahl', text: 'Bei Wasserflecken: trockenes Mikrofasertuch reicht.' },
    { strong: 'Hinweis Heißgetränke', text: 'Hitzebeständig bis 90 °C, aber Deckel nicht sofort verschließen — Druck-Aufbau vermeiden.' },
    { strong: 'Versand', text: 'Kostenlos ab 60 €. Plastikfreie Verpackung.' },
    { strong: 'Garantie', text: '30 Tage Rückgaberecht, 5 Jahre Materialgarantie.' },
  ],

  // Tickets — Hinweise zum Event
  'tic-1': [
    { strong: 'Datum & Uhrzeit', text: 'Samstag, 18.07.2026 · 10:00 bis 23:00 Uhr.' },
    { strong: 'Anfahrt', text: 'Olympiapark München, Eingang Süd. U-Bahn U3 (Olympiazentrum) · Auto: Parkplatz P5.' },
    { strong: 'Was mitbringen', text: 'Personalausweis, dein QR-Ticket aufs Handy, wetterfeste Kleidung. Trinkflasche bis 0,5 l erlaubt.' },
    { strong: 'Was ist nicht erlaubt', text: 'Eigenes Essen, Glasflaschen, Tiere (außer Assistenzhunde mit Nachweis).' },
    { strong: 'Wetter', text: 'Findet bei jedem Wetter statt. Bei Sturm: überdachte Bühnen vorhanden.' },
    { strong: 'Stornierung', text: 'Kostenfrei bis 7 Tage vor Event. Namensänderung jederzeit kostenlos.' },
  ],
  'tic-2': [
    { strong: 'Datum & Uhrzeit', text: 'Samstag, 18.07.2026 · 10:00 bis 23:00 Uhr.' },
    { strong: 'Anfahrt', text: 'Olympiapark München, Eingang Süd. Premium-Eingang am Haupttor.' },
    { strong: 'Lunch', text: 'Reservierung am Buffet zwischen 12:00 und 14:00 Uhr. Vegan/vegetarisch bei Buchung wählbar.' },
    { strong: 'Sitzbereich', text: 'Reservierter Bereich vor den 2 Hauptbühnen. Plätze nicht nummeriert.' },
    { strong: 'Was mitbringen', text: 'Personalausweis, QR-Ticket, wetterfeste Kleidung. Goodie-Bag wird beim Eintritt überreicht.' },
    { strong: 'Stornierung', text: 'Kostenfrei bis 7 Tage vor Event. Lunch-Sonderwünsche können später nicht geändert werden.' },
  ],
  'tic-3': [
    { strong: 'Datum & Uhrzeit', text: 'Samstag, 18.07.2026 · 10:00 bis 23:00 Uhr.' },
    { strong: 'VIP-Eingang', text: 'Separater Eingang ohne Wartezeit, ausgeschildert ab Olympiapark Süd.' },
    { strong: 'Workshop-Buchung', text: '7 Tage vor Event erhältst du Link zur Workshop-Auswahl. Wähle 3 von 12 angebotenen Slots.' },
    { strong: 'Meet-and-Greet', text: '60 Min in der VIP-Lounge gegen 17:00 Uhr. Alle Speakers nacheinander, Foto-Möglichkeit garantiert.' },
    { strong: 'Catering', text: 'Ganztägig in der VIP-Lounge: Getränke (inkl. Wein/Bier), Snacks, Hauptmahlzeiten 12:00–20:00.' },
    { strong: 'Stornierung', text: 'Kostenfrei bis 7 Tage vor Event.' },
  ],
  'tic-4': [
    { strong: 'Datum', text: 'Anreise Freitag, 17.07.2026 ab 17:00 Uhr ins Hotel. Festival am 18.07. · Abreise Sonntag nach Frühstück.' },
    { strong: 'Hotel & Anreise', text: 'Hotel Bayerischer Hof München, Promenadeplatz. Eigene Anreise oder Fahrer-Service ab Hauptbahnhof.' },
    { strong: 'Welcome-Reception', text: 'Freitag 19:00 Uhr im Hotel. Live-Musik, 4-Gänge-Menü, Künstler-Treff. Limitiert auf 50 Gäste.' },
    { strong: 'Backstage-Tour', text: 'Samstag 14:00 oder 16:00 Uhr (1 Slot wählbar). Ca. 90 Min mit Festival-Manager.' },
    { strong: 'Fahrer-Service', text: 'Hin- und Rückfahrt zwischen Hotel und Festival kostenlos. Innerhalb Münchens auch sonst inklusive.' },
    { strong: 'Stornierung', text: 'Kostenfrei bis 14 Tage vor Event (höhere Frist wegen Hotel-Reservierung).' },
  ],

  // Shirt
  'tee-1': [
    { strong: 'Waschen', text: '30 °C bunt mit ähnlichen Farben. Kein Vollwaschmittel — Bio-Baumwolle hält länger mit Feinwaschmittel.' },
    { strong: 'Trocknen', text: 'An der Luft trocknen, nicht in den Trockner. Naturfasern danken es mit längerer Lebensdauer.' },
    { strong: 'Bügeln', text: 'Auf links bügeln (Druck nicht direkt mit Bügeleisen berühren). Mittlere Stufe.' },
    { strong: 'Lagerung', text: 'Liegend oder hängend. Nicht in der Sonne lagern — Druck kann ausbleichen.' },
    { strong: 'Größentausch', text: 'Innerhalb von 14 Tagen kostenfrei. Versandetikett liegt bei.' },
    { strong: 'Versand', text: 'Kostenlos ab 60 €. In Recycling-Papier, kein Plastik.' },
  ],
};

// ─── OPTIONS / UP-SELL pro Produkt ──────────────────────────────────────────
// Jedes Produkt hat 1+ Mengen-/Größen-Optionen.
//   isUpsell: true → KI darf diese Option als Up-Sell empfehlen
// Cross-Sell-Produkte haben i.d.R. nur eine Option (= Standardgröße).
// Editierung: Preis & Label hier anpassen, units = wieviele physische Einheiten.
// ────────────────────────────────────────────────────────────────────────────
const OPTIONS_BY_ID = {
  // Vitamine: 1er / 2er-Pack -10 % / 3er-Pack -15 %
  'vit-1': [
    { label: '1 Packung',                                  price:  14.90, units: 1, isUpsell: false },
    { label: '2er-Pack — 10 % Rabatt',                     price:  26.82, units: 2, isUpsell: true  },
    { label: '3er-Pack — 15 % Rabatt',                     price:  37.99, units: 3, isUpsell: true  },
  ],
  'vit-2': [
    { label: '1 Packung',                                  price:  24.90, units: 1, isUpsell: false },
    { label: '2er-Pack — 10 % Rabatt',                     price:  44.82, units: 2, isUpsell: true  },
    { label: '3er-Pack — 15 % Rabatt',                     price:  63.50, units: 3, isUpsell: true  },
  ],
  'vit-3': [
    { label: '1 Packung',                                  price:  34.90, units: 1, isUpsell: false },
    { label: '2er-Pack — 10 % Rabatt',                     price:  62.82, units: 2, isUpsell: true  },
    { label: '3er-Pack — 15 % Rabatt',                     price:  88.99, units: 3, isUpsell: true  },
  ],
  'vit-4': [
    { label: '1 Packung',                                  price:  49.90, units: 1, isUpsell: false },
    { label: '2er-Pack — 10 % Rabatt',                     price:  89.82, units: 2, isUpsell: true  },
    { label: '3er-Pack — 15 % Rabatt',                     price: 127.25, units: 3, isUpsell: true  },
  ],
  'ada-1': [
    { label: '1 Packung',                                  price:  32.90, units: 1, isUpsell: false },
  ],

  // Tablettenboxen: Standard 7 Fächer / XXL 28 Fächer (+50 %)
  'box-1': [
    { label: 'Standard — 7 Fächer / 1 Woche',              price:   7.90, units: 1, isUpsell: false },
    { label: 'XXL — 28 Fächer / 4 Wochen',                 price:  11.85, units: 1, isUpsell: true  },
  ],
  'box-2': [
    { label: 'Standard — 7 Fächer / 1 Woche',              price:  14.90, units: 1, isUpsell: false },
    { label: 'XXL — 28 Fächer / 4 Wochen',                 price:  22.35, units: 1, isUpsell: true  },
  ],
  'box-3': [
    { label: 'Standard — 7 Fächer / 1 Woche',              price:  22.90, units: 1, isUpsell: false },
    { label: 'XXL — 28 Fächer / 4 Wochen',                 price:  34.35, units: 1, isUpsell: true  },
  ],
  'box-4': [
    { label: 'Standard — 7 Fächer / 1 Woche',              price:  32.90, units: 1, isUpsell: false },
    { label: 'XXL — 28 Fächer / 4 Wochen',                 price:  49.35, units: 1, isUpsell: true  },
  ],
  'shk-1': [
    { label: '1 Stück',                                    price:  19.90, units: 1, isUpsell: false },
  ],

  // Tickets: 1 / 2 (Bring-A-Friend -15 %)
  'tic-1': [
    { label: '1 Ticket',                                   price:  49.00, units: 1, isUpsell: false },
    { label: '2 Tickets — Bring-A-Friend (15 % Rabatt)',   price:  83.30, units: 2, isUpsell: true  },
  ],
  'tic-2': [
    { label: '1 Ticket',                                   price:  89.00, units: 1, isUpsell: false },
    { label: '2 Tickets — Bring-A-Friend (15 % Rabatt)',   price: 151.30, units: 2, isUpsell: true  },
  ],
  'tic-3': [
    { label: '1 Ticket',                                   price: 149.00, units: 1, isUpsell: false },
    { label: '2 Tickets — Bring-A-Friend (15 % Rabatt)',   price: 253.30, units: 2, isUpsell: true  },
  ],
  'tic-4': [
    { label: '1 Ticket',                                   price: 249.00, units: 1, isUpsell: false },
    { label: '2 Tickets — Bring-A-Friend (15 % Rabatt)',   price: 423.30, units: 2, isUpsell: true  },
  ],
  'tee-1': [
    { label: '1 Stück',                                    price:  24.90, units: 1, isUpsell: false },
  ],
};

// ─── SZENARIEN-METADATA ─────────────────────────────────────────────────────
// Pro Szenario: Aufgabentitel, Beschreibung, Banner-Text, Filter-Tab-Logik.
// Wichtig: defaultTab landet immer auf der Hauptkategorie, damit Cross-Sell
// nur dann erscheint wenn der User aktiv den Reiter wechselt.
// ────────────────────────────────────────────────────────────────────────────
const SCENARIOS_META = [
  {
    id: 'vitamine',
    label: 'Vitamine',
    image: 'img/supplements.jpg', // optional, fallback = Emoji
    title: 'Vitamin D3 + K2 für Ihre Energie',
    text: 'Stellen Sie sich vor, Sie möchten Ihrem Körper im Winter mehr Vitamin D zuführen — für Energie, Immunsystem und Knochengesundheit. Stöbern Sie im Sortiment und wählen Sie das Produkt aus, das Sie tatsächlich kaufen würden.',
    bannerText: 'Aufgabe: Wählen Sie ein Vitamin-D3-Produkt aus, das Sie kaufen würden.',
    mainCategoryId: 'vitamine',
    crossSellCategoryId: 'adaptogen',
    mainCategoryLabel: 'Vitamine',
    crossSellCategoryLabel: 'Adaptogene',
    productSectionTitle: 'Unsere Vitamine',
    productSectionSub: 'Vier Optionen — von Basis-Versorgung bis liposomales Pro. Alle mit transparenter Herkunft und vollständiger Inhaltsdeklaration.',
  },
  {
    id: 'tablettenbox',
    label: 'Tablettenboxen',
    image: 'img/pillbox.jpg',
    title: 'Tablettenbox für Ihre Routine',
    text: 'Stellen Sie sich vor, Sie möchten Ihre tägliche Einnahme strukturieren — z.B. Vitamine, Medikamente oder Mineralien. Wählen Sie eine Tablettenbox aus, die Sie tatsächlich kaufen würden.',
    bannerText: 'Aufgabe: Wählen Sie eine Tablettenbox aus, die Sie kaufen würden.',
    mainCategoryId: 'tablettenbox',
    crossSellCategoryId: 'shaker',
    mainCategoryLabel: 'Tablettenboxen',
    crossSellCategoryLabel: 'Shaker',
    productSectionTitle: 'Unsere Tablettenboxen',
    productSectionSub: 'Vier Tablettenboxen mit jeweils 7 Fächern — von Basic bis Eco-Pro. Unterschied: Material, Funktion und Verarbeitung.',
  },
  {
    id: 'event',
    label: 'Festival-Tickets',
    image: 'img/event.jpg',
    title: 'VERDEA Wellness Festival 2026',
    text: 'Stellen Sie sich vor, Sie möchten am VERDEA Wellness Festival 2026 teilnehmen — ein Tag voller Workshops, Talks und Live-Acts rund um Gesundheit & Lifestyle. Wählen Sie eine Ticket-Kategorie aus, die Sie tatsächlich buchen würden.',
    bannerText: 'Aufgabe: Wählen Sie ein Ticket aus, das Sie buchen würden.',
    mainCategoryId: 'ticket',
    crossSellCategoryId: 'shirt',
    mainCategoryLabel: 'Tickets',
    crossSellCategoryLabel: 'Festival-Shirt',
    productSectionTitle: 'Festival-Tickets 2026',
    productSectionSub: 'Vier Ticket-Stufen — von Standard bis Backstage. Jede Stufe mit klar abgegrenztem Inklusivpaket.',
  },
];

// ─── CSV-PARSER (mini, ~25 Zeilen) ──────────────────────────────────────────
function parseProductsCSV(csv) {
  const lines = csv.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#'));
  if (lines.length < 2) return [];
  const header = lines[0].split(';').map(s => s.trim());
  return lines.slice(1).map(line => {
    const cells = line.split(';').map(s => s.trim());
    const obj = {};
    header.forEach((key, i) => {
      let val = cells[i] !== undefined ? cells[i] : '';
      if (key === 'certs') {
        val = val ? val.split('|').map(s => s.trim()).filter(Boolean) : [];
      } else if (key === 'price' || key === 'rating') {
        val = parseFloat(val) || 0;
      } else if (key === 'reviews') {
        val = parseInt(val, 10) || 0;
      }
      obj[key] = val;
    });
    return obj;
  });
}

// Helper: Preis in EUR formatieren (für Options-Labels)
function _fmtEur(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}

// ─── SZENARIEN ZUSAMMENBAUEN ────────────────────────────────────────────────
// Aus CSV + Maps die finale SCENARIOS-Struktur erzeugen, die das Render-System
// wie bisher erwartet (products[], jeweils mit ingredients/faq/options).
// ────────────────────────────────────────────────────────────────────────────
function buildScenarios() {
  const allProducts = parseProductsCSV(PRODUCTS_CSV);
  return SCENARIOS_META.map(meta => {
    const scenarioProducts = allProducts
      .filter(p => p.scenario === meta.id)
      .map(p => {
        const optionDetails = OPTIONS_BY_ID[p.id] || [
          { label: 'Standard', price: p.price, units: 1, isUpsell: false }
        ];
        return {
          ...p,
          // Bild-Pfad wird automatisch aus der Produkt-ID abgeleitet:
          //   z.B. vit-1 → img/vit-1.png
          // Fehlt die Datei, fällt das Rendering per onerror auf Emoji zurück.
          image: `img/${p.id}.png`,
          // Backwards-Kompatibilität für bestehenden Render-Code
          oldPrice: null,
          badge: null, // bewusst KEINE Badges (bestseller/neu zur Bias-Vermeidung entfernt)
          desc: p.short_desc, // .desc wird in der Detailseite verwendet
          ingredients: INGREDIENTS_BY_ID[p.id] || [],
          faq: FAQS_BY_ID[p.id] || [],
          usage: USAGE_BY_ID[p.id] || [],
          tabLabels: getTabLabels(p.category),
          optionDetails, // strukturierte Form mit isUpsell-Flag
          options: optionDetails.map(o => `${o.label} (${_fmtEur(o.price)})`), // legacy strings für Render
        };
      });
    return { ...meta, products: scenarioProducts };
  });
}

const SCENARIOS = buildScenarios();

// Reihenfolge der Szenarien — bei jedem Seitenaufruf neu randomisiert (Fisher-Yates).
// currentScenarioIndex = Display-Position (0/1/2)
// _scenarioOrder[currentScenarioIndex] = echter Szenario-Index (0=Vitamine, 1=Tablettenschachtel, 2=Event)
let _scenarioOrder = (() => {
  const arr = [0, 1, 2];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
})();

// Gibt den echten Szenario-Index für Tracker-Calls zurück
function getActualScenarioIdx() { return _scenarioOrder[currentScenarioIndex]; }

// ───────────────────────────────────────────────────────────────────────────
// PIKTOGRAMME (Inline-SVG, einfarbig — passen sich via currentColor an)
// ───────────────────────────────────────────────────────────────────────────
// Verwendung im JS:           ${icon('leaf')}
// Verwendung mit Größe:       ${icon('leaf', 20)}
// Inline im HTML (statisch):  einfach das SVG aus ICONS direkt einsetzen
// Farbe: stammt vom Eltern-Element (CSS color: …) → automatisch anpassend.
// ───────────────────────────────────────────────────────────────────────────
const ICONS = {
  // Pflanze / Marke
  leaf: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96a1 1 0 0 1 1.8.62 23.36 23.36 0 0 1-1.69 7.5 7 7 0 0 1-7.81 9.07Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>',
  // Wissenschaft / Mikroskop
  microscope: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1h-1a1 1 0 0 0-1 1v3"/></svg>',
  // Herz / kuratiert
  heart: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.5-1.45 3-3.2 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>',
  // Labor-Kolben
  flask: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M10 2v7.31"/><path d="M14 9.3V1.99"/><path d="M8.5 2h7"/><path d="M14 9.3a6.5 6.5 0 1 1-4 0"/><path d="M5.52 16h12.96"/></svg>',
  // Globus
  globe: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>',
  // Paket
  package: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m7.5 4.27 9 5.15"/><path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"/><path d="m3.3 7 8.7 5 8.7-5"/><path d="M12 22V12"/></svg>',
  // Handschlag
  handshake: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m11 17 2 2a1 1 0 1 0 3-3"/><path d="m14 14 2.5 2.5a1 1 0 1 0 3-3l-3.88-3.88a3 3 0 0 0-4.24 0l-.88.88a1 1 0 1 1-3-3l2.81-2.81a5.79 5.79 0 0 1 7.06-.87l.47.28a2 2 0 0 0 1.42.25L21 4"/><path d="m21 3 1 11h-2"/><path d="M3 3 2 14l6.5 6.5a1 1 0 1 0 3-3"/><path d="M3 4h8"/></svg>',
  // Funken / Highlight
  sparkle: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z"/></svg>',
  // Info-Kreis
  info: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>',
  // Glühbirne
  lightbulb: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/></svg>',
  // Chat-Bubble
  chat: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
  // E-Mail (Newsletter)
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>',
};

// Helper: produziert ein SVG-Snippet mit gewünschter Pixelgröße
function icon(name, size = 16) {
  const svg = ICONS[name];
  if (!svg) return '';
  return svg.replace('<svg ', `<svg width="${size}" height="${size}" class="icon" `);
}

// ───────────────────────────────────────────────────────────────────────────
// Studien-State (bleibt unverändert)
// ───────────────────────────────────────────────────────────────────────────
let currentScenarioIndex = 0;
let scenarioStartTime = 0;
let _taskIntroReopened = false;
let aiHistory = []; // [{ role: 'user'|'assistant', content: string }, …] — Konversations-Historie für die API
let aiPending = false;
let aiSellDone = false; // true sobald Up- oder Cross-Sell einmal gemacht wurde (pro Szenario) // True während ein Request läuft, verhindert Mehrfach-Submit

function getCurrentScenario() { return SCENARIOS[_scenarioOrder[currentScenarioIndex]]; }

// ===== PRODUCT DATA — wird dynamisch aus aktuellem Szenario geladen =====
let products = SCENARIOS[_scenarioOrder[0]].products;

// ===== STATE =====
let cart = [];
let currentFilter = 'all';

// ===== DOM =====
const productsGrid = document.getElementById('productsGrid');
const filterTabs   = document.getElementById('filterTabs');
const productDetail        = document.getElementById('productDetail');
const productDetailContent = document.getElementById('productDetailContent');
const backBtn       = document.getElementById('backBtn');
const aboutPage     = document.getElementById('aboutPage');
const aboutBackBtn  = document.getElementById('aboutBackBtn');
const aboutNavBtn   = document.getElementById('aboutNavBtn');
const aboutShopBtn  = document.getElementById('aboutShopBtn');
const footerAbout   = document.getElementById('footerAbout');
const cartBtn       = document.getElementById('cartBtn');
const cartDrawer    = document.getElementById('cartDrawer');
const cartOverlay   = document.getElementById('cartOverlay');
const cartClose     = document.getElementById('cartClose');
const cartBadge     = document.getElementById('cartBadge');
const cartItemsEl   = document.getElementById('cartItems');
const cartFooter    = document.getElementById('cartFooter');
const cartTotalEl   = document.getElementById('cartTotal');
const header        = document.getElementById('header');
const searchBtn     = document.getElementById('searchBtn');
const searchOverlay = document.getElementById('searchOverlay');
const searchClose   = document.getElementById('searchClose');
const searchInput   = document.getElementById('searchInput');
const heroCta       = document.getElementById('heroCta');
const heroAbout     = document.getElementById('heroAbout');
const logoHome      = document.getElementById('logoHome');
const transparencyBtn = document.getElementById('transparencyBtn');
const checkoutBtn   = document.getElementById('checkoutBtn');
const headerNavTabs = document.getElementById('headerNavTabs');
// Hinweis: navLinks und categoryCards (alte Versionen) sind raus —
// die Tabs werden jetzt dynamisch via renderScenarioTabs() generiert,
// und die Kategorien-Sektion existiert nicht mehr (Brand-Intro stattdessen).

// ===== RENDER PRODUCTS =====
function renderProducts(filter = 'all') {
  let list = filter === 'all' ? products : products.filter(p => p.category === filter);
  // Cross-Sell-Produkte immer ans Ende sortieren (für "Alle"-Reiter)
  list = [...list].sort((a, b) => {
    const aXS = a.role === 'cross-sell' ? 1 : 0;
    const bXS = b.role === 'cross-sell' ? 1 : 0;
    return aXS - bXS;
  });
  const sceneImg = (typeof getCurrentScenario === 'function' && getCurrentScenario()) ? getCurrentScenario().image : null;
  productsGrid.innerHTML = '';
  list.forEach((p, i) => {
    const card = document.createElement('div');
    const isCrossSell = p.role === 'cross-sell';
    card.className = 'product-card' + (isCrossSell ? ' product-card--cross-sell' : '');
    card.style.animationDelay = `${i * 55}ms`;
    const imgSrc = p.image || sceneImg;
    card.innerHTML = `
      <div class="product-card__img-wrap">
        ${imgSrc ? `<img class="product-card__img" src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.remove()" />` : ''}
        <div class="product-card__emoji">${p.emoji}</div>
        ${p.badge ? `<span class="product-card__badge badge--${p.badge}">${badgeLabel(p.badge)}</span>` : ''}
        <div class="product-card__certs">
          ${p.certs.slice(0,2).map(c => `<span class="product-card__cert-tag">${stripCertEmoji(c)}</span>`).join('')}
        </div>
        ${window.VERDEA_VARIANT === 'C' ? `<button class="product-card__chat-btn" aria-label="Chatbot öffnen">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Beraten lassen
        </button>` : ''}
        <div class="product-card__quick-add">Jetzt ansehen →</div>
      </div>
      <div class="product-card__info">
        <div class="product-card__brand">${p.brand}</div>
        <div class="product-card__name">${p.name}</div>
        <div class="product-card__tagline">${p.tagline}</div>
        <div class="product-card__price-row">
          ${p.oldPrice ? `<span class="product-card__price--old">${fmt(p.oldPrice)}</span>` : ''}
          <span class="product-card__price">${fmt(p.price)}</span>
          <span class="product-card__unit">${p.unit}</span>
        </div>
      </div>
    `;
    if (window.VERDEA_VARIANT === 'C') {
      card.querySelector('.product-card__chat-btn').addEventListener('click', e => {
        e.stopPropagation();
        openDetailWithBot(p);
      });
    }
    card.addEventListener('click', () => openDetail(p));
    productsGrid.appendChild(card);
  });
}

function badgeLabel(b) {
  return { new: 'Neu', sale: 'Sale', bestseller: 'Bestseller', bio: 'Bio' }[b] || b;
}
function fmt(n) {
  return n.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
}
function stars(r) {
  return '★'.repeat(Math.floor(r)) + (r % 1 >= 0.5 ? '½' : '');
}
// Entfernt führende Emoji-Sequenz aus Cert-Text (z.B. "🔬 GMP" → "GMP").
// Lässt rein-textliche Certs unverändert (z.B. "Klinisch getestet" → "Klinisch getestet").
function stripCertEmoji(text) {
  if (!text) return '';
  const parts = text.split(/\s+/);
  if (parts.length > 1 && /[^\x00-\x7F]/.test(parts[0])) {
    return parts.slice(1).join(' ');
  }
  return text;
}

// Map: Flaggen-Emoji → CSS-Klasse für unsere Mini-SVG-Flaggen
// Wenn ein Origin-Text mit einem Flaggen-Emoji startet, wird es durch
// ein farbiges <span class="flag flag-xx"></span> ersetzt.
const FLAG_EMOJI_TO_CLASS = {
  '🇩🇪': 'flag-de', '🇮🇳': 'flag-in', '🇯🇵': 'flag-jp', '🇮🇸': 'flag-is',
  '🇵🇭': 'flag-ph', '🇧🇪': 'flag-be', '🇩🇰': 'flag-dk', '🇦🇹': 'flag-at',
  '🇮🇹': 'flag-it', '🇪🇺': 'flag-eu', '🌍': 'flag-globe',
};
function replaceFlagEmojis(text) {
  if (!text) return '';
  let out = text;
  for (const [emoji, cls] of Object.entries(FLAG_EMOJI_TO_CLASS)) {
    if (out.includes(emoji)) {
      out = out.split(emoji).join(`<span class="flag ${cls}" aria-hidden="true"></span>`);
    }
  }
  return out;
}

// ===== FILTER + TABS =====
// Header zeigt nur EINEN Reiter „Produkte" — Klick führt zur Hauptkategorie
// (z.B. „Tablettenboxen"), NICHT zu „Alle". Die feinere Filter-Steuerung
// passiert über die Reiter direkt über dem Produktgrid.
function renderScenarioTabs(scenario) {
  if (!scenario) return;
  // Header-Navigation: ein einziger „Produkte"-Link
  headerNavTabs.innerHTML = `
    <a href="#" class="nav__link nav__link--products" data-category="${scenario.mainCategoryId}">Produkte</a>
  `;
  // Filter-Reiter über dem Produktgrid: Alle / Hauptkategorie / Cross-Sell
  filterTabs.innerHTML = `
    <button class="filter-tab" data-category="all">Alle</button>
    <button class="filter-tab" data-category="${scenario.mainCategoryId}">${scenario.mainCategoryLabel}</button>
    <button class="filter-tab" data-category="${scenario.crossSellCategoryId}">${scenario.crossSellCategoryLabel}</button>
  `;
}

// Event-Delegation: ein Click-Handler reicht für alle dynamisch erzeugten Tabs.
filterTabs.addEventListener('click', e => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  setFilter(tab.dataset.category);
  // filter_change — kein dediziertes Tracking in V10
});

headerNavTabs.addEventListener('click', e => {
  const link = e.target.closest('[data-category]');
  if (!link) return;
  e.preventDefault();
  setFilter(link.dataset.category);
  scrollToProducts();
  // filter_change — kein dediziertes Tracking in V10
});

function setFilter(cat) {
  currentFilter = cat;
  // Active-State für beide Tab-Sets gleichzeitig setzen
  document.querySelectorAll('.filter-tab').forEach(t =>
    t.classList.toggle('active', t.dataset.category === cat));
  document.querySelectorAll('.nav__link[data-category]').forEach(l =>
    l.classList.toggle('active', l.dataset.category === cat));
  renderProducts(cat);
}

function scrollToProducts() {
  document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
}

heroCta.addEventListener('click', () => scrollToProducts());

// ===== PRODUCT DETAIL =====
function openDetail(p, preSelectOptionIdx = 0) {
  window._openDetailProductId = p.id;
  if (window.VerdTracker) window.VerdTracker.trackPdpOpen(p.id, getActualScenarioIdx());
  // Mobile Variant A: Bot in kompakte Ansicht — Produkt soll sauber sichtbar sein
  if (window.innerWidth <= 768 && typeof window._variantACollapseBot === 'function') {
    window._variantACollapseBot();
  }

  const sceneImg = (typeof getCurrentScenario === 'function' && getCurrentScenario()) ? getCurrentScenario().image : null;
  const detailImg = p.image || sceneImg;
  productDetailContent.innerHTML = `
    <div class="detail-gallery">
      <div class="detail-gallery__main" id="mainEmoji">
        ${detailImg ? `<img class="detail-gallery__img" src="${detailImg}" alt="${p.name}" onerror="this.outerHTML='<span class=&quot;detail-gallery__emoji&quot;>${p.emoji}</span>'" />` : `<span class="detail-gallery__emoji">${p.emoji}</span>`}
      </div>
    </div>
    <div class="detail-info">
      <div class="detail-info__brand">${p.brand}</div>
      <h1 class="detail-info__name">${p.name}</h1>
      <p class="detail-info__tagline">${p.tagline}</p>
      <div class="detail-info__rating">
        <span class="detail-stars">${stars(p.rating)}</span>
        <span class="detail-rating-count">${p.rating} · ${p.reviews} Bewertungen</span>
      </div>
      <div class="detail-cert-row">
        ${p.certs.map(c => `<span class="detail-cert">${stripCertEmoji(c)}</span>`).join('')}
      </div>
      <div class="detail-price">
        ${p.oldPrice ? `<span class="detail-price__old">${fmt(p.oldPrice)}</span>` : ''}
        <span class="detail-price__main">${fmt(p.price)}</span>
        ${p.oldPrice ? `<span class="detail-price__save">Sie sparen ${fmt(p.oldPrice - p.price)}</span>` : ''}
        <span class="detail-price__unit" style="margin-left:auto">${p.unit}</span>
      </div>
      <p class="detail-desc">${p.desc}</p>

      <div class="detail-options">
        <div class="detail-options__label">Menge wählen</div>
        <div class="detail-options__btns">
          ${p.options.map((o, i) => `<button class="detail-option-btn ${i===preSelectOptionIdx?'selected':''}" data-option-index="${i}">${o}</button>`).join('')}
        </div>
      </div>

      <div class="detail-actions">
        <button class="btn btn--green" id="detailAddCart">In den Warenkorb</button>
        <button class="btn btn--outline" style="flex:0;padding:13px 16px;" aria-label="Merkliste">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>

      <!-- Tabs -->
      <div class="detail-tabs">
        <button class="detail-tab-btn active" data-tab="ingredients">${p.tabLabels.ingredients}</button>
        <button class="detail-tab-btn" data-tab="usage">${p.tabLabels.usage}</button>
        <button class="detail-tab-btn" data-tab="faq">FAQ</button>
      </div>

      <div class="detail-tab-content active" data-tab="ingredients">
        <div class="detail-ingredients">
          <div class="detail-ingredients__title">${p.tabLabels.sectionTitle}</div>
          ${p.ingredients.map(ing => {
            const showAmount = ing.amount && ing.amount !== '—' && ing.amount !== '';
            const showOrigin = ing.origin && ing.origin !== '—' && ing.origin !== '';
            return `
            <div class="ingredient-row">
              <div class="ingredient-row__main">
                <div class="ingredient-row__name">${ing.name}</div>
                ${ing.sub ? `<div class="ingredient-row__sub">${ing.sub}</div>` : ''}
              </div>
              ${(showAmount || showOrigin) ? `
                <div class="ingredient-row__meta">
                  ${showAmount ? `<span class="ingredient-row__amount">${ing.amount}</span>` : ''}
                  ${showOrigin ? `<span class="ingredient-row__origin">${replaceFlagEmojis(ing.origin)}</span>` : ''}
                </div>
              ` : ''}
            </div>
            `;
          }).join('')}
        </div>
        ${p.tabLabels.disclaimer ? `<p style="font-size:12px;color:var(--color-muted);margin-top:8px">${p.tabLabels.disclaimer}</p>` : ''}
      </div>

      <div class="detail-tab-content" data-tab="usage">
        ${(p.usage || []).map(u => `
          <div class="detail-feature">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            <div><strong>${u.strong}:</strong> ${u.text}</div>
          </div>
        `).join('')}
      </div>

      <div class="detail-tab-content" data-tab="faq">
        <div class="detail-faq">
          ${p.faq.map(f => `
            <div class="faq-item">
              <button class="faq-question">
                ${f.q}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
              </button>
              <div class="faq-answer"><p>${f.a}</p></div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  // Thumb clicks
  productDetailContent.querySelectorAll('.detail-thumb').forEach(t => {
    t.addEventListener('click', () => {
      productDetailContent.querySelectorAll('.detail-thumb').forEach(x => x.classList.remove('active'));
      t.classList.add('active');
      document.getElementById('mainEmoji').textContent = t.dataset.emoji;
    });
  });

  // Option buttons — speichert gewählten Index und aktualisiert Preis live
  let selectedOptionIndex = preSelectOptionIdx;
  productDetailContent.querySelectorAll('.detail-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      productDetailContent.querySelectorAll('.detail-option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      selectedOptionIndex = parseInt(btn.dataset.optionIndex, 10) || 0;
      const opt = p.optionDetails && p.optionDetails[selectedOptionIndex];
      if (opt) {
        const priceEl = productDetailContent.querySelector('.detail-price__main');
        if (priceEl) priceEl.textContent = fmt(opt.price);
      }
    });
  });

  // Preis für vorausgewählte Option direkt anzeigen
  if (preSelectOptionIdx > 0 && p.optionDetails && p.optionDetails[preSelectOptionIdx]) {
    const priceEl = productDetailContent.querySelector('.detail-price__main');
    if (priceEl) priceEl.textContent = fmt(p.optionDetails[preSelectOptionIdx].price);
  }

  // Tab switching + Tracking
  productDetailContent.querySelectorAll('.detail-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      productDetailContent.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('active'));
      productDetailContent.querySelectorAll('.detail-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      productDetailContent.querySelector(`.detail-tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
      if (window.VerdTracker) window.VerdTracker.trackTabClick(btn.dataset.tab, getActualScenarioIdx());
    });
  });

  // FAQ accordion
  productDetailContent.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-question').addEventListener('click', () => {
      item.classList.toggle('open');
    });
  });

  // Add to cart — übergibt die gewählte Option, damit der korrekte Preis greift
  document.getElementById('detailAddCart').addEventListener('click', () => {
    const opt = (p.optionDetails && p.optionDetails[selectedOptionIndex]) || (p.optionDetails && p.optionDetails[0]) || null;
    addToCart(p, opt);
    const btn = document.getElementById('detailAddCart');
    btn.textContent = '✓ Hinzugefügt';
    btn.style.background = '#4a7c4e';
    setTimeout(() => { btn.textContent = 'In den Warenkorb'; btn.style.background = ''; }, 2000);
  });

  // Falls About-Seite offen war, erst schließen
  if (aboutPage.classList.contains('open')) aboutPage.classList.remove('open');
  productDetail.classList.add('open');
  document.body.classList.add('viewing-overlay');
  // Springen wir an den Anfang der Detailseite (echte Seitennavigation)
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

  // Variante C: Bot einbetten (erst nach dem Rendern)
  if (window.VERDEA_VARIANT === 'C') {
    setTimeout(() => embedBotInDetail(), 100);
  }
}

function openDetailWithBot(p) {
  openDetail(p);
  const v = window.VERDEA_VARIANT;
  if (v === 'A') {
    // Nur auf Desktop focus setzen — auf Mobile würde Keyboard ohne echten Tipp öffnen
    if (window.innerWidth > 768) setTimeout(() => { if (typeof aiInput !== 'undefined' && aiInput) aiInput.focus(); }, 200);
  } else if (v === 'B') {
    setTimeout(() => openAiBot(false), 200);
  } else if (v === 'C') {
    if (window.VerdTracker) window.VerdTracker.trackBotOpenSource('karte');
    setTimeout(() => {
      openVariantCChat();
      // Zum Gallery-Element scrollen: Bild-Anfang direkt unter dem Header sichtbar
      setTimeout(() => {
        const gallery = document.querySelector('.detail-gallery');
        const header = document.querySelector('.header');
        if (gallery) {
          const headerH = header ? header.offsetHeight : 70;
          const top = gallery.getBoundingClientRect().top + window.scrollY - headerH - 8;
          window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
        }
      }, 150);
    }, 280);
  }
}

function closeDetail() {
  // Variante C: Bot aus Detailseite entfernen und PDP-Zeit tracken
  if (window.VERDEA_VARIANT === 'C') {
    removeBotFromDetail();
  }
  // PDP-Close tracking — wir müssen das aktuell offene Produkt herausfinden
  // Wir nutzen ein globales _openDetailProductId das wir beim Öffnen setzen
  if (window._openDetailProductId && window.VerdTracker) {
    window.VerdTracker.trackPdpClose(window._openDetailProductId, getActualScenarioIdx());
    window._openDetailProductId = null;
  }
  productDetail.classList.remove('open');
  document.body.classList.remove('viewing-overlay');
  // Sanft zurück zur Produktliste scrollen
  const productsSec = document.getElementById('productsSection');
  if (productsSec) {
    productsSec.scrollIntoView({ behavior: 'smooth', block: 'start' });
  } else {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }
}

backBtn.addEventListener('click', closeDetail);

// ===== ABOUT PAGE =====
function openAbout() {
  // Falls Detail offen war, erst schließen
  if (productDetail.classList.contains('open')) productDetail.classList.remove('open');
  aboutPage.classList.add('open');
  document.body.classList.add('viewing-overlay');
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  // about_view — kein dediziertes Tracking in V10
}
function closeAbout() {
  aboutPage.classList.remove('open');
  document.body.classList.remove('viewing-overlay');
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

[aboutNavBtn, heroAbout, transparencyBtn].forEach(el => el?.addEventListener('click', e => { e.preventDefault(); openAbout(); }));
aboutBackBtn.addEventListener('click', closeAbout);
aboutShopBtn.addEventListener('click', () => { closeAbout(); scrollToProducts(); });
footerAbout?.addEventListener('click', e => { e.preventDefault(); openAbout(); });

// ===== CART =====
// Cart-Items kombinieren Produkt-ID + Option-Label zu einer eindeutigen cartId,
// damit z.B. "1 Packung" und "2er-Pack" desselben Vitamins separate Einträge sind.
function addToCart(product, option) {
  // Fallback wenn keine Option übergeben wurde (z.B. später beim Aufruf aus KI-Link)
  const opt = option || (product.optionDetails && product.optionDetails[0]) || {
    label: 'Standard', price: product.price, units: 1, isUpsell: false,
  };
  const cartId = `${product.id}::${opt.label}`;
  const ex = cart.find(i => i.cartId === cartId);
  if (ex) {
    ex.qty++;
  } else {
    cart.push({
      ...product,
      cartId,
      price: opt.price,        // ← korrekter Options-Preis (nicht mehr Basispreis)
      optionLabel: opt.label,
      isUpsell: !!opt.isUpsell,
      units: opt.units || 1,
      qty: 1,
    });
  }
  renderCart();
  openCart();
  showToast(`„${product.name}" wurde hinzugefügt`);
  if (window.VerdTracker) window.VerdTracker.trackCartAdd(
    product.id,
    getActualScenarioIdx(),
    opt.price,
    !!opt.isUpsell,
    product.role === 'cross-sell'
  );
}

function removeFromCart(cartId) {
  cart = cart.filter(i => i.cartId !== cartId);
  renderCart();
}

function renderCart() {
  const count = cart.reduce((s, i) => s + i.qty, 0);
  cartBadge.textContent = count;
  cartBadge.classList.toggle('visible', count > 0);

  if (!cart.length) {
    cartItemsEl.innerHTML = '<p class="cart-empty">Ihr Warenkorb ist leer.</p>';
    cartFooter.style.display = 'none';
    return;
  }
  cartItemsEl.innerHTML = cart.map(item => `
    <div class="cart-item">
      <div class="cart-item__emoji">${item.emoji}</div>
      <div class="cart-item__info">
        <div class="cart-item__brand">${item.brand}</div>
        <div class="cart-item__name">${item.name}${item.qty > 1 ? ` ×${item.qty}` : ''}</div>
        ${item.optionLabel ? `<div class="cart-item__option">${item.optionLabel}</div>` : ''}
        <div>
          <span class="cart-item__price">${fmt(item.price * item.qty)}</span>
          <span class="cart-item__remove" data-cart-id="${item.cartId}">Entfernen</span>
        </div>
      </div>
    </div>
  `).join('');
  cartItemsEl.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(btn.dataset.cartId));
  });
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  cartTotalEl.textContent = fmt(total);
  cartFooter.style.display = 'block';
}

function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  // cart_open — kein dediziertes Tracking in V10
}
function closeCart() {
  cartDrawer.classList.remove('open');
  cartOverlay.classList.remove('active');
  // Body-Lock immer aufheben — Detail/About nutzen kein Body-Lock mehr.
  // Falls noch ein Gate aktiv ist, übernimmt lockBody die Steuerung.
  document.body.style.overflow = '';
}

cartBtn.addEventListener('click', openCart);
cartClose.addEventListener('click', closeCart);
cartOverlay.addEventListener('click', closeCart);

// ===== SEARCH =====
searchBtn.addEventListener('click', () => { searchOverlay.classList.add('active'); setTimeout(() => searchInput.focus(), 80); });
searchClose.addEventListener('click', () => searchOverlay.classList.remove('active'));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') { searchOverlay.classList.remove('active'); closeCart(); }
});

// ===== HEADER SCROLL =====
window.addEventListener('scroll', () => { header.classList.toggle('scrolled', scrollY > 60); }, { passive: true });

// ===== LOGO HOME =====
logoHome.addEventListener('click', e => {
  e.preventDefault();
  if (productDetail.classList.contains('open')) closeDetail();
  if (aboutPage.classList.contains('open')) closeAbout();
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

// ===== TOAST =====
function showToast(msg) {
  let t = document.querySelector('.toast');
  if (!t) { t = document.createElement('div'); t.className = 'toast'; document.body.appendChild(t); }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2600);
}

// ===== NEWSLETTER =====
document.getElementById('newsletterForm').addEventListener('submit', e => {
  e.preventDefault();
  const input = e.target.querySelector('input');
  if (input.value) {
    showToast('Danke! Sie erhalten ab sofort unseren Newsletter.');
    // newsletter — kein dediziertes Tracking in V10
    input.value = '';
  }
});

// =====================================================================
// ===== STUDY FLOW: Welcome → Demographics → 3 Scenarios → Survey =====
// =====================================================================

// ----- Hero CTAs scroll to products (already wired); we also lock scrolling during gates -----
function lockBody(lock) {
  document.body.style.overflow = lock ? 'hidden' : '';
}

// ----- Gate helpers -----
const gateWelcome = document.getElementById('gateWelcome');
const gateDemographics = document.getElementById('gateDemographics');
const gateTaskIntro = document.getElementById('gateTaskIntro');
const gateSurvey = document.getElementById('gateSurvey');
const gateThanks = document.getElementById('gateThanks');
const taskBanner = document.getElementById('taskBanner');
const taskBannerStep = document.getElementById('taskBannerStep');
const taskBannerText = document.getElementById('taskBannerText');
const taskBannerHelp = document.getElementById('taskBannerHelp');
const aiFab = document.getElementById('aiFab');
const aiBot = document.getElementById('aiBot');
const aiBotClose = document.getElementById('aiBotClose');

function showGate(el) {
  [gateWelcome, gateDemographics, gateTaskIntro, gateSurvey, gateThanks].forEach(g => g.classList.remove('active'));
  el.classList.add('active');
  lockBody(true);
}
function hideAllGates() {
  [gateWelcome, gateDemographics, gateTaskIntro, gateSurvey, gateThanks].forEach(g => g.classList.remove('active'));
  lockBody(false);
}

// Lock body initially since welcome is shown
lockBody(true);

// ----- WELCOME -----
const consentBox = document.getElementById('consentBox');
const welcomeStart = document.getElementById('welcomeStart');
consentBox.addEventListener('change', () => welcomeStart.disabled = !consentBox.checked);
// Einwilligung → direkt in Szenario 1 (keine Demografie vorher)
welcomeStart.addEventListener('click', () => {
  if (window.VerdTracker) {
    window.VerdTracker._studyStartMs = Date.now();
    const scOrderStr = _scenarioOrder.map(i => ['sc1','sc2','sc3'][i]).join(',');
    window.VerdTracker._surveyAnswers['scenario_order'] = scOrderStr;
  }
  startScenario(0);
});

// ----- DEMOGRAPHICS (jetzt am Ende, nach der Umfrage) -----
document.getElementById('demoForm').addEventListener('submit', e => {
  e.preventDefault();
  const age = document.getElementById('demoAge').value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  const income = document.getElementById('demoIncome').value;
  const occupation = document.getElementById('demoOccupation').value;
  const errEl = document.getElementById('demoError');
  if (!age || !gender || !income || !occupation) {
    errEl.textContent = 'Bitte füllen Sie alle Felder aus.'; return;
  }
  const ageNum = Number(age);
  if (!Number.isInteger(ageNum) || ageNum < 10 || ageNum > 99) {
    errEl.textContent = 'Bitte gib dein Alter als zweistellige Zahl ein (z.B. 22).'; return;
  }
  errEl.textContent = '';
  if (window.VerdTracker) {
    window.VerdTracker.setDemographics({ age, gender, income, occupation });
    window.VerdTracker.complete();
  }
  showGate(gateThanks);
});

// ----- SCENARIO START -----
function startScenario(idx) {
  currentScenarioIndex = idx;
  scenarioStartTime = Date.now();
  _taskIntroReopened = false;
  const sc = getCurrentScenario();
  if (window.VerdTracker) {
    window.VerdTracker.startScenario(_scenarioOrder[idx], sc.id);
    window.VerdTracker._displayStep = idx + 1;
  }

  // Reset cart for clean scenario
  cart = [];
  renderCart();

  // Update product list
  products = sc.products;

  // Tabs für aktuelles Szenario rendern (Header + Filter-Reiter)
  renderScenarioTabs(sc);

  // Section-Header (über Produktgrid) szenario-spezifisch
  const stEl = document.getElementById('sectionTitle');
  const ssEl = document.getElementById('sectionSub');
  if (stEl && sc.productSectionTitle) stEl.textContent = sc.productSectionTitle;
  if (ssEl && sc.productSectionSub) ssEl.textContent = sc.productSectionSub;

  // Default: nicht "Alle", sondern die Hauptkategorie — damit der Cross-Sell-
  // Reiter bewusst angeklickt werden muss (= relevant für Tracking).
  setFilter(sc.mainCategoryId);

  // Show task intro modal
  document.getElementById('taskIntroStep').textContent = `Aufgabe ${idx + 1} von ${SCENARIOS.length} · ${sc.label}`;
  document.getElementById('taskIntroTitle').textContent = sc.title;
  document.getElementById('taskIntroText').textContent = sc.text;
  showGate(gateTaskIntro);

  // Banner data
  taskBannerStep.textContent = `Aufgabe ${idx + 1} von ${SCENARIOS.length}`;
  taskBannerText.textContent = sc.bannerText;

  // AI bot reset
  resetAiBot(sc);

  // Philosophy section — szenario-spezifisch
  const philosophyData = {
    vitamine: {
      label: 'Unsere Philosophie',
      title: 'Radikale Transparenz<br/>ist unser Standard',
      body: 'Wir zeigen Ihnen jede Zutat, deren Herkunftsland und den Anteil in der Kapsel. Keine versteckten Mischungen, kein „proprietary blend" — nur reine Wahrheit über das, was Sie schlucken.',
      list: ['Vollständige Inhaltsstoff-Deklaration', 'Chargen-Zertifikate öffentlich einsehbar', 'Herkunft jeder Zutat dokumentiert', 'Keine Füllstoffe oder künstlichen Zusätze'],
    },
    tablettenbox: {
      label: 'Unser Ansatz',
      title: 'Ordnung, die<br/>wirklich hält',
      body: 'Gute Gewohnheiten brauchen verlässliche Helfer. Unsere Tablettenboxen sind nicht fürs Regal gedacht — sie sind für den Alltag: robust, praktisch und langlebig genug, um Jahre durchzuhalten.',
      list: ['Materialien geprüft nach Lebensmittelstandard', 'Kein Weichmacher, kein BPA', 'Jedes Fach hält dicht — auch im Koffer', 'Langlebigkeit statt Wegwerf-Mentalität'],
    },
    event: {
      label: 'Unser Versprechen',
      title: 'Momente, die<br/>im Gedächtnis bleiben',
      body: 'Ein guter Tag braucht keine Ablenkung — er braucht den richtigen Rahmen. Das VERDEA Festival ist von Grund auf so geplant, dass Sie das Programm wirklich erleben, nicht nur dabei sind.',
      list: ['Kleine Gruppen, echte Gespräche', 'Kuratiertes Programm ohne Füller', 'Nachhaltige Veranstaltung, CO₂-kompensiert', 'Lokale Partner und regionale Küche'],
    },
  };
  const phd = philosophyData[sc.id] || philosophyData.vitamine;
  const phLabel = document.querySelector('.transparency__text .section-label');
  const phTitle = document.querySelector('.transparency__text .section-title');
  const phBody = document.querySelector('.transparency__text > p:not(.section-label)');
  const phList = document.querySelector('.transparency__list');
  if (phLabel) phLabel.textContent = phd.label;
  if (phTitle) phTitle.innerHTML = phd.title;
  if (phBody) phBody.textContent = phd.body;
  if (phList) phList.innerHTML = phd.list.map(item => `<li><span>✓</span> ${item}</li>`).join('');
}

document.getElementById('taskIntroStart').addEventListener('click', () => {
  hideAllGates();
  taskBanner.hidden = false;
  document.body.classList.add('has-task-banner');
  // close any open panels
  if (productDetail.classList.contains('open')) closeDetail();
  if (aboutPage.classList.contains('open')) closeAbout();
  closeCart();
  if (!_taskIntroReopened) {
    setTimeout(() => scrollToProducts(), 200);
  }
  _taskIntroReopened = false;
  // Varianten-spezifische Bot-Initialisierung
  initVariantBot();
});

// Re-show task intro when participant clicks "ℹ️" (desktop) or the step pill (mobile)
taskBannerHelp.addEventListener('click', () => {
  _taskIntroReopened = true;
  showGate(gateTaskIntro);
});
taskBannerStep.addEventListener('click', () => {
  _taskIntroReopened = true;
  showGate(gateTaskIntro);
});

// ----- CHECKOUT INTERCEPTION (= scenario completion) -----
checkoutBtn.addEventListener('click', () => {
  if (!cart.length) return;
  const sc = getCurrentScenario();
  // Hauptauswahl = erstes Hauptkategorie-Produkt im Cart (Cross-Sell extra erfasst)
  const mainChosen = cart.find(i => i.role === 'main') || cart[0];
  const crossSellInCart = cart.filter(i => i.role === 'cross-sell');
  const upsellInCart = cart.filter(i => i.isUpsell);
  if (window.VerdTracker) window.VerdTracker.trackCheckout(getActualScenarioIdx(), { mainChosen });

  closeCart();

  if (currentScenarioIndex + 1 < SCENARIOS.length) {
    startScenario(currentScenarioIndex + 1);
  } else {
    finishScenarios();
  }
});

function finishScenarios() {
  taskBanner.hidden = true;
  document.body.classList.remove('has-task-banner');
  document.body.classList.remove('bot-open');
  aiFab.hidden = true;
  aiBot.hidden = true;
  // Eingebetteten Bot (Variante C) aufräumen
  const embed = document.getElementById('variantCEmbed');
  if (embed) embed.remove();
  const openBtn = document.getElementById('variantCOpenBtn');
  if (openBtn) openBtn.remove();
  startSurvey();
}

// ============== AI CHATBOT ==============
const aiMessagesEl = document.getElementById('aiMessages');
const aiSuggestions = document.getElementById('aiSuggestions');
const aiForm = document.getElementById('aiForm');
const aiInput = document.getElementById('aiInput');

function openAiBot(autoOpen = false) {
  if (window.VERDEA_VARIANT === 'A') return;
  aiBot.hidden = false;
  aiFab.hidden = true;
  // Variant B auf Mobile: body.bot-open setzen damit Padding-Bottom greift
  if (window.VERDEA_VARIANT === 'B' && window.innerWidth <= 768) {
    document.body.classList.add('bot-open');
  }
  setTimeout(() => aiInput.focus(), 100);
  if (window.VerdTracker) window.VerdTracker.trackBotOpen();
}
function closeAiBot() {
  if (window.VERDEA_VARIANT === 'A') return;
  aiBot.hidden = true;
  document.body.classList.remove('bot-open');
  if (window.VERDEA_VARIANT === 'B') aiFab.hidden = false;
  if (window.VerdTracker) window.VerdTracker.trackBotClose();
}

// Variante B: kleineres Fenster-Styling überschreiben
function applyVariantBotStyle() {
  if (window.VERDEA_VARIANT === 'B') {
    const isMobile = window.innerWidth <= 768;
    // Popup-Breite: auf Mobile schmaler, aber NICHT full-width
    const popupW = isMobile ? Math.min(400, window.innerWidth - 16) : 340;
    const popupH = isMobile ? 360 : 'clamp(420px, 65vh, 600px)';
    aiBot.style.width = popupW + 'px';
    aiBot.style.height = typeof popupH === 'string' ? popupH : popupH + 'px';
    if (isMobile) aiBot.style.maxHeight = popupH + 'px';
    aiBot.style.top = 'auto';
    aiBot.style.bottom = isMobile ? '72px' : '80px';
    aiBot.style.right = isMobile ? '12px' : '16px';
    aiBot.style.left = 'auto';
    aiBot.style.borderRadius = '16px';
    aiBot.style.boxShadow = '0 8px 40px rgba(44,95,46,0.22)';
    aiBot.style.border = '1px solid var(--color-border)';
    // Kompakter Header
    const hdr = aiBot.querySelector('.ai-bot__header');
    if (hdr) {
      hdr.style.cssText = 'background:var(--color-green);padding:10px 14px;height:auto;display:flex;align-items:center;gap:10px;flex-shrink:0;border-bottom:none;';
    }
    const avatar = aiBot.querySelector('.ai-bot__avatar');
    if (avatar) avatar.style.cssText = 'width:28px;height:28px;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.35);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;flex-shrink:0;';
    const title = aiBot.querySelector('.ai-bot__title');
    if (title) title.style.cssText = 'color:#fff;font-size:13.5px;';
    const sub = aiBot.querySelector('.ai-bot__sub');
    if (sub) sub.style.display = 'none';
    const closeBtn = aiBot.querySelector('.ai-bot__close');
    if (closeBtn) closeBtn.style.cssText = 'background:rgba(255,255,255,0.18);color:#fff;border-radius:50%;width:28px;height:28px;min-width:28px;max-width:28px;min-height:28px;max-height:28px;box-sizing:border-box;display:flex;align-items:center;justify-content:center;margin-left:auto;cursor:pointer;border:none;flex-shrink:0;';
    // Suggestion-Chips deutlich kleiner
    const sugg = aiBot.querySelector('.ai-bot__suggestions');
    if (sugg) sugg.style.cssText = 'padding:6px 10px;gap:5px;background:var(--color-surface);border-top:1px solid var(--color-border);display:flex;flex-wrap:wrap;flex-shrink:0;';
    // Dynamisch: alle ai-suggestion im Popup verkleinern (auch nach Reload via MutationObserver)
    const shrinkChips = () => {
      aiBot.querySelectorAll('.ai-suggestion').forEach(ch => {
        ch.style.cssText = 'padding:4px 9px;font-size:10.5px;font-weight:500;background:var(--color-green-pale);color:var(--color-green);border-radius:100px;cursor:pointer;border:1px solid transparent;font-family:inherit;';
      });
    };
    shrinkChips();
    // Observer für nachträglich hinzugefügte Chips
    if (!aiBot._chipObserver) {
      aiBot._chipObserver = new MutationObserver(shrinkChips);
      aiBot._chipObserver.observe(aiBot, { childList: true, subtree: true });
    }
  }
}

// Variante C: Öffnen-Button auf Bild, Chat-Panel darunter
function embedBotInDetail() {
  if (window.VERDEA_VARIANT !== 'C') return;
  aiBot.hidden = true;
  aiFab.hidden = true;

  const detailContent = document.getElementById('productDetailContent');
  if (!detailContent) return;

  const gallery = detailContent.querySelector('.detail-gallery');
  const galleryMain = detailContent.querySelector('.detail-gallery__main');
  if (!gallery || !galleryMain) return;

  // Öffnen-Button auf dem Bild (oben rechts), falls noch nicht da
  if (!document.getElementById('variantCOpenBtn')) {
    const openBtn = document.createElement('button');
    openBtn.id = 'variantCOpenBtn';
    openBtn.type = 'button';
    openBtn.className = 'variant-c-open-btn';
    openBtn.innerHTML = `
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
      KI-Berater fragen
    `;
    openBtn.addEventListener('click', () => {
      if (window.VerdTracker) window.VerdTracker.trackBotOpenSource('pdp');
      openVariantCChat();
    });
    galleryMain.appendChild(openBtn);
  }
}

function openVariantCChat() {
  const detailContent = document.getElementById('productDetailContent');
  if (!detailContent) return;
  const gallery = detailContent.querySelector('.detail-gallery');
  const galleryMain = detailContent.querySelector('.detail-gallery__main');
  if (!gallery || !galleryMain) return;

  // Öffnen-Button ausblenden
  const openBtn = document.getElementById('variantCOpenBtn');
  if (openBtn) openBtn.hidden = true;

  // Sticky entfernen, Bild verkleinern
  gallery.classList.add('variant-c-bot-open');

  // Chat-Panel erzeugen (falls noch nicht da)
  let embed = document.getElementById('variantCEmbed');
  if (!embed) {
    embed = document.createElement('div');
    embed.id = 'variantCEmbed';
    embed.className = 'variant-c-embed';
    embed.innerHTML = `
      <div class="variant-c-embed__header">
        <div style="width:28px;height:28px;border-radius:50%;background:rgba(255,255,255,0.2);border:1px solid rgba(255,255,255,0.35);display:flex;align-items:center;justify-content:center;color:#fff;flex-shrink:0;">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19.2 2.96a1 1 0 0 1 1.8.62 23.36 23.36 0 0 1-1.69 7.5 7 7 0 0 1-7.81 9.07Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6"/></svg>
        </div>
        <div>
          <div style="font-size:13px;font-weight:600;color:#fff;line-height:1.2;">KI-Berater</div>
          <div style="font-size:10.5px;color:rgba(255,255,255,0.8);margin-top:1px;">Online · sofort verfügbar</div>
        </div>
        <button id="variantCEmbedClose" type="button" aria-label="Schließen" style="margin-left:auto;background:rgba(255,255,255,0.2);border:none;border-radius:50%;width:26px;height:26px;display:flex;align-items:center;justify-content:center;color:#fff;cursor:pointer;flex-shrink:0;">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <div id="aiMessagesEmbed" style="flex:1;min-height:0;overflow-y:auto;padding:10px 14px;display:flex;flex-direction:column;gap:8px;background:var(--color-bg);"></div>
      <div id="aiSuggestionsEmbed" style="padding:6px 10px;gap:5px;background:var(--color-surface);border-top:1px solid var(--color-border);display:flex;flex-wrap:wrap;flex-shrink:0;"></div>
      <form id="aiFormEmbed" style="display:flex;gap:8px;padding:10px 12px 12px;background:var(--color-surface);border-top:1px solid var(--color-border);flex-shrink:0;">
        <input type="text" class="ai-bot__input" id="aiInputEmbed" placeholder="Frag den KI-Berater …" autocomplete="off" />
        <button type="submit" class="ai-bot__send" aria-label="Senden">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
        </button>
      </form>
    `;
    embed.querySelector('#aiFormEmbed').addEventListener('submit', e => {
      e.preventDefault();
      const inp = embed.querySelector('#aiInputEmbed');
      aiInput.value = inp.value;
      inp.value = '';
      sendAiMessage();
    });
    embed.querySelector('#variantCEmbedClose').addEventListener('click', closeVariantCChat);
  }

  // Hinter das Bild einhängen (innerhalb der Gallery)
  gallery.appendChild(embed);
  embed.hidden = false;

  const embedMsgs = document.getElementById('aiMessagesEmbed');
  const embedSugg = document.getElementById('aiSuggestionsEmbed');
  const isFirstOpen = embedMsgs && embedMsgs.children.length === 0;

  if (isFirstOpen) {
    // Kontextfrage: möchte der Nutzer nur Infos zum aktuellen Produkt oder allgemeine Beratung?
    const currentProduct = window._openDetailProductId
      ? (getCurrentScenario()?.products || []).find(p => p.id === window._openDetailProductId)
      : null;
    const productName = currentProduct ? currentProduct.name : 'diesem Produkt';

    const contextMsg = document.createElement('div');
    contextMsg.className = 'ai-msg ai-msg--bot';
    contextMsg.textContent = `Hallo! Möchten Sie Informationen speziell zu „${productName}", oder suchen Sie eine allgemeine Beratung über alle Produkte?`;
    embedMsgs.appendChild(contextMsg);

    // Zwei Kontext-Chips
    if (embedSugg) {
      embedSugg.innerHTML = '';
      [
        { label: `Nur zu „${productName}"`, msg: `Ich möchte Informationen speziell zu "${productName}".` },
        { label: 'Allgemeine Beratung', msg: 'Ich suche eine allgemeine Beratung über alle Produkte.' },
      ].forEach(({ label, msg }) => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.style.cssText = 'padding:5px 10px;font-size:10.5px;font-weight:500;background:var(--color-green-pale);color:var(--color-green);border-radius:100px;cursor:pointer;border:1px solid transparent;font-family:inherit;';
        chip.textContent = label;
        chip.addEventListener('click', () => {
          embedSugg.innerHTML = '';
          aiInput.value = msg;
          sendAiMessage();
        });
        embedSugg.appendChild(chip);
      });
    }
  } else {
    // Bei Wiedereröffnung: vorhandene Nachrichten + Suggestions übertragen
    if (embedMsgs && aiMessagesEl) {
      Array.from(aiMessagesEl.children).forEach(node => {
        embedMsgs.appendChild(node.cloneNode(true));
      });
      embedMsgs.scrollTop = embedMsgs.scrollHeight;
    }
    if (embedSugg && aiSuggestions && embedSugg.children.length === 0) {
      Array.from(aiSuggestions.children).forEach(node => {
        const clone = node.cloneNode(true);
        const text = clone.textContent.trim();
        clone.style.cssText = 'padding:5px 10px;font-size:10.5px;font-weight:500;background:var(--color-green-pale);color:var(--color-green);border-radius:100px;cursor:pointer;border:1px solid transparent;font-family:inherit;';
        clone.addEventListener('click', () => triggerAiMessage(text, 'embed_suggestion_chip'));
        embedSugg.appendChild(clone);
      });
    }
  }

  setTimeout(() => embed.querySelector('#aiInputEmbed').focus(), 100);
  if (window.VerdTracker) window.VerdTracker.trackBotOpen();
}

function closeVariantCChat() {
  const gallery = document.querySelector('.detail-gallery');
  if (gallery) gallery.classList.remove('variant-c-bot-open');
  const embed = document.getElementById('variantCEmbed');
  if (embed) embed.hidden = true;
  const openBtn = document.getElementById('variantCOpenBtn');
  if (openBtn) openBtn.hidden = false;
  if (window.VerdTracker) window.VerdTracker.trackBotClose();
}

function removeBotFromDetail() {
  if (window.VERDEA_VARIANT !== 'C') return;
  const embed = document.getElementById('variantCEmbed');
  if (embed) embed.remove();
  const openBtn = document.getElementById('variantCOpenBtn');
  if (openBtn) openBtn.remove();
  const gallery = document.querySelector('.detail-gallery');
  if (gallery) gallery.classList.remove('variant-c-bot-open');
}

// Initiale Variant-Konfiguration beim Szenariostart
function initVariantBot() {
  const variant = window.VERDEA_VARIANT;
  if (variant === 'A') {
    // Permanenter Bot — immer sichtbar, nicht schließbar
    aiBot.hidden = false;
    aiFab.hidden = true;
    document.body.classList.add('bot-open');
    // Close-Button ausblenden
    const closeBtn = document.getElementById('aiBotClose');
    if (closeBtn) closeBtn.style.display = 'none';
    // Auf Mobile: kompakte Höhe — beim Tippen wird Bot fullscreen + Scroll gesperrt
    if (window.innerWidth <= 768) {
      aiBot.classList.add('ai-bot--variantA-mobile');
      document.documentElement.style.setProperty('--mobile-bot-h', '170px');

      if (!aiInput._variantAListeners) {
        aiInput._variantAListeners = true;

        // Zwei stabile Zustände: kompakt (initial) → fullscreen (permanent, kein Zurück)
        let _botIsExpanded = false;

        // touchmove sperren — ALLES außer Nachrichten-Bereich
        // { passive: false } ist Pflicht damit preventDefault() auf iOS wirkt
        function _blockScroll(e) {
          const msgs = document.querySelector('.ai-bot__messages');
          if (msgs && msgs.contains(e.target) && msgs.scrollHeight > msgs.clientHeight) return;
          e.preventDefault();
        }

        // Keyboard-Höhe als padding-bottom setzen → Input bleibt sichtbar
        function _applyKeyboardPadding() {
          const vv = window.visualViewport;
          const kbH = vv ? Math.max(0, window.innerHeight - vv.height) : 0;
          aiBot.style.paddingBottom = kbH + 'px';
        }

        function _attachKeyboardListener() {
          if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', _applyKeyboardPadding);
            window.visualViewport.addEventListener('resize', _applyKeyboardPadding);
          }
          // iOS Tastatur-Animation ~250ms — mehrere Zeitpunkte für Zuverlässigkeit
          setTimeout(_applyKeyboardPadding, 100);
          setTimeout(_applyKeyboardPadding, 300);
          setTimeout(_applyKeyboardPadding, 500);
        }

        function _detachKeyboardListener() {
          if (window.visualViewport) {
            window.visualViewport.removeEventListener('resize', _applyKeyboardPadding);
          }
          // Keyboard geschlossen → padding zurücksetzen
          aiBot.style.paddingBottom = '0';
        }

        const mobileCollapseBtn = document.getElementById('aiBotMobileCollapse');

        function collapseBot() {
          if (!_botIsExpanded) return;
          _botIsExpanded = false;

          _detachKeyboardListener();
          document.removeEventListener('touchmove', _blockScroll);

          // Scroll-Sperre aufheben + Scroll-Position wiederherstellen
          const savedY = document.body._lockedScrollY || 0;
          document.documentElement.style.overflow = '';
          document.documentElement.style.height = '';
          document.body.style.position = '';
          document.body.style.top = '';
          document.body.style.left = '';
          document.body.style.right = '';
          document.body.style.overflow = '';
          document.body.style.height = '';
          window.scrollTo(0, savedY);

          // Bot-Styles zurücksetzen → kompakte CSS-Klasse wieder aktiv
          aiBot.style.position = '';
          aiBot.style.top = '';
          aiBot.style.left = '';
          aiBot.style.right = '';
          aiBot.style.bottom = '';
          aiBot.style.height = '';
          aiBot.style.maxHeight = '';
          aiBot.style.minHeight = '';
          aiBot.style.zIndex = '';
          aiBot.style.paddingBottom = '';
          aiBot.classList.add('ai-bot--variantA-mobile');

          // X-Button wieder verstecken
          if (mobileCollapseBtn) mobileCollapseBtn.style.display = 'none';

          // Keyboard schließen falls noch offen
          aiInput.blur();
        }

        function expandBot() {
          if (window.VERDEA_VARIANT !== 'A' || window.innerWidth > 768) return;

          if (_botIsExpanded) {
            // Bereits fullscreen — nur Keyboard-Padding neu anlegen
            _attachKeyboardListener();
            return;
          }
          _botIsExpanded = true;

          aiBot.classList.remove('ai-bot--variantA-mobile');

          // Bot füllt gesamten Bildschirm — alle CSS-Constraints überschreiben
          const h = window.innerHeight;
          aiBot.style.position = 'fixed';
          aiBot.style.top = '0';
          aiBot.style.left = '0';
          aiBot.style.right = '0';
          aiBot.style.bottom = 'auto';
          aiBot.style.height = h + 'px';
          aiBot.style.maxHeight = 'none';
          aiBot.style.minHeight = '0';
          aiBot.style.zIndex = '1500';
          aiBot.style.paddingBottom = '0';

          // Scroll-Sperre: body fixieren + touchmove blockieren
          const scrollY = window.scrollY;
          document.body._lockedScrollY = scrollY;
          document.documentElement.style.overflow = 'hidden';
          document.documentElement.style.height = '100%';
          document.body.style.position = 'fixed';
          document.body.style.top = `-${scrollY}px`;
          document.body.style.left = '0';
          document.body.style.right = '0';
          document.body.style.overflow = 'hidden';
          document.body.style.height = '100%';
          document.addEventListener('touchmove', _blockScroll, { passive: false });

          // X-Button einblenden
          if (mobileCollapseBtn) mobileCollapseBtn.style.display = 'flex';

          _attachKeyboardListener();
        }

        // X-Button: zurück in kompakte Ansicht
        if (mobileCollapseBtn) {
          mobileCollapseBtn.addEventListener('click', collapseBot);
        }

        // Global zugänglich machen — damit openDetail() den Bot kollabieren kann
        window._variantACollapseBot = collapseBot;

        aiInput.addEventListener('focus', () => {
          if (window.VERDEA_VARIANT !== 'A' || window.innerWidth > 768) return;
          expandBot();
        });

        // blur: NICHT kollabieren — nur Keyboard-Padding entfernen wenn Keyboard zu
        aiInput.addEventListener('blur', () => {
          if (window.VERDEA_VARIANT !== 'A' || window.innerWidth > 768) return;
          if (!_botIsExpanded) return;
          _detachKeyboardListener();
        });
      }
    }
    if (window.VerdTracker) window.VerdTracker.trackBotOpen();
    // Kein auto-focus auf Mobile — würde Keyboard und Bot-Expand sofort triggern
    if (window.innerWidth > 768) setTimeout(() => aiInput.focus(), 100);
  } else if (variant === 'B') {
    // FAB zeigen, kleineres Fenster
    aiFab.hidden = false;
    aiBot.hidden = true;
    applyVariantBotStyle();
  } else if (variant === 'C') {
    // Weder FAB noch Bot auf Hauptseite
    aiFab.hidden = true;
    aiBot.hidden = true;
  }
}

aiFab.addEventListener('click', () => openAiBot(false));
aiBotClose.addEventListener('click', closeAiBot);

// Initiale Suggestions — werden nach jeder KI-Antwort dynamisch ersetzt
const INITIAL_AI_SUGGESTIONS = [
  'Welches empfiehlst du mir?',
  'Was ist der Unterschied?',
  'Welches ist nachhaltiger?',
];

function resetAiBot(scenario) {
  aiMessagesEl.innerHTML = '';
  aiHistory = [];           // Konversation pro Szenario zurücksetzen
  aiPending = false;
  aiSellDone = false;
  aiInput.disabled = false;
  appendAiMessage('bot', `Hallo! Frag mich gerne, was zu dir passen könnte — ich kenne alle Produkte hier.`);
  renderSuggestions(INITIAL_AI_SUGGESTIONS);
}

// Aktualisiert die Suggestion-Chips (initial oder von der KI dynamisch geliefert)
function renderSuggestions(list) {
  aiSuggestions.innerHTML = '';
  if (!Array.isArray(list)) return;
  list.slice(0, 4).forEach(s => {
    if (!s || typeof s !== 'string') return;
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'ai-suggestion';
    chip.textContent = s;
    // Klick = direkter API-Trigger (nicht nur Input-Vorbelegung)
    chip.addEventListener('click', () => triggerAiMessage(s, 'suggestion_chip'));
    aiSuggestions.appendChild(chip);
  });
}

// Schickt einen vorgegebenen Text an die KI (für Suggestion-Chips).
// Setzt zuerst das Input-Feld zur Sichtbarkeit, dann ruft die normale Send-Pipeline.
function triggerAiMessage(text, source) {
  if (aiPending) return;
  aiInput.value = text;
  if (window.VerdTracker) window.VerdTracker.trackSuggestionUsed(getActualScenarioIdx());
  sendAiMessage();
}
function appendAiMessage(role, text) {
  const el = document.createElement('div');
  el.className = `ai-msg ai-msg--${role}`;
  el.textContent = text;
  aiMessagesEl.appendChild(el);
  aiMessagesEl.scrollTop = aiMessagesEl.scrollHeight;
  // Variante C: auch ins eingebettete Panel spiegeln
  const embedMsgs = document.getElementById('aiMessagesEmbed');
  if (embedMsgs) {
    const elClone = el.cloneNode(true);
    embedMsgs.appendChild(elClone);
    embedMsgs.scrollTop = embedMsgs.scrollHeight;
  }
}
function addProductLinkToLastBotMessage(productId, scenario, sellType) {
  if (!scenario) return;

  let product = null;
  let btnText = '';
  let optionIdx = 0;

  if (sellType === 'up' && productId) {
    product = scenario.products.find(p => p.id === productId);
    if (product) {
      const upsellIdx = (product.optionDetails || []).findIndex(o => o.isUpsell);
      optionIdx = upsellIdx >= 0 ? upsellIdx : 1;
      const upsellOptLabel = product.options && product.options[optionIdx];
      btnText = upsellOptLabel ? `Vorteilspack ansehen: ${upsellOptLabel} →` : `${product.name} (Vorteilspack) →`;
    }
  } else if (sellType === 'cross') {
    product = scenario.products.find(p => p.role === 'cross-sell');
    if (product) btnText = `Dazu passend: ${product.name} ansehen →`;
  } else if (productId) {
    product = scenario.products.find(p => p.id === productId);
    if (product) btnText = `${product.name} ansehen →`;
  }

  if (!product || !btnText) return;

  // Nie das günstigste Hauptprodukt verlinken
  const mainProducts = scenario.products.filter(p => p.role !== 'cross-sell');
  const cheapestPrice = Math.min(...mainProducts.map(p => p.price));
  if (product.price === cheapestPrice && product.role !== 'cross-sell') return;

  const makeBtn = (container) => {
    const lastMsg = container?.querySelector('.ai-msg--bot:last-child');
    if (!lastMsg) return;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'ai-product-link';
    btn.textContent = btnText;
    btn.addEventListener('click', () => openDetail(product, optionIdx));
    lastMsg.appendChild(btn);
  };
  makeBtn(aiMessagesEl);
  makeBtn(document.getElementById('aiMessagesEmbed'));
}

function addDualSellButtons(upProductName, scenario) {
  // Findet das Up-Sell Produkt per Name-Match
  const upProduct = scenario.products.find(p =>
    p.role !== 'cross-sell' && p.name && p.name.toLowerCase().includes(upProductName.toLowerCase().split(' ')[0])
  ) || scenario.products.find(p => p.role !== 'cross-sell');
  const crossProduct = scenario.products.find(p => p.role === 'cross-sell');

  const addBtns = (container) => {
    const lastMsg = container?.querySelector('.ai-msg--bot:last-child');
    if (!lastMsg) return;
    const wrap = document.createElement('div');
    wrap.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:6px;';

    if (upProduct) {
      const upsellIdx = (upProduct.optionDetails || []).findIndex(o => o.isUpsell);
      const optIdx = upsellIdx >= 0 ? upsellIdx : 1;
      const upsellLabel = upProduct.options && upProduct.options[optIdx];
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-product-link';
      btn.textContent = upsellLabel ? `Vorteilspack ansehen: ${upsellLabel} →` : `${upProduct.name} (Vorteilspack) →`;
      btn.addEventListener('click', () => openDetail(upProduct, optIdx));
      wrap.appendChild(btn);
    }

    if (crossProduct) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'ai-product-link ai-product-link--cross';
      btn.textContent = `Dazu passend: ${crossProduct.name} ansehen →`;
      btn.addEventListener('click', () => openDetail(crossProduct, 0));
      wrap.appendChild(btn);
    }

    if (wrap.children.length) lastMsg.appendChild(wrap);
  };

  addBtns(aiMessagesEl);
  addBtns(document.getElementById('aiMessagesEmbed'));
}

function showTyping() {
  const el = document.createElement('div');
  el.className = 'ai-msg--typing';
  el.id = 'aiTyping';
  el.innerHTML = '<span></span><span></span><span></span>';
  aiMessagesEl.appendChild(el);
  aiMessagesEl.scrollTop = aiMessagesEl.scrollHeight;
}
function removeTyping() { document.getElementById('aiTyping')?.remove(); }

aiForm.addEventListener('submit', e => { e.preventDefault(); sendAiMessage(); });

// Reduziert das Szenario-Objekt auf das, was die KI wirklich braucht.
// Vermeidet, dass FAQ, Bilder, Zertifikate etc. unnötig in jedes Request gehen.
function buildScenarioContext(scenario) {
  if (!scenario) return null;
  const mainProducts = scenario.products.filter(p => p.role !== 'cross-sell');
  const crossProduct = scenario.products.find(p => p.role === 'cross-sell');
  return {
    id: scenario.id,
    title: scenario.title,
    text: scenario.text,
    userMessageCount: aiHistory.filter(m => m.role === 'user').length,
    hasSoldAlready: aiSellDone,
    hasRecommended: aiHistory.some(m => m.role === 'assistant' && m.content.includes('RECOMMENDATION:')),
    products: mainProducts.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      tagline: p.tagline,
      desc: p.desc,
    })),
    crossSellProduct: crossProduct ? {
      id: crossProduct.id,
      name: crossProduct.name,
      price: crossProduct.price,
      tagline: crossProduct.tagline,
      desc: crossProduct.desc,
    } : null,
  };
}

// Identifiziert das empfohlene Produkt fürs Tracking.
// Bevorzugt: serverHint (= recommendedProduct vom RECOMMENDATION-Marker der KI).
// Fallback: Textsuche im Antworttext.
function identifyRecommendedProduct(replyText, scenario, serverHint) {
  if (!scenario) return '';
  if (serverHint) {
    const hintLower = serverHint.toLowerCase().trim();
    // Exakte Namensübereinstimmung
    const exact = scenario.products.find(p => p.name.toLowerCase() === hintLower);
    if (exact) return exact.id;
    // Fuzzy: serverHint enthält Produktnamen oder umgekehrt
    const fuzzy = scenario.products.find(p => {
      const n = p.name.toLowerCase();
      return hintLower.includes(n) || n.includes(hintLower);
    });
    if (fuzzy) return fuzzy.id;
  }
  if (replyText) {
    const lower = replyText.toLowerCase();
    for (const p of scenario.products) {
      if (lower.includes(p.name.toLowerCase())) return p.id;
    }
  }
  return '';
}

async function sendAiMessage() {
  if (aiPending) return;                       // Mehrfach-Submit verhindern
  const txt = aiInput.value.trim();
  if (!txt) return;

  aiPending = true;
  aiInput.disabled = true;
  aiInput.value = '';
  appendAiMessage('user', txt);

  const sc = getCurrentScenario();

  if (window.VerdTracker) window.VerdTracker.trackUserMessage(txt, getActualScenarioIdx());

  showTyping();

  // Historie: User-Message anhängen — Antwort kommt erst im finally
  aiHistory.push({ role: 'user', content: txt });

  let reply = '';
  let serverRecommendation = null;
  let serverSuggestions = null;
  let serverSellDual = null;
  let usedFallback = false;

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: txt,
        scenarioContext: buildScenarioContext(sc),
        // Historie OHNE die gerade gepushte User-Message (die kommt server-side
        // als separate user-Nachricht oben drauf)
        history: aiHistory.slice(0, -1),
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    reply = (data && typeof data.reply === 'string') ? data.reply.trim() : '';
    serverRecommendation = (data && typeof data.recommendedProduct === 'string')
      ? data.recommendedProduct
      : null;
    serverSuggestions = (data && Array.isArray(data.suggestions))
      ? data.suggestions
      : null;
    serverSellDual = (data && data.sellDual && typeof data.sellDual.upProduct === 'string')
      ? data.sellDual
      : null;
    if (serverSellDual) aiSellDone = true;
    if (!reply) throw new Error('Leere Antwort');
  } catch (err) {
    console.error('[AI] API-Fehler, nutze lokalen Fallback:', err);
    // Studie darf nicht blockieren wenn die API ausfällt — Stub-Antwort.
    const fb = generateAiReply(sc, txt);
    reply = fb.text;
    usedFallback = true;
  }

  // Antwort in Historie speichern, damit die KI im nächsten Turn Kontext hat
  aiHistory.push({ role: 'assistant', content: reply });

  removeTyping();
  appendAiMessage('bot', reply);

  // Dynamische Suggestions aktualisieren — wenn die KI welche zurückgegeben hat
  if (serverSuggestions && serverSuggestions.length > 0) {
    renderSuggestions(serverSuggestions);
    // Auch im Embed-Panel
    const embedSugg = document.getElementById('aiSuggestionsEmbed');
    if (embedSugg) {
      embedSugg.innerHTML = '';
      serverSuggestions.slice(0, 4).forEach(s => {
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.style.cssText = 'padding:5px 10px;font-size:10.5px;font-weight:500;background:var(--color-green-pale);color:var(--color-green);border-radius:100px;cursor:pointer;border:1px solid transparent;font-family:inherit;';
        chip.textContent = s;
        chip.addEventListener('click', () => triggerAiMessage(s, 'embed_suggestion_chip'));
        embedSugg.appendChild(chip);
      });
    }
  }

  const recommendedProductId = identifyRecommendedProduct(reply, sc, serverRecommendation);
  if (window.VerdTracker) window.VerdTracker.trackAiReply(reply, getActualScenarioIdx(), recommendedProductId, serverSellDual ? 'dual' : null);
  if (serverSellDual && sc) addDualSellButtons(serverSellDual.upProduct, sc);
  else if (recommendedProductId && sc) {
    // Text-Match nur verwenden wenn kein explicit RECOMMENDATION marker — aber trotzdem nie cheapest
    addProductLinkToLastBotMessage(recommendedProductId, sc, null);
  }

  aiPending = false;
  aiInput.disabled = false;
  // Fokus ins Embed-Input falls offen, sonst normales Input
  // Auf Mobile (Variant A) kein programmatischer focus — würde Keyboard ohne echten Tipp öffnen
  const embedInput = document.getElementById('aiInputEmbed');
  if (embedInput && document.getElementById('variantCEmbed')) {
    embedInput.focus();
  } else if (window.innerWidth > 768) {
    aiInput.focus();
  }
}

// AI Stub — wird später durch echten API-Call ersetzt (window.VERDEA_AI_API_KEY)
function generateAiReply(scenario, userMessage) {
  const msg = userMessage.toLowerCase();
  const ps = scenario.products;
  const recommended = ps[1]; // mittlere Option (Compromise-Effekt)
  if (/(unterschied|verschieden|vergleich)/.test(msg)) {
    return { text: `Die drei Optionen unterscheiden sich vor allem im Preis und im Umfang: „${ps[0].name}" ist die günstigste Variante (${fmt(ps[0].price)}), „${ps[1].name}" bietet ein gutes Verhältnis aus Qualität und Preis (${fmt(ps[1].price)}), und „${ps[2].name}" ist die Premium-Option (${fmt(ps[2].price)}).`, recommendedId: '' };
  }
  if (/(nachhaltig|umwelt|öko|bio|klimaneutral)/.test(msg)) {
    return { text: `Wenn Ihnen Nachhaltigkeit besonders wichtig ist, wäre „${ps[2].name}" am ehesten passend. Wenn Sie aber einen guten Kompromiss möchten, ist „${ps[1].name}" eine sinnvolle Wahl.`, recommendedId: ps[2].id };
  }
  if (/(billig|günstig|sparen|preis|niedrig)/.test(msg)) {
    return { text: `Die günstigste Option ist „${ps[0].name}" für ${fmt(ps[0].price)}. Für etwas mehr Qualität bei moderatem Aufpreis wäre „${ps[1].name}" mein Tipp.`, recommendedId: ps[0].id };
  }
  if (/(luxus|premium|hochwertig|beste|teuer)/.test(msg)) {
    return { text: `Die Premium-Variante „${ps[2].name}" bietet das umfassendste Erlebnis. Wenn das Budget keine Rolle spielt, ist sie die klare Wahl.`, recommendedId: ps[2].id };
  }
  return { text: `Auf Basis dessen, was die meisten Menschen in Ihrer Situation wählen, würde ich „${recommended.name}" empfehlen. Es bietet ein ausgewogenes Verhältnis zwischen Preis und Qualität — nicht die günstigste Option, aber auch nicht überdimensioniert.`, recommendedId: recommended.id };
}

// ============== FINAL SURVEY ==============

// Produkt-Metadaten für Vertrautheitsfragen — Index 0 = Szenario 1, usw.
const SURVEY_PRODUCT_INFO = [
  { sc: 1, id: 'sc1', name: 'Vitamin-D-Produkten und Nahrungsergänzungsmitteln' },
  { sc: 2, id: 'sc2', name: 'Tablettenboxen und Medikamenten-Organizern' },
  { sc: 3, id: 'sc3', name: 'Festival-Tickets und Event-Buchungen' },
];

// Reihenfolge der Produkte in der Umfrage — direkt beim Laden randomisiert,
// in startSurvey() nochmals neu gewürfelt (für jede Sitzung)
let _surveyProductOrder = (() => {
  const arr = [0, 1, 2];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
})();

// Baut die Fragenliste dynamisch — berücksichtigt randomisierte Produktreihenfolge
// und ob der Chatbot laut Tracking tatsächlich genutzt wurde.
function buildSurveyQuestions() {
  const botUsed = window.VerdTracker
    ? window.VerdTracker._scenarios.some(sc => sc.bot_msg_count_user > 0)
    : false;

  // Block 1: Produktvertrautheit (randomisierte Reihenfolge) — als Matrix-Fragen
  const orderedProducts = _surveyProductOrder.map(idx => SURVEY_PRODUCT_INFO[idx]);

  // Short labels for column headers
  const shortLabels = {
    sc1: 'Vitamin D & Nahrungserg.',
    sc2: 'Tablettenboxen',
    sc3: 'Festival-Tickets',
  };

  const productQs = [
    {
      id: 'product_knowledge_matrix',
      type: 'matrix',
      title: 'Wie würdest du dein Wissen über folgende Produktkategorien einschätzen?',
      sub: 'Dein Wissen VOR der Studie.',
      rows: ['Sehr gering', 'Gering', 'Mittel', 'Hoch', 'Sehr hoch'],
      cols: orderedProducts.map(p => ({ id: p.id, label: shortLabels[p.id] || p.name })),
    },
    {
      id: 'product_purchased_matrix',
      type: 'matrix',
      title: 'Hast du folgende Produkte bereits selbst gekauft?',
      rows: ['Nein', 'Ja, einmal', 'Ja, mehr als 5-mal', 'Ja, mehr als 10-mal'],
      cols: orderedProducts.map(p => ({ id: p.id, label: shortLabels[p.id] || p.name })),
    },
  ];

  // Block 3: Chatbot-Fragen — abhängig von tatsächlicher Nutzung (Tracking)
  const allChatbotDetailIds = [
    'chatbot_visibility', 'chatbot_recognizable', 'chatbot_helpful',
    'chatbot_disturbing', 'chatbot_supported_decision', 'chatbot_helped_find_best',
    'chatbot_not_used_reason',
  ];

  const chatbotQs = [
    // chatbot_seen nur wenn Bot nicht genutzt (wer ihn genutzt hat, hat ihn offensichtlich gesehen)
    ...(!botUsed ? [{
      id: 'chatbot_seen',
      type: 'radio',
      title: 'Hast du den KI-Chatbot auf der Website gesehen?',
      options: ['Ja', 'Nein'],
      skipGroupIfNo: allChatbotDetailIds,
    }] : []),
    {
      id: 'chatbot_visibility',
      type: 'scale5',
      title: 'Wie sichtbar fandest du die Platzierung des Chatbots?',
      sub: '1 = sehr schlecht sichtbar · 5 = sehr gut sichtbar',
    },
    ...(botUsed ? [
      // Chatbot wurde genutzt → Detailfragen zeigen
      { id: 'chatbot_recognizable', type: 'scale5',
        title: 'Der Chatbot war für mich klar als solcher erkennbar.',
        sub: '1 = trifft gar nicht zu · 5 = trifft voll zu' },
      { id: 'chatbot_helpful', type: 'scale5',
        title: 'Wie gut konnte der Chatbot deine Fragen beantworten?',
        sub: '1 = sehr schlecht · 5 = sehr gut' },
      { id: 'chatbot_disturbing', type: 'scale5',
        title: 'Der Chatbot hat mich während der Nutzung der Website gestört.',
        sub: '1 = stimme gar nicht zu · 5 = stimme voll zu' },
      { id: 'chatbot_supported_decision', type: 'scale5',
        title: 'Der Chatbot hat mich in der Entscheidungsfindung unterstützt.',
        sub: '1 = gar nicht · 5 = voll und ganz' },
      { id: 'chatbot_helped_find_best', type: 'scale5',
        title: 'Der Chatbot hat mir geholfen, das für mich beste Produkt zu finden.',
        sub: '1 = trifft gar nicht zu · 5 = trifft voll zu' },
    ] : [
      // Chatbot wurde NICHT genutzt → nur Freitextfrage warum
      { id: 'chatbot_not_used_reason', type: 'textarea',
        title: 'Warum hast du den Chatbot nicht genutzt?' },
    ]),
  ];

  return [
    // Block 1: Produktvertrautheit (randomisiert)
    ...productQs,

    // Block 2: Chatbot-Wahrnehmung
    ...chatbotQs,

    // Block 3: KI-Affinität
    { id: 'ai_usage_freq', type: 'radio',
      title: 'Wie oft nutzt du KI-Chatbots (Arbeit, Universität, Schule, Privat)?',
      options: ['Täglich', 'Wöchentlich', 'Monatlich', 'Jährlich', 'Nie'] },
    { id: 'ai_confidence', type: 'scale5',
      title: 'Wie sicher schätzt du dich selbst im Umgang mit KI-Chatbots ein?',
      sub: '1 = sehr unsicher · 5 = sehr sicher' },
    { id: 'ai_trust', type: 'scale5',
      title: 'Inwiefern findest du die Antworten von KI-Chatbots vertrauenswürdig?',
      sub: '1 = sehr unvertrauenswürdig · 5 = sehr vertrauenswürdig' },

    // Demographics als letzte Frage
    { id: 'demographics', type: 'demographics', title: 'Angaben zu Ihrer Person',
      sub: 'Diese Angaben helfen uns, die Ergebnisse statistisch auszuwerten. Sie bleiben vollständig anonym.' },
  ];
}
let surveyStep = 0;
const surveyAnswers = {};
// IDs der Fragen die wegen skipGroupIfNo übersprungen werden
let _surveySkippedIds = [];

// Berechnet die sichtbare (nicht übersprungene) Frageliste
function getActiveSurveyQuestions() {
  return buildSurveyQuestions().filter(q => !_surveySkippedIds.includes(q.id));
}

function startSurvey() {
  surveyStep = 0;
  _surveySkippedIds = [];
  // Produktreihenfolge randomisieren und tracken
  _surveyProductOrder = [0, 1, 2];
  for (let i = _surveyProductOrder.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [_surveyProductOrder[i], _surveyProductOrder[j]] = [_surveyProductOrder[j], _surveyProductOrder[i]];
  }
  const orderStr = _surveyProductOrder.map(i => `sc${i + 1}`).join(',');
  if (window.VerdTracker) {
    window.VerdTracker.trackSurveyAnswer('survey_product_order', orderStr);
    window.VerdTracker._surveyStartMs = Date.now();
    window.VerdTracker._displayStep = 4;
  }
  showGate(gateSurvey);
  renderSurvey();
}

function renderSurvey() {
  const activeQs = getActiveSurveyQuestions();
  const q = activeQs[surveyStep];
  if (!q) { completeSurvey(); return; }

  document.getElementById('surveyBar').style.width = `${Math.round((surveyStep / activeQs.length) * 100)}%`;
  document.getElementById('surveyStepLabel').textContent = `Frage ${surveyStep + 1} von ${activeQs.length}`;

  const c = document.getElementById('surveyContent');
  let html = `<h3 class="survey-question__title">${q.title}</h3>`;
  if (q.sub) html += `<p class="survey-question__sub">${q.sub}</p>`;

  if (q.type === 'scale' || q.type === 'scale5') {
    html += '<div class="survey-scale">';
    for (let i = 1; i <= 5; i++) html += `<label><input type="radio" name="surveyAns" value="${i}"><span>${i}</span></label>`;
    html += '</div>';
  } else if (q.type === 'radio') {
    html += '<div class="survey-pills">';
    q.options.forEach(opt => {
      html += `<label class="survey-pill"><input type="radio" name="surveyAns" value="${opt}"><span>${opt}</span></label>`;
    });
    html += '</div>';
  } else if (q.type === 'textarea') {
    html += `<textarea class="survey-textarea" name="surveyAns" placeholder="Optional …"></textarea>`;
  } else if (q.type === 'matrix') {
    html += '<div class="survey-matrix-wrap" style="overflow-x:auto;margin-top:12px;">';
    html += '<table class="survey-matrix" style="border-collapse:collapse;width:100%;font-size:13px;">';
    html += '<thead><tr><th style="text-align:left;padding:5px 4px;font-weight:600;border-bottom:2px solid #e2e8f0;"></th>';
    q.cols.forEach(col => {
      html += `<th style="text-align:center;padding:5px 4px;font-weight:600;border-bottom:2px solid #e2e8f0;word-break:break-word;hyphens:auto;">${col.label}</th>`;
    });
    html += '</tr></thead><tbody>';
    q.rows.forEach((row, ri) => {
      html += `<tr style="background:${ri % 2 === 0 ? '#fff' : '#f8fafc'};">`;
      html += `<td style="padding:8px 8px;border-bottom:1px solid #e2e8f0;font-weight:500;">${row}</td>`;
      q.cols.forEach(col => {
        const name = `matrix_${q.id}_${col.id}`;
        html += `<td style="text-align:center;padding:8px 4px;border-bottom:1px solid #e2e8f0;"><input type="radio" name="${name}" value="${row}"></td>`;
      });
      html += '</tr>';
    });
    html += '</tbody></table></div>';
  } else if (q.type === 'demographics') {
    html += `
    <div class="demo-inline-fields">
      <div class="form-field" style="margin-bottom:12px;">
        <label for="surveyDemoAge" style="display:block;font-weight:600;margin-bottom:4px;">Alter</label>
        <input type="number" id="surveyDemoAge" class="form-input survey-demo-field" min="10" max="99" step="1" inputmode="numeric" placeholder="z.B. 28" style="width:120px;" />
      </div>
      <div class="form-field" style="margin-bottom:12px;">
        <label style="display:block;font-weight:600;margin-bottom:6px;">Geschlecht</label>
        <div class="form-radio-group">
          <label class="form-radio"><input type="radio" name="surveyGender" value="weiblich" /><span>Weiblich</span></label>
          <label class="form-radio"><input type="radio" name="surveyGender" value="männlich" /><span>Männlich</span></label>
          <label class="form-radio"><input type="radio" name="surveyGender" value="divers" /><span>Divers</span></label>
          <label class="form-radio"><input type="radio" name="surveyGender" value="keine_angabe" /><span>Keine Angabe</span></label>
        </div>
      </div>
      <div class="form-field" style="margin-bottom:12px;">
        <label for="surveyDemoIncome" style="display:block;font-weight:600;margin-bottom:4px;">Monatliches Netto-Einkommen</label>
        <select id="surveyDemoIncome" class="form-select survey-demo-field" style="max-width:320px;">
          <option value="">Bitte auswählen</option>
          <option value="lt1000">Unter 1.000 €</option>
          <option value="1000-2000">1.000 bis unter 2.000 €</option>
          <option value="2000-3000">2.000 bis unter 3.000 €</option>
          <option value="3000-4000">3.000 bis unter 4.000 €</option>
          <option value="4000-5000">4.000 bis unter 5.000 €</option>
          <option value="gt5000">5.000 € oder mehr</option>
          <option value="keine_angabe">Keine Angabe</option>
        </select>
      </div>
      <div class="form-field" style="margin-bottom:4px;">
        <label for="surveyDemoOccupation" style="display:block;font-weight:600;margin-bottom:4px;">Berufsgruppe</label>
        <select id="surveyDemoOccupation" class="form-select survey-demo-field" style="max-width:320px;">
          <option value="">Bitte auswählen</option>
          <option value="schueler">Schüler</option>
          <option value="student_ohne">Student (ohne Nebenjob)</option>
          <option value="student_mit">Student (mit Nebenjob)</option>
          <option value="vollzeit">Vollzeitberufstätig</option>
          <option value="teilzeit">Teilzeitberufstätig</option>
          <option value="minijob">Minijob / Aushilfsbasis</option>
          <option value="arbeitslos">Arbeitslos</option>
          <option value="sonstiges">Sonstiges</option>
        </select>
      </div>
    </div>
  `;
  }

  c.innerHTML = html;

  // Gespeicherten Wert wiederherstellen
  const saved = surveyAnswers[q.id];
  if (q.type === 'scale' || q.type === 'scale5' || q.type === 'radio') {
    if (saved !== undefined) {
      const r = c.querySelector(`input[value="${CSS.escape ? CSS.escape(saved) : saved}"]`)
             || Array.from(c.querySelectorAll('input[name="surveyAns"]')).find(el => el.value === saved);
      if (r) r.checked = true;
    }
  } else if (q.type === 'textarea') {
    if (saved !== undefined) {
      const ta = c.querySelector('textarea');
      if (ta) ta.value = saved;
    }
  } else if (q.type === 'matrix') {
    q.cols.forEach(col => {
      const key = q.id === 'product_knowledge_matrix'
        ? `product_knowledge_${col.id}`
        : `product_purchased_${col.id}`;
      const savedV = surveyAnswers[key];
      if (savedV) {
        const name = `matrix_${q.id}_${col.id}`;
        const r = c.querySelector(`input[name="${name}"][value="${CSS.escape ? CSS.escape(savedV) : savedV}"]`)
               || Array.from(c.querySelectorAll(`input[name="${name}"]`)).find(el => el.value === savedV);
        if (r) r.checked = true;
      }
    });
  } else if (q.type === 'demographics') {
    const savedDemo = surveyAnswers['demographics_data'];
    if (savedDemo) {
      const ageEl = document.getElementById('surveyDemoAge');
      if (ageEl && savedDemo.age) ageEl.value = savedDemo.age;
      const genderR = document.querySelector(`input[name="surveyGender"][value="${savedDemo.gender}"]`);
      if (genderR) genderR.checked = true;
      const incomeEl = document.getElementById('surveyDemoIncome');
      if (incomeEl && savedDemo.income) incomeEl.value = savedDemo.income;
      const occEl = document.getElementById('surveyDemoOccupation');
      if (occEl && savedDemo.occupation) occEl.value = savedDemo.occupation;
    }
  }

  document.getElementById('surveyBack').style.visibility = surveyStep === 0 ? 'hidden' : 'visible';
  document.getElementById('surveyNext').textContent = surveyStep === activeQs.length - 1 ? 'Abschließen →' : 'Weiter →';
}

document.getElementById('surveyBack').addEventListener('click', () => {
  if (surveyStep > 0) { surveyStep--; renderSurvey(); }
});

document.getElementById('surveyNext').addEventListener('click', () => {
  const activeQs = getActiveSurveyQuestions();
  const q = activeQs[surveyStep];
  if (!q) return;

  let val = '';
  let matrixVals = null;

  if (q.type === 'scale' || q.type === 'scale5' || q.type === 'radio') {
    val = document.querySelector('input[name="surveyAns"]:checked')?.value || '';
  } else if (q.type === 'textarea') {
    val = document.querySelector('textarea[name="surveyAns"]')?.value.trim() || '';
  } else if (q.type === 'matrix') {
    // Validate all columns have a selection
    matrixVals = {};
    let allFilled = true;
    q.cols.forEach(col => {
      const name = `matrix_${q.id}_${col.id}`;
      const checked = document.querySelector(`input[name="${name}"]:checked`);
      if (checked) {
        matrixVals[col.id] = checked.value;
      } else {
        allFilled = false;
      }
    });
    val = allFilled ? 'filled' : '';
  } else if (q.type === 'demographics') {
    const age = document.getElementById('surveyDemoAge')?.value?.trim();
    const gender = document.querySelector('input[name="surveyGender"]:checked')?.value;
    const income = document.getElementById('surveyDemoIncome')?.value;
    const occupation = document.getElementById('surveyDemoOccupation')?.value;

    // Validate with red borders
    let demoValid = true;
    const ageEl = document.getElementById('surveyDemoAge');
    const incomeEl = document.getElementById('surveyDemoIncome');
    const occEl = document.getElementById('surveyDemoOccupation');

    [ageEl, incomeEl, occEl].forEach(el => el && el.classList.remove('field-error'));
    document.querySelectorAll('input[name="surveyGender"]').forEach(r => r.closest('.form-radio-group')?.classList.remove('field-error'));

    if (!age || isNaN(Number(age)) || Number(age) < 10 || Number(age) > 99) {
      if (ageEl) ageEl.classList.add('field-error');
      demoValid = false;
    }
    if (!gender) {
      const grp = document.querySelector('.form-radio-group');
      if (grp) grp.classList.add('field-error');
      demoValid = false;
    }
    if (!income) {
      if (incomeEl) incomeEl.classList.add('field-error');
      demoValid = false;
    }
    if (!occupation) {
      if (occEl) occEl.classList.add('field-error');
      demoValid = false;
    }

    if (!demoValid) {
      const surveyErrEl = document.getElementById('surveyError');
      if (surveyErrEl) surveyErrEl.textContent = 'Bitte fülle alle Felder aus.';
      return;
    }

    // Store demographics
    surveyAnswers['demographics_data'] = { age, gender, income, occupation };
    if (window.VerdTracker) window.VerdTracker.setDemographics({ age, gender, income, occupation });
    val = 'filled';
  }

  if (!val && !q.optional) {
    const surveyErrEl = document.getElementById('surveyError');
    if (surveyErrEl) { surveyErrEl.textContent = 'Bitte beantworte diese Frage, um fortzufahren.'; }
    return;
  }

  const surveyErrEl = document.getElementById('surveyError');
  if (surveyErrEl) surveyErrEl.textContent = '';

  // Don't double-save demographics (already saved above)
  if (q.type !== 'demographics') {
    if (q.type === 'matrix' && matrixVals) {
      const prefix = q.id === 'product_knowledge_matrix' ? 'product_knowledge_' : 'product_purchased_';
      q.cols.forEach(col => {
        const key = prefix + col.id;
        surveyAnswers[key] = matrixVals[col.id];
        if (window.VerdTracker) window.VerdTracker.trackSurveyAnswer(key, matrixVals[col.id]);
      });
    } else {
      surveyAnswers[q.id] = val;
      if (window.VerdTracker) window.VerdTracker.trackSurveyAnswer(q.id, val);
    }
  }

  // skipGroupIfNo — wenn "Nein" gewählt, Skip-Liste aktualisieren
  if (q.skipGroupIfNo && val === 'Nein') {
    _surveySkippedIds = [...new Set([..._surveySkippedIds, ...q.skipGroupIfNo])];
  } else if (q.skipGroupIfNo && val !== 'Nein') {
    // Wenn zurück und jetzt "Ja" — Skip aufheben
    _surveySkippedIds = _surveySkippedIds.filter(id => !q.skipGroupIfNo.includes(id));
  }

  const newActiveQs = getActiveSurveyQuestions();
  if (surveyStep + 1 < newActiveQs.length) {
    surveyStep++;
    renderSurvey();
  } else {
    completeSurvey();
  }
});

function completeSurvey() {
  // Umfragedauer tracken
  if (window.VerdTracker && window.VerdTracker._surveyStartMs) {
    const dur = Math.round((Date.now() - window.VerdTracker._surveyStartMs) / 1000);
    window.VerdTracker.trackSurveyAnswer('survey_duration_seconds', dur);
  }
  if (window.VerdTracker) {
    window.VerdTracker._displayStep = 5;
    window.VerdTracker.complete();
  }
  showGate(gateThanks);
}

// ===== INIT =====
renderProducts();
// Hide AI fab + banner until study really starts
aiFab.hidden = true;
taskBanner.hidden = true;

// VerdTracker initialisieren (nach DOM-Ready — Variante ist bereits gesetzt)
if (window.VerdTracker) {
  window.VerdTracker.init(window.VERDEA_VARIANT || 'A');
}
