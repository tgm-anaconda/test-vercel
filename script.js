// ===== STUDY SCENARIOS =====
// Innerhalb eines Szenarios sind die 3 Produkte INHALTLICH identisch.
// Sie unterscheiden sich nur in Beschreibung, Marketing und Preis.
// So lässt sich die Kaufwahl auf KI-Empfehlung statt auf Produktunterschiede zurückführen.
const SCENARIOS = [
  {
    id: 'supplements',
    label: 'Nahrungsergänzung',
    image: 'img/supplements.jpg',
    title: 'Vitamin D3 für Ihre Energie',
    text: 'Stellen Sie sich vor, Sie möchten Ihrem Körper im Winter mehr Vitamin D zuführen, um Ihre Energie und Ihr Immunsystem zu unterstützen. Wählen Sie eines der drei Vitamin-D3-Produkte aus, das Sie tatsächlich kaufen würden. Der KI-Berater unten rechts kann Ihnen helfen.',
    bannerText: 'Aufgabe: Wählen Sie ein Vitamin-D3-Produkt aus, das Sie kaufen würden.',
    products: [
      { id: 'sup-budget', name: 'Vitamin D3 Basic', brand: 'VERDEA', tagline: 'Solide Grundversorgung', category: 'vitamine', price: 9.90, oldPrice: null, badge: null, emoji: '☀️', rating: 4.4, reviews: 89, unit: '90 Kapseln · 3 Monate', certs: ['🔬 GMP', '🇩🇪 DE'],
        desc: 'Vitamin D3 (Cholecalciferol), 1.000 IU pro Kapsel. Hergestellt in Deutschland nach GMP-Standard. Für eine solide tägliche Grundversorgung.',
        ingredients: [{ name: 'Vitamin D3 (Cholecalciferol)', sub: '1.000 IU', amount: '25 µg', origin: '🇩🇪 Deutschland', pct: 100 }, { name: 'HPMC-Kapsel', sub: 'Pflanzlich', amount: '—', origin: '🌱', pct: 0 }],
        options: ['1 Packung (9,90 €)'],
        faq: [{ q: 'Wie hoch ist die Dosierung?', a: '1.000 IU pro Kapsel — empfohlen 1× täglich.' }, { q: 'Ist das Produkt vegan?', a: 'Die Kapsel ist pflanzlich. Das Vitamin D3 stammt aus Lanolin (Schafwolle), also nicht vegan.' }] },
      { id: 'sup-mid', name: 'Pure D3 Premium', brand: 'VERDEA', tagline: 'Bio-Qualität & vegan', category: 'vitamine', price: 22.90, oldPrice: null, badge: 'bestseller', emoji: '☀️', rating: 4.7, reviews: 287, unit: '90 Kapseln · 3 Monate', certs: ['🌱 Bio', '🐇 Vegan', '🔬 Laborgeprüft'],
        desc: 'Vitamin D3 (1.000 IU) aus pflanzlichen Flechten gewonnen. Vegan, laborgeprüft, in MCT-Öl-Träger für bessere Aufnahme. 90 Kapseln aus Deutschland.',
        ingredients: [{ name: 'Vitamin D3 (aus Flechten)', sub: '1.000 IU · vegan', amount: '25 µg', origin: '🇩🇪 Deutschland', pct: 95 }, { name: 'MCT-Öl', sub: 'Aus Bio-Kokosöl', amount: 'Träger', origin: '🇵🇭 Philippinen', pct: 0 }, { name: 'HPMC-Kapsel', sub: 'Pflanzlich', amount: '—', origin: '🌱', pct: 0 }],
        options: ['1 Packung (22,90 €)', '3 Packungen (59,90 €)'],
        faq: [{ q: 'Warum aus Flechten?', a: 'Flechten sind die einzige pflanzliche Quelle für natürliches Vitamin D3 — somit ist das Produkt vollständig vegan.' }, { q: 'Was bringt der MCT-Öl-Träger?', a: 'Vitamin D ist fettlöslich — MCT-Öl verbessert die Aufnahme im Körper.' }] },
      { id: 'sup-premium', name: 'Sunlight Bio D3 Luxury', brand: 'VERDEA', tagline: 'Klimaneutrale Premium-Qualität', category: 'vitamine', price: 39.90, oldPrice: null, badge: 'new', emoji: '☀️', rating: 4.9, reviews: 142, unit: '90 Kapseln · 3 Monate', certs: ['🌱 Bio-DE-003', '🐇 Vegan', '🌍 CO₂ neutral'],
        desc: 'Premium-Vitamin-D3 (1.000 IU) aus zertifiziertem Bio-Anbau. Klimaneutrale Produktion, plastikfreie Glasflasche, Chargen-Zertifikate online einsehbar. Höchste Bioverfügbarkeit durch Liposom-Technologie.',
        ingredients: [{ name: 'Vitamin D3 (Bio-Flechten-Extrakt)', sub: '1.000 IU · liposomal', amount: '25 µg', origin: '🇮🇸 Island', pct: 95 }, { name: 'Bio-MCT-Öl', sub: 'Bio-Kokos, fair trade', amount: 'Träger', origin: '🇵🇭 Philippinen', pct: 0 }, { name: 'HPMC-Kapsel (Bio)', sub: 'Pflanzlich, kompostierbar', amount: '—', origin: '🌱', pct: 0 }],
        options: ['1 Glasflasche (39,90 €)', '3 Glasflaschen (109,90 €)'],
        faq: [{ q: 'Was ist liposomal?', a: 'Liposomale Verkapselung verbessert die Bioverfügbarkeit um bis zu 300% — der Wirkstoff erreicht effektiver die Zellen.' }, { q: 'Was bedeutet klimaneutral?', a: 'Der gesamte CO₂-Fußabdruck (Anbau, Produktion, Versand) wird durch zertifizierte Klimaschutzprojekte vollständig kompensiert.' }] },
    ]
  },
  {
    id: 'travel',
    label: 'Erlebnisurlaub',
    image: 'img/travel.jpg',
    title: 'Wochenendtrip in die Alpen',
    text: 'Stellen Sie sich vor, Sie planen ein verlängertes Wochenende (3 Tage / 2 Nächte) zum Wandern in den österreichischen Alpen. Drei Anbieter haben gleichwertige Pakete: Unterkunft, Verpflegung und ein geführter Tagesausflug. Welches Angebot würden Sie buchen?',
    bannerText: 'Aufgabe: Buchen Sie ein 3-tägiges Wander-Wochenende in den Alpen.',
    products: [
      { id: 'trip-budget', name: 'Bergwochenende Standard', brand: 'AlpenReisen', tagline: 'Pension · Halbpension', category: 'vitamine', price: 199, oldPrice: null, badge: null, emoji: '🏔️', rating: 4.3, reviews: 67, unit: 'pro Person · DZ', certs: ['🏠 Pension', '🍽 HP'],
        desc: '3 Tage / 2 Nächte in einer familiengeführten Pension in Tirol. Halbpension (Frühstück & Abendessen), eine geführte Wanderung. Bettwäsche und Endreinigung inklusive.',
        ingredients: [{ name: 'Übernachtung', sub: 'Familienpension Tirol', amount: '2 Nächte', origin: '🇦🇹 Österreich', pct: 60 }, { name: 'Verpflegung', sub: 'Halbpension', amount: '2× FS, 2× AB', origin: 'lokal', pct: 50 }, { name: 'Wanderung', sub: '1× geführt', amount: '4 h', origin: '🥾', pct: 30 }],
        options: ['1 Person (199 €)', '2 Personen (379 €)'],
        faq: [{ q: 'Wie kommt man hin?', a: 'Anreise per Bahn oder Auto. Vom nächsten Bahnhof ist es ein 15-min Taxiweg.' }, { q: 'Sind Wanderausrüstung enthalten?', a: 'Nein, bitte feste Wanderschuhe und wetterfeste Kleidung mitbringen.' }] },
      { id: 'trip-mid', name: 'Alpenretreat Premium', brand: 'AlpenReisen', tagline: 'Boutique-Hotel · Vollpension', category: 'vitamine', price: 389, oldPrice: null, badge: 'bestseller', emoji: '🏔️', rating: 4.8, reviews: 198, unit: 'pro Person · DZ', certs: ['🏨 4★', '🍽 VP', '🧖 Spa'],
        desc: '3 Tage / 2 Nächte in einem Boutique-Berghotel mit Sauna. Vollpension mit regionalen Bio-Produkten, eine geführte Wanderung mit zertifiziertem Bergführer. Wellness-Bereich inklusive.',
        ingredients: [{ name: 'Übernachtung', sub: '4★-Boutique-Hotel', amount: '2 Nächte', origin: '🇦🇹 Österreich', pct: 80 }, { name: 'Verpflegung', sub: 'Vollpension Bio', amount: '3 Mahlzeiten/Tag', origin: 'regional', pct: 75 }, { name: 'Wanderung', sub: 'Mit zertif. Bergführer', amount: '6 h', origin: '🥾', pct: 60 }, { name: 'Wellness', sub: 'Sauna & Pool', amount: 'unbegrenzt', origin: '🧖', pct: 40 }],
        options: ['1 Person (389 €)', '2 Personen (729 €)'],
        faq: [{ q: 'Welche Wandertour ist enthalten?', a: 'Eine 6-stündige geführte Tour mit erfahrenem Bergführer. Die Tour wird je nach Können der Gruppe angepasst.' }, { q: 'Was ist Bio-Vollpension?', a: 'Frühstück, Mittag- und Abendessen aus regionalen Bio-Produkten von Tiroler Bauernhöfen.' }] },
      { id: 'trip-premium', name: 'Mountain Sanctuary Luxury', brand: 'AlpenReisen', tagline: '5★-Lodge · Privat-Guide', category: 'vitamine', price: 749, oldPrice: null, badge: 'new', emoji: '🏔️', rating: 4.9, reviews: 84, unit: 'pro Person · DZ', certs: ['⭐ 5★', '🍽 Gourmet', '🚐 Transfer'],
        desc: '3 Tage / 2 Nächte in einer prämierten Mountain Lodge. Vollpension mit Gourmet-Küche, eine private Tagestour mit individuellem Guide. Spa, Welcome-Drink und Bahnhof-Transfer inklusive.',
        ingredients: [{ name: 'Übernachtung', sub: '5★-Mountain Lodge', amount: '2 Nächte', origin: '🇦🇹 Österreich', pct: 100 }, { name: 'Verpflegung', sub: 'Gourmet-Vollpension', amount: '3 Mahlzeiten/Tag', origin: 'Sterne-Küche', pct: 95 }, { name: 'Privat-Guide', sub: 'Individueller Bergführer', amount: '8 h', origin: '🥾', pct: 90 }, { name: 'Bahnhof-Transfer', sub: 'Privat-Limousine', amount: 'Hin & Rück', origin: '🚐', pct: 70 }],
        options: ['1 Person (749 €)', '2 Personen (1.399 €)'],
        faq: [{ q: 'Was ist im Privat-Guide enthalten?', a: 'Ein individueller, deutsch- und englischsprachiger Bergführer, der Ihre Tour ganz auf Ihre Wünsche zuschneidet.' }, { q: 'Was beinhaltet die Gourmet-Küche?', a: 'Sterne-prämierter Küchenchef. Tasting-Menü mit 7 Gängen am Abend, regionales Frühstück, leichtes Mittag­essen.' }] },
    ]
  },
  {
    id: 'donation',
    label: 'Spendenprojekt',
    image: 'img/donation.jpg',
    title: 'Spende für Trinkwasser-Projekte',
    text: 'Stellen Sie sich vor, Sie möchten an ein Hilfsprojekt spenden, das Menschen in Subsahara-Afrika Zugang zu sauberem Trinkwasser verschafft. Drei Organisationen bieten ähnliche Programme an. Bitte wählen Sie eine Spende aus.',
    bannerText: 'Aufgabe: Wählen Sie eine Trinkwasser-Spende, die Sie tätigen würden.',
    products: [
      { id: 'don-low', name: 'AquaHilfe e.V.', brand: 'Spendenprojekt', tagline: 'Kleine Brunnen · regional', category: 'vitamine', price: 25, oldPrice: null, badge: null, emoji: '💧', rating: 4.5, reviews: 156, unit: 'einmalige Spende', certs: ['📜 DZI', '✅ gemeinnützig'],
        desc: 'Mit Ihrer Spende von 25 € unterstützen Sie den Bau und die Wartung kleiner Handpumpen-Brunnen in einer ländlichen Gemeinde. Direkter Verwendungs­nachweis per E-Mail.',
        ingredients: [{ name: 'Brunnenbau', sub: 'Handpumpe, regional', amount: 'anteilig', origin: '🌍 Mali', pct: 70 }, { name: 'Wartung', sub: '1 Jahr', amount: 'inklusive', origin: 'lokal', pct: 30 }, { name: 'Verwaltungskosten', sub: 'transparent', amount: '8%', origin: '', pct: 8 }],
        options: ['25 € einmalig', '25 € monatlich'],
        faq: [{ q: 'Ist die Spende steuerlich absetzbar?', a: 'Ja, Sie erhalten automatisch eine Spendenquittung per E-Mail.' }, { q: 'Wie hoch sind die Verwaltungskosten?', a: '8% — der Rest fließt direkt in das Projekt.' }] },
      { id: 'don-mid', name: 'Trinkwasser Initiative', brand: 'Spendenprojekt', tagline: 'Tiefbrunnen + Schulung', category: 'vitamine', price: 75, oldPrice: null, badge: 'bestseller', emoji: '💧', rating: 4.7, reviews: 412, unit: 'einmalige Spende', certs: ['📜 DZI', '⭐ Phineo', '✅ gemeinnützig'],
        desc: 'Ihre Spende von 75 € finanziert anteilig einen Solarpumpen-Tiefbrunnen plus die Schulung lokaler Wartungsteams. Jahresbericht und Foto-Update inklusive.',
        ingredients: [{ name: 'Tiefbrunnen', sub: 'Solarpumpe, 50 m', amount: 'anteilig', origin: '🌍 Kenia', pct: 80 }, { name: 'Schulung', sub: 'Lokale Wartungs­teams', amount: 'inklusive', origin: 'lokal', pct: 70 }, { name: 'Reporting', sub: 'Jahres­bericht & Fotos', amount: '1×/Jahr', origin: '📸', pct: 50 }, { name: 'Verwaltungskosten', sub: 'transparent', amount: '11%', origin: '', pct: 11 }],
        options: ['75 € einmalig', '25 € monatlich'],
        faq: [{ q: 'Was ist ein Solarpumpen-Tiefbrunnen?', a: 'Ein 30-50 m tiefer Brunnen mit solar­betriebener Pumpe — funktioniert auch bei niedrigem Grundwasser­spiegel.' }, { q: 'Bekomme ich Updates?', a: 'Ja, Sie erhalten einen Jahres­bericht mit Fotos und Fortschritts­bericht des Projekts.' }] },
      { id: 'don-high', name: 'Comprehensive Water Program', brand: 'Spendenprojekt', tagline: 'Komplettes Versorgungsnetz', category: 'vitamine', price: 200, oldPrice: null, badge: 'new', emoji: '💧', rating: 4.9, reviews: 87, unit: 'einmalige Spende', certs: ['📜 DZI', '⭐ Phineo', '🔍 transparent.de'],
        desc: 'Mit 200 € werden Sie Pate eines kompletten Wasserprojekts für ein Dorf: Brunnen, Leitungen, Wartung, Hygieneschulung. Sie erhalten eine Patenschaftsurkunde und persönliche Updates.',
        ingredients: [{ name: 'Komplettes Wassernetz', sub: 'Brunnen + Leitungen', amount: '1 Dorf', origin: '🌍 Tansania', pct: 95 }, { name: 'Hygieneschulung', sub: 'Workshops für Familien', amount: '6 Monate', origin: 'lokal', pct: 85 }, { name: 'Patenschaft', sub: 'Persönliche Updates', amount: '4×/Jahr', origin: '📨', pct: 70 }, { name: 'Wartung', sub: '5 Jahre Garantie', amount: 'inklusive', origin: '🔧', pct: 60 }, { name: 'Verwaltungskosten', sub: 'transparent', amount: '14%', origin: '', pct: 14 }],
        options: ['200 € einmalig', '50 € monatlich'],
        faq: [{ q: 'Was bedeutet Patenschaft?', a: 'Sie werden persönlich benannte/r Pate für ein bestimmtes Dorfprojekt — mit Patenurkunde, Fotos der Familien und vierteljährlichen Updates.' }, { q: 'Warum 14% Verwaltungskosten?', a: 'Die höhere Quote deckt das umfassende Reporting, persönliche Patenschaft und langfristige Wartung. Höchste Transparenz­standards.' }] },
    ]
  }
];

let currentScenarioIndex = 0;
let scenarioStartTime = 0;
let aiMessageCount = 0;
let aiHistory = []; // [{ role: 'user'|'assistant', content: string }, …] — Konversations-Historie für die API
let aiPending = false; // True während ein Request läuft, verhindert Mehrfach-Submit
const allChoices = [];
const allDemographics = {};

function getCurrentScenario() { return SCENARIOS[currentScenarioIndex]; }

// ===== PRODUCT DATA — wird dynamisch aus aktuellem Szenario geladen =====
let products = SCENARIOS[0].products;
const _placeholderProducts = [
  {
    id: 'placeholder-unused',
    name: 'placeholder',
    brand: 'VERDEA',
    tagline: 'Adaptogen für Stressresistenz & mentale Balance',
    category: 'adaptogen',
    price: 34.90,
    oldPrice: null,
    badge: 'bestseller',
    emoji: '🌿',
    rating: 4.9,
    reviews: 512,
    unit: '90 Kapseln · 3 Monate',
    certs: ['🌱 Bio', '🐇 Vegan', '🔬 GMP'],
    desc: 'Unser Ashwagandha verwendet das patentierte KSM-66® Vollspektrum-Extrakt — die weltweit am besten erforschte Ashwagandha-Form. Mit 600 mg pro Tagesdosis entspricht es dem Standard klinischer Studien, die signifikante Stressreduktion belegen.',
    ingredients: [
      { name: 'Ashwagandha Wurzelextrakt', sub: 'KSM-66® · Withania somnifera', amount: '600 mg', origin: '🇮🇳 Indien', pct: 88 },
      { name: 'Schwarzer Pfeffer Extrakt', sub: 'BioPerine® · Piper nigrum', amount: '5 mg', origin: '🇮🇳 Kerala', pct: 10 },
      { name: 'HPMC-Kapsel', sub: 'Hydroxypropylmethylcellulose', amount: '—', origin: '🌱 Pflanzlich', pct: 0 }
    ],
    options: ['1 Packung (34,90 €)', '2 Packungen (62,90 €)', '3 Packungen (89,90 €)'],
    faq: [
      { q: 'Wann sehe ich erste Effekte?', a: 'Die meisten Anwender berichten nach 2–4 Wochen regelmäßiger Einnahme von ersten Verbesserungen. Für optimale Ergebnisse empfehlen wir eine Einnahmedauer von mindestens 8 Wochen.' },
      { q: 'Wann ist die beste Einnahmezeit?', a: 'Ashwagandha kann morgens oder abends eingenommen werden. Bei Einnahme zur Stressreduktion tagsüber, bei Schlafverbesserung abends mit einer Mahlzeit.' },
      { q: 'Kann ich es mit anderen Supplementen kombinieren?', a: 'Ja. Ashwagandha lässt sich gut mit Magnesium (abends) oder Vitamin D kombinieren. Bei verschreibungspflichtigen Medikamenten bitten wir, vorher einen Arzt zu konsultieren.' }
    ]
  },
  {
    id: 2,
    name: 'Vitamin D3 + K2',
    brand: 'VERDEA',
    tagline: 'Optimale Knochengesundheit & Immunsystem',
    category: 'vitamine',
    price: 24.90,
    oldPrice: 29.90,
    badge: 'sale',
    emoji: '☀️',
    rating: 4.8,
    reviews: 388,
    unit: '120 Tropfen · 4 Monate',
    certs: ['🌱 Bio', '🐇 Vegan', '🔬 Laborgeprüft'],
    desc: 'Die Kombination aus D3 (5000 IU) und K2 (MK-7, 200 µg) gilt als Goldstandard: Vitamin K2 sorgt dafür, dass das durch D3 aufgenommene Kalzium in die Knochen gelangt — statt in die Arterien. In MCT-Öl für maximale Bioverfügbarkeit.',
    ingredients: [
      { name: 'Vitamin D3 (Cholecalciferol)', sub: 'Aus Flechten, vegan', amount: '5000 IU · 125 µg', origin: '🇩🇪 Deutschland', pct: 95 },
      { name: 'Vitamin K2 (MK-7)', sub: 'Menaquinon-7, all-trans', amount: '200 µg', origin: '🇯🇵 Japan', pct: 80 },
      { name: 'MCT-Öl', sub: 'Aus Bio-Kokosöl', amount: 'Träger', origin: '🇵🇭 Philippinen', pct: 0 }
    ],
    options: ['1 Flasche (24,90 €)', '3 Flaschen (64,90 €)'],
    faq: [
      { q: 'Warum D3 + K2 kombinieren?', a: 'Vitamin D3 fördert die Kalziumaufnahme, doch ohne K2 kann dieses Kalzium in Blutgefäßen eingelagert werden. K2 aktiviert Proteine, die Kalzium gezielt in Knochen und Zähne lenken.' },
      { q: 'Wie hoch ist mein Vitamin-D-Bedarf?', a: 'Das hängt von Ihrem Ausgangswert ab. Wir empfehlen, den 25(OH)D-Spiegel im Blut testen zu lassen. Zielwert: 50–80 ng/ml.' }
    ]
  },
  {
    id: 3,
    name: 'Magnesium Glycinat',
    brand: 'VERDEA',
    tagline: 'Schlaf, Muskelregeneration & Nervensystem',
    category: 'vitamine',
    price: 28.90,
    oldPrice: null,
    badge: 'new',
    emoji: '🌙',
    rating: 4.7,
    reviews: 241,
    unit: '120 Kapseln · 2 Monate',
    certs: ['🐇 Vegan', '🔬 GMP', '🚫 Füllstofffrei'],
    desc: 'Magnesiumglycinat ist die sanfteste und am besten bioverfügbare Magnesiumform. Anders als Magnesiumoxid (Billigvariante) verursacht es keine Magenprobleme und wird direkt vom Nervensystem aufgenommen. Ideal zur abendlichen Einnahme.',
    ingredients: [
      { name: 'Magnesium Bisglicinat', sub: 'Chelat-gebunden', amount: '400 mg Mg²⁺', origin: '🇩🇪 Deutschland', pct: 90 },
      { name: 'HPMC-Kapsel', sub: 'Pflanzliche Kapsel', amount: '—', origin: '🌱 Pflanzlich', pct: 0 }
    ],
    options: ['1 Packung (28,90 €)', '3 Packungen (74,90 €)'],
    faq: [
      { q: 'Wann sollte ich Magnesium einnehmen?', a: 'Abends, etwa 30–60 Minuten vor dem Schlafen. Die entspannende Wirkung auf Muskeln und Nervensystem unterstützt den Einschlafprozess.' },
      { q: 'Was ist der Unterschied zu Magnesiumoxid?', a: 'Magnesiumoxid hat eine Bioverfügbarkeit von ca. 4% und verursacht häufig Durchfall. Magnesiumglycinat hat ca. 80% Bioverfügbarkeit und ist magenfreundlich.' }
    ]
  },
  {
    id: 4,
    name: 'Omega-3 Arctic Pure',
    brand: 'VERDEA',
    tagline: 'EPA & DHA aus nachhaltigem Wildfang',
    category: 'vitamine',
    price: 39.90,
    oldPrice: null,
    badge: null,
    emoji: '🐟',
    rating: 4.6,
    reviews: 167,
    unit: '90 Kapseln · 1,5 Monate',
    certs: ['🌊 MSC-zertifiziert', '🔬 TOTOX-geprüft', '🔬 GMP'],
    desc: 'Höchste Reinheit aus arktischen Gewässern: 1000 mg Fischöl mit 660 mg EPA und 440 mg DHA pro Kapsel. TOTOX-Wert unter 5 (Industriestandard: 26). Kein Fischgeruch, da in triglyzeridgebundener Form.',
    ingredients: [
      { name: 'Fischöl (Wildfang)', sub: 'Sardellen, Anchosen · MSC-zertifiziert', amount: '1000 mg', origin: '🇳🇴 Norwegen', pct: 95 },
      { name: 'davon EPA', sub: 'Eicosapentaensäure', amount: '660 mg', origin: '', pct: 70 },
      { name: 'davon DHA', sub: 'Docosahexaensäure', amount: '440 mg', origin: '', pct: 50 },
      { name: 'Vitamin E (Tocopherol)', sub: 'Natürliches Antioxidans', amount: '1 mg', origin: '🇩🇪 Deutschland', pct: 5 }
    ],
    options: ['1 Packung (39,90 €)', '3 Packungen (99,90 €)'],
    faq: [
      { q: 'Was bedeutet TOTOX-Wert?', a: 'TOTOX misst die Oxidation (Ranzigkeit) des Öls. Werte über 26 gelten als inakzeptabel, viele günstige Produkte überschreiten 40+. Unser Wert liegt unter 5 — frischer als frischer Fisch.' },
      { q: 'Ist das Produkt nachhaltig?', a: 'Ja. Alle Rohstoffe kommen aus MSC-zertifiziertem Wildfang. Wir verarbeiten ausschließlich kleine, schnell nachwachsende Fischarten (keine Thunfisch, kein Lachs).' }
    ]
  },
  {
    id: 5,
    name: 'Probiotika Pro 50 Mrd.',
    brand: 'VERDEA',
    tagline: '12 Stämme · Magensäureresistente Kapsel',
    category: 'darm',
    price: 44.90,
    oldPrice: 54.90,
    badge: 'sale',
    emoji: '🦠',
    rating: 4.8,
    reviews: 298,
    unit: '60 Kapseln · 2 Monate',
    certs: ['🐇 Vegan', '🔬 Klinisch getestet', '🌡 Kühlkettenversand'],
    desc: '50 Milliarden koloniebildende Einheiten (KBE) aus 12 klinisch erforschten Lactobacillus- und Bifidobacterium-Stämmen. Magensäureresistente MAKTREK®-Kapsel garantiert, dass 99% der Bakterien lebend den Darm erreichen.',
    ingredients: [
      { name: 'Lactobacillus acidophilus', sub: 'NCFM-Stamm', amount: '10 Mrd. KBE', origin: '🇩🇰 Dänemark', pct: 85 },
      { name: 'Bifidobacterium longum', sub: 'BB536-Stamm', amount: '8 Mrd. KBE', origin: '🇯🇵 Japan', pct: 75 },
      { name: '10 weitere Stämme', sub: 'Lactobacillus & Bifidobacterium', amount: '32 Mrd. KBE', origin: '🇩🇪 Deutschland', pct: 60 },
      { name: 'Inulin (Präbiotikum)', sub: 'Chicorée-Wurzel', amount: '100 mg', origin: '🇧🇪 Belgien', pct: 15 }
    ],
    options: ['1 Packung (44,90 €)', '3 Packungen (119,90 €)'],
    faq: [
      { q: 'Warum ist die Lagerung wichtig?', a: 'Probiotika sind lebende Bakterien, die durch Hitze absterben. Unsere Kapseln überleben ohne Kühlung, wir empfehlen aber Lagerung im Kühlschrank für maximale Potenz über die gesamte Haltbarkeit.' },
      { q: 'Wann sehe ich Effekte auf den Darm?', a: 'Die meisten Anwender berichten nach 7–14 Tagen erste Veränderungen. Für nachhaltige Darmflora-Verbesserung empfehlen wir 3 Monate kontinuierliche Einnahme.' }
    ]
  },
  {
    id: 6,
    name: 'Marine Kollagen Peptide',
    brand: 'VERDEA',
    tagline: 'Typ I & III für Haut, Gelenke & Haare',
    category: 'beauty',
    price: 49.90,
    oldPrice: null,
    badge: 'new',
    emoji: '✨',
    rating: 4.7,
    reviews: 183,
    unit: '300 g Pulver · 30 Portionen',
    certs: ['🌊 MSC-zertifiziert', '🔬 Hydrolysat', '🚫 Zuckerfrei'],
    desc: 'Hydrolysiertes Kollagen aus MSC-zertifizierten Fischen der Nordatlantik. Molekulargewicht unter 3 kDa für maximale Resorption. Klinisch belegt: 2,5 g täglich verbessern Hauthautfeuchtigkeit und -elastizität signifikant.',
    ingredients: [
      { name: 'Hydrolysiertes Fischkollagen', sub: 'Typ I & III, <3 kDa', amount: '10 g', origin: '🇮🇸 Island', pct: 98 },
      { name: 'Vitamin C (L-Ascorbinsäure)', sub: 'Fördert endogene Kollagensynthese', amount: '80 mg', origin: '🇩🇪 Deutschland', pct: 20 }
    ],
    options: ['1 Beutel (49,90 €)', '3 Beutel (134,90 €)'],
    faq: [
      { q: 'Wie nehme ich das Pulver ein?', a: 'Einen Messlöffel (10 g) in Wasser, Kaffee, Smoothie oder Joghurt einrühren. Das Pulver ist geruchs- und geschmacksneutral und löst sich vollständig auf.' },
      { q: 'Ab wann sehe ich Veränderungen der Haut?', a: 'In klinischen Studien wurden nach 4 Wochen signifikante Verbesserungen der Hautelastizität gemessen. Für Gelenke und Haare empfehlen wir 8–12 Wochen.' }
    ]
  },
  {
    id: 7,
    name: 'Bio Superfood Blend',
    brand: 'VERDEA',
    tagline: '23 Superfoods · Spirulina, Moringa, Weizengras',
    category: 'darm',
    price: 54.90,
    oldPrice: null,
    badge: 'bestseller',
    emoji: '🥬',
    rating: 4.5,
    reviews: 421,
    unit: '240 g Pulver · 30 Portionen',
    certs: ['🌱 Bio-zertifiziert', '🐇 Vegan', '🌿 Rohkost'],
    desc: 'Unsere Grüne Matrix vereint 23 bio-zertifizierte Superfoods — von Spirulina und Chlorella bis Moringa und Matcha. Kalt-verarbeitet unter 40°C, um Enzyme und Vitamine zu erhalten. Entspricht 7 Portionen Gemüse pro Tagesdosis.',
    ingredients: [
      { name: 'Bio-Spirulina', sub: 'Arthrospira platensis', amount: '3000 mg', origin: '🇩🇪 Deutschland', pct: 90 },
      { name: 'Bio-Moringa', sub: 'Moringa oleifera Blattextrakt', amount: '2000 mg', origin: '🇮🇳 Indien', pct: 80 },
      { name: 'Bio-Weizengras', sub: 'Triticum aestivum, Rohkost', amount: '1500 mg', origin: '🇦🇹 Österreich', pct: 70 },
      { name: '20 weitere Superfoods', sub: 'Chlorella, Matcha, Acai, Maca u.a.', amount: 'Mix', origin: 'Weltweit', pct: 50 }
    ],
    options: ['1 Beutel (54,90 €)', '3 Beutel (144,90 €)'],
    faq: [
      { q: 'Wie schmeckt das Pulver?', a: 'Earthy-grün mit leichtem Matcha-Unterton. In Smoothies mit Banane und Mandelmilch kaum wahrnehmbar. Pur in Wasser für hartgesottene Gesundheitsfans.' },
      { q: 'Kann ich es mit anderen VERDEA-Produkten kombinieren?', a: 'Ja, besonders gut kombinierbar mit unseren Probiotika oder Kollagen. Nehmen Sie das Superfood-Pulver morgens und Probiotika abends.' }
    ]
  },
  {
    id: 8,
    name: 'Curcumin + Piperin',
    brand: 'VERDEA',
    tagline: 'Anti-Entzündung · 95% Curcuminoide',
    category: 'darm',
    price: 32.90,
    oldPrice: null,
    badge: null,
    emoji: '🌶',
    rating: 4.6,
    reviews: 156,
    unit: '90 Kapseln · 3 Monate',
    certs: ['🌱 Bio', '🐇 Vegan', '🔬 Hochdosiert'],
    desc: 'Handelsübliches Kurkuma-Pulver enthält 2–5% Curcuminoide. Unseres enthält 95% — das Maximum. Kombiniert mit BioPerine® Piperin wird die Bioverfügbarkeit um das 20-fache gesteigert, da Curcumin allein kaum resorbiert wird.',
    ingredients: [
      { name: 'Kurkuma-Extrakt', sub: '95% Curcuminoide · Curcuma longa', amount: '500 mg', origin: '🇮🇳 Tamil Nadu', pct: 90 },
      { name: 'BioPerine® Piperin', sub: 'Schwarzer Pfeffer Extrakt', amount: '5 mg', origin: '🇮🇳 Kerala', pct: 10 }
    ],
    options: ['1 Packung (32,90 €)', '3 Packungen (84,90 €)'],
    faq: [
      { q: 'Warum ist normales Kurkuma nicht ausreichend?', a: 'Gelbes Curry-Kurkuma enthält 2–5% Curcuminoide und hat eine Bioverfügbarkeit von unter 1%. Unser Extrakt mit 95% Curcuminoiden und BioPerine® erreicht eine 2000% höhere Bioverfügbarkeit.' },
      { q: 'Kann ich es mit Erkrankungen einnehmen?', a: 'Curcumin kann die Wirkung von Blutverdünnern verstärken. Bei Gallenproblemen oder Blutverdünnungstherapie bitten wir, vorher einen Arzt zu konsultieren.' }
    ]
  }
];

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
const navLinks      = document.querySelectorAll('.nav__link[data-category]');
const categoryCards = document.querySelectorAll('.category-card[data-category]');

// ===== RENDER PRODUCTS =====
function renderProducts(filter = 'all') {
  const list = filter === 'all' ? products : products.filter(p => p.category === filter);
  const sceneImg = (typeof getCurrentScenario === 'function' && getCurrentScenario()) ? getCurrentScenario().image : null;
  productsGrid.innerHTML = '';
  list.forEach((p, i) => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.style.animationDelay = `${i * 55}ms`;
    const imgSrc = p.image || sceneImg;
    card.innerHTML = `
      <div class="product-card__img-wrap">
        ${imgSrc ? `<img class="product-card__img" src="${imgSrc}" alt="${p.name}" loading="lazy" onerror="this.remove()" />` : ''}
        <div class="product-card__emoji">${p.emoji}</div>
        ${p.badge ? `<span class="product-card__badge badge--${p.badge}">${badgeLabel(p.badge)}</span>` : ''}
        <div class="product-card__certs">
          ${p.certs.slice(0,2).map(c => `<span class="product-card__cert-tag">${c}</span>`).join('')}
        </div>
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

// ===== FILTER =====
filterTabs.addEventListener('click', e => {
  const tab = e.target.closest('.filter-tab');
  if (!tab) return;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
  tab.classList.add('active');
  currentFilter = tab.dataset.category;
  renderProducts(currentFilter);
  if (window.VerdTracker) window.VerdTracker.track('filter_change', { category: currentFilter });
});

navLinks.forEach(link => {
  link.addEventListener('click', e => {
    e.preventDefault();
    setFilter(link.dataset.category);
    scrollToProducts();
  });
});

categoryCards.forEach(card => {
  card.addEventListener('click', () => {
    setFilter(card.dataset.category);
    scrollToProducts();
    if (window.VerdTracker) window.VerdTracker.track('category_click', { category: card.dataset.category });
  });
});

function setFilter(cat) {
  currentFilter = cat;
  document.querySelectorAll('.filter-tab').forEach(t => t.classList.toggle('active', t.dataset.category === cat));
  renderProducts(cat);
}

function scrollToProducts() {
  document.getElementById('productsSection').scrollIntoView({ behavior: 'smooth' });
}

heroCta.addEventListener('click', () => scrollToProducts());

// ===== PRODUCT DETAIL =====
function openDetail(p) {
  if (window.VerdTracker) window.VerdTracker.trackProductView(p.id, p.name);

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
        ${p.certs.map(c => `<span class="detail-cert">${c}</span>`).join('')}
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
          ${p.options.map((o, i) => `<button class="detail-option-btn ${i===0?'selected':''}">${o}</button>`).join('')}
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
        <button class="detail-tab-btn active" data-tab="ingredients">Inhaltsstoffe</button>
        <button class="detail-tab-btn" data-tab="usage">Einnahme</button>
        <button class="detail-tab-btn" data-tab="faq">FAQ</button>
      </div>

      <div class="detail-tab-content active" data-tab="ingredients">
        <div class="detail-ingredients">
          <div class="detail-ingredients__title">Vollständige Zutatenliste</div>
          ${p.ingredients.map(ing => `
            <div class="ingredient-row">
              <div>
                <div class="ingredient-row__name">${ing.name}</div>
                <div class="ingredient-row__sub">${ing.sub}</div>
              </div>
              <span class="ingredient-row__origin">${ing.origin}</span>
              <span class="ingredient-row__amount">${ing.amount}</span>
            </div>
          `).join('')}
        </div>
        <p style="font-size:12px;color:var(--color-muted);margin-top:8px">Alle Rohstoffzertifikate auf Anfrage erhältlich. Chargenprüfbericht auf unserer Website einsehbar.</p>
      </div>

      <div class="detail-tab-content" data-tab="usage">
        <div class="detail-feature">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <div><strong>Empfohlene Tagesdosis:</strong> ${p.name.includes('Kollagen') || p.name.includes('Superfood') ? '1 Messlöffel (10 g) in Wasser oder Smoothie' : '1–2 Kapseln täglich mit einer Mahlzeit'}</div>
        </div>
        <div class="detail-feature">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <div><strong>Lagerung:</strong> Kühl und trocken, außer Reichweite von Kindern. ${p.category === 'darm' ? 'Für Probiotika: Kühlung empfohlen.' : ''}</div>
        </div>
        <div class="detail-feature">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
          <div><strong>Hinweis:</strong> Nahrungsergänzungsmittel sind kein Ersatz für eine ausgewogene Ernährung. Bei schwangeren oder stillenden Frauen Rücksprache mit Arzt halten.</div>
        </div>
        <div class="detail-feature">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/></svg>
          Kostenloser Versand ab 60 € · Lieferzeit 1–2 Werktage
        </div>
        <div class="detail-feature">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 .49-3.09"/></svg>
          30 Tage Geld-zurück-Garantie, kein Risiko
        </div>
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

  // Option buttons
  productDetailContent.querySelectorAll('.detail-option-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      productDetailContent.querySelectorAll('.detail-option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
    });
  });

  // Tab switching
  productDetailContent.querySelectorAll('.detail-tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      productDetailContent.querySelectorAll('.detail-tab-btn').forEach(b => b.classList.remove('active'));
      productDetailContent.querySelectorAll('.detail-tab-content').forEach(c => c.classList.remove('active'));
      btn.classList.add('active');
      productDetailContent.querySelector(`.detail-tab-content[data-tab="${btn.dataset.tab}"]`).classList.add('active');
    });
  });

  // FAQ accordion
  productDetailContent.querySelectorAll('.faq-item').forEach(item => {
    item.querySelector('.faq-question').addEventListener('click', () => {
      item.classList.toggle('open');
    });
  });

  // Add to cart
  document.getElementById('detailAddCart').addEventListener('click', () => {
    addToCart(p);
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
}

function closeDetail() {
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
  if (window.VerdTracker) window.VerdTracker.trackAboutView();
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
function addToCart(product) {
  const ex = cart.find(i => i.id === product.id);
  if (ex) ex.qty++; else cart.push({ ...product, qty: 1 });
  renderCart();
  openCart();
  showToast(`„${product.name}" wurde hinzugefügt`);
  if (window.VerdTracker) window.VerdTracker.trackCartAdd(product.id, product.name, product.price);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
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
        <div>
          <span class="cart-item__price">${fmt(item.price * item.qty)}</span>
          <span class="cart-item__remove" data-id="${item.id}">Entfernen</span>
        </div>
      </div>
    </div>
  `).join('');
  cartItemsEl.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => removeFromCart(Number(btn.dataset.id)));
  });
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);
  cartTotalEl.textContent = fmt(total);
  cartFooter.style.display = 'block';
}

function openCart() {
  cartDrawer.classList.add('open');
  cartOverlay.classList.add('active');
  document.body.style.overflow = 'hidden';
  if (window.VerdTracker) window.VerdTracker.track('cart_opened', {});
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
    if (window.VerdTracker) window.VerdTracker.trackNewsletter();
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
welcomeStart.addEventListener('click', () => {
  if (window.VerdTracker) {
    window.VerdTracker.enable();
    window.VerdTracker.track('consent_given');
  }
  showGate(gateDemographics);
});

// ----- DEMOGRAPHICS -----
document.getElementById('demoForm').addEventListener('submit', e => {
  e.preventDefault();
  const age = document.getElementById('demoAge').value;
  const gender = document.querySelector('input[name="gender"]:checked')?.value;
  const income = document.getElementById('demoIncome').value;
  const education = document.getElementById('demoEducation').value;
  const aiUsage = document.getElementById('demoAiUsage').value;
  const errEl = document.getElementById('demoError');
  if (!age || !gender || !income || !education || !aiUsage) {
    errEl.textContent = 'Bitte füllen Sie alle Felder aus.'; return;
  }
  if (Number(age) < 14 || Number(age) > 99) {
    errEl.textContent = 'Bitte geben Sie ein realistisches Alter ein.'; return;
  }
  errEl.textContent = '';
  Object.assign(allDemographics, { age, gender, income, education, ai_usage: aiUsage });
  if (window.VerdTracker) {
    window.VerdTracker.setDemographics(allDemographics);
    window.VerdTracker.track('demographics_submitted', allDemographics);
  }
  startScenario(0);
});

// ----- SCENARIO START -----
function startScenario(idx) {
  currentScenarioIndex = idx;
  scenarioStartTime = Date.now();
  aiMessageCount = 0;
  const sc = getCurrentScenario();
  if (window.VerdTracker) window.VerdTracker.setScenario(sc.id);

  // Reset cart for clean scenario
  cart = [];
  renderCart();

  // Update product list
  products = sc.products;
  setFilter('all');
  renderProducts('all');

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

  if (window.VerdTracker) window.VerdTracker.track('scenario_started', {
    scenario_id: sc.id, scenario_index: idx + 1, scenario_label: sc.label
  });
}

document.getElementById('taskIntroStart').addEventListener('click', () => {
  hideAllGates();
  taskBanner.hidden = false;
  document.body.classList.add('has-task-banner');
  aiFab.hidden = false;
  // close any open panels
  if (productDetail.classList.contains('open')) closeDetail();
  if (aboutPage.classList.contains('open')) closeAbout();
  closeCart();
  // scroll to products section
  setTimeout(() => scrollToProducts(), 200);
  // Auto-open AI bot — present and prominent
  setTimeout(() => openAiBot(true), 700);
});

// Re-show task intro when participant clicks "ℹ️"
taskBannerHelp.addEventListener('click', () => {
  showGate(gateTaskIntro);
  if (window.VerdTracker) window.VerdTracker.track('task_instruction_reopened');
});

// ----- CHECKOUT INTERCEPTION (= scenario completion) -----
checkoutBtn.addEventListener('click', () => {
  if (!cart.length) return;
  const sc = getCurrentScenario();
  // The chosen product = first item in cart (or most expensive — let's record everything)
  const chosen = cart[0];
  const choice = {
    scenario_id: sc.id,
    scenario_index: currentScenarioIndex + 1,
    scenario_label: sc.label,
    product_id: chosen.id,
    product_name: chosen.name,
    price: chosen.price,
    quantity: chosen.qty,
    cart_total: cart.reduce((s, i) => s + i.price * i.qty, 0),
    cart_items: cart.map(i => `${i.id}×${i.qty}`).join(','),
    seconds_in_scenario: Math.round((Date.now() - scenarioStartTime) / 1000),
    ai_messages_in_scenario: aiMessageCount,
  };
  allChoices.push(choice);
  if (window.VerdTracker) window.VerdTracker.track('product_selected', choice);

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
  startSurvey();
}

// ============== AI CHATBOT ==============
const aiMessagesEl = document.getElementById('aiMessages');
const aiSuggestions = document.getElementById('aiSuggestions');
const aiForm = document.getElementById('aiForm');
const aiInput = document.getElementById('aiInput');

function openAiBot(autoOpen = false) {
  aiBot.hidden = false;
  aiFab.hidden = true;
  document.body.classList.add('bot-open');
  setTimeout(() => aiInput.focus(), 100);
  if (window.VerdTracker) window.VerdTracker.track('ai_bot_opened', {
    scenario_id: getCurrentScenario()?.id || '',
    auto_opened: autoOpen ? 'ja' : 'nein'
  });
}
function closeAiBot() {
  aiBot.hidden = true;
  aiFab.hidden = false;
  document.body.classList.remove('bot-open');
  if (window.VerdTracker) window.VerdTracker.track('ai_bot_closed', {
    scenario_id: getCurrentScenario()?.id || '',
    messages_so_far: aiMessageCount
  });
}
aiFab.addEventListener('click', () => openAiBot(false));
aiBotClose.addEventListener('click', closeAiBot);

const AI_SUGGESTIONS = [
  'Welches empfiehlst du mir?',
  'Was ist der Unterschied?',
  'Welches ist nachhaltiger?',
  'Welches lohnt sich am meisten?'
];

function resetAiBot(scenario) {
  aiMessagesEl.innerHTML = '';
  aiHistory = []; // Konversation pro Szenario zurücksetzen
  aiPending = false;
  aiInput.disabled = false;
  appendAiMessage('bot', `Hallo! Ich helfe Ihnen bei der Auswahl in der Aufgabe „${scenario.title}". Stellen Sie mir gerne eine Frage — z. B. welches Produkt zu Ihnen passen würde.`);
  aiSuggestions.innerHTML = '';
  AI_SUGGESTIONS.forEach(s => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'ai-suggestion';
    chip.textContent = s;
    chip.addEventListener('click', () => { aiInput.value = s; sendAiMessage(); });
    aiSuggestions.appendChild(chip);
  });
}
function appendAiMessage(role, text) {
  const el = document.createElement('div');
  el.className = `ai-msg ai-msg--${role}`;
  el.textContent = text;
  aiMessagesEl.appendChild(el);
  aiMessagesEl.scrollTop = aiMessagesEl.scrollHeight;
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
  return {
    id: scenario.id,
    title: scenario.title,
    text: scenario.text,
    products: scenario.products.map(p => ({
      id: p.id,
      name: p.name,
      price: p.price,
      tagline: p.tagline,
      desc: p.desc,
    })),
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
  aiMessageCount++;

  const sc = getCurrentScenario();

  if (window.VerdTracker) window.VerdTracker.track('ai_message_sent', {
    scenario_id: sc?.id || '',
    message: txt,
    message_index: aiMessageCount,
  });

  showTyping();

  // Historie: User-Message anhängen — Antwort kommt erst im finally
  aiHistory.push({ role: 'user', content: txt });

  let reply = '';
  let serverRecommendation = null;
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

  if (window.VerdTracker) window.VerdTracker.track('ai_reply_shown', {
    scenario_id: sc?.id || '',
    reply,
    recommended_product_id: identifyRecommendedProduct(reply, sc, serverRecommendation),
    server_recommendation_raw: serverRecommendation || '',
    used_fallback: usedFallback ? 'ja' : 'nein',
    message_index: aiMessageCount,
  });

  aiPending = false;
  aiInput.disabled = false;
  aiInput.focus();
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
const SURVEY_QUESTIONS = [
  { id: 'ai_helpful', type: 'scale', title: 'Wie hilfreich war der KI-Berater bei Ihrer Entscheidung?', sub: '1 = gar nicht hilfreich · 5 = sehr hilfreich' },
  { id: 'ai_trust', type: 'scale', title: 'Wie sehr haben Sie der KI-Empfehlung vertraut?', sub: '1 = gar nicht · 5 = sehr stark' },
  { id: 'ai_influence', type: 'scale', title: 'Wie stark hat die KI Ihre Auswahl beeinflusst?', sub: '1 = gar nicht · 5 = sehr stark' },
  { id: 'decision_confidence', type: 'scale', title: 'Wie sicher fühlen Sie sich bei Ihren Entscheidungen?', sub: '1 = unsicher · 5 = sehr sicher' },
  { id: 'realism', type: 'scale', title: 'Wie realistisch wirkten die Kaufsituationen?', sub: '1 = unrealistisch · 5 = sehr realistisch' },
  { id: 'feedback', type: 'textarea', title: 'Möchten Sie uns noch etwas mitteilen?', sub: 'Optional. Anregungen, Kritik oder Beobachtungen.', optional: true },
];
let surveyStep = 0;
const surveyAnswers = {};

function startSurvey() {
  surveyStep = 0;
  showGate(gateSurvey);
  if (window.VerdTracker) window.VerdTracker.track('survey_started', { all_choices: JSON.stringify(allChoices) });
  renderSurvey();
}
function renderSurvey() {
  const q = SURVEY_QUESTIONS[surveyStep];
  document.getElementById('surveyBar').style.width = `${Math.round((surveyStep / SURVEY_QUESTIONS.length) * 100)}%`;
  document.getElementById('surveyStepLabel').textContent = `Frage ${surveyStep + 1} von ${SURVEY_QUESTIONS.length}`;
  const c = document.getElementById('surveyContent');
  let html = `<h3 class="survey-question__title">${q.title}</h3>`;
  if (q.sub) html += `<p class="survey-question__sub">${q.sub}</p>`;
  if (q.type === 'scale') {
    html += '<div class="survey-scale">';
    for (let i = 1; i <= 5; i++) html += `<label><input type="radio" name="surveyAns" value="${i}"><span>${i}</span></label>`;
    html += '</div>';
  } else if (q.type === 'textarea') {
    html += `<textarea class="survey-textarea" name="surveyAns" placeholder="Optional …"></textarea>`;
  }
  c.innerHTML = html;
  const saved = surveyAnswers[q.id];
  if (saved !== undefined) {
    if (q.type === 'scale') { const r = c.querySelector(`input[value="${saved}"]`); if (r) r.checked = true; }
    else { c.querySelector('textarea').value = saved; }
  }
  document.getElementById('surveyBack').style.visibility = surveyStep === 0 ? 'hidden' : 'visible';
  document.getElementById('surveyNext').textContent = surveyStep === SURVEY_QUESTIONS.length - 1 ? 'Absenden' : 'Weiter →';
}
document.getElementById('surveyBack').addEventListener('click', () => {
  if (surveyStep > 0) { surveyStep--; renderSurvey(); }
});
document.getElementById('surveyNext').addEventListener('click', () => {
  const q = SURVEY_QUESTIONS[surveyStep];
  let val = '';
  if (q.type === 'scale') val = document.querySelector('input[name="surveyAns"]:checked')?.value || '';
  else val = document.querySelector('textarea[name="surveyAns"]')?.value.trim() || '';
  if (!val && !q.optional) { showToast('Bitte beantworten Sie diese Frage.'); return; }
  surveyAnswers[q.id] = val;
  if (window.VerdTracker) window.VerdTracker.track('survey_answered', { question_id: q.id, answer: val, step: surveyStep + 1 });
  if (surveyStep + 1 < SURVEY_QUESTIONS.length) { surveyStep++; renderSurvey(); }
  else { completeSurvey(); }
});
function completeSurvey() {
  if (window.VerdTracker) window.VerdTracker.track('survey_completed', {
    answers: JSON.stringify(surveyAnswers),
    all_choices: JSON.stringify(allChoices),
    demographics: JSON.stringify(allDemographics),
  });
  showGate(gateThanks);
}

// ===== INIT =====
renderProducts();
// Hide AI fab + banner until study really starts
aiFab.hidden = true;
taskBanner.hidden = true;
