// Countries highlighted on the globe, keyed by ISO 3166-1 numeric code (as used by world-atlas).
// `lang` is a BCP-47 tag so screen readers pronounce each greeting correctly.
export const COUNTRIES = [
  { id: '364', name: 'Iran', language: 'Persian', lang: 'fa', rtl: true, text: 'تولدت مبارک', say: 'Tavalodet mobarak' },
  { id: '840', name: 'United States', language: 'English', lang: 'en', text: 'Happy birthday', say: '' },
  { id: '392', name: 'Japan', language: 'Japanese', lang: 'ja', text: 'お誕生日おめでとう', say: 'O-tanjōbi omedetō' },
  { id: '076', name: 'Brazil', language: 'Portuguese', lang: 'pt', text: 'Feliz aniversário', say: '' },
  { id: '276', name: 'Germany', language: 'German', lang: 'de', text: 'Alles Gute zum Geburtstag', say: '' },
  { id: '250', name: 'France', language: 'French', lang: 'fr', text: 'Joyeux anniversaire', say: '' },
  { id: '410', name: 'South Korea', language: 'Korean', lang: 'ko', text: '생일 축하해요', say: 'Saengil chukhaeyo' },
  { id: '792', name: 'Turkey', language: 'Turkish', lang: 'tr', text: 'Doğum günün kutlu olsun', say: '' },
  { id: '643', name: 'Russia', language: 'Russian', lang: 'ru', text: 'С днём рождения', say: 'S dnyom rozhdeniya' },
  { id: '380', name: 'Italy', language: 'Italian', lang: 'it', text: 'Buon compleanno', say: '' },
  { id: '724', name: 'Spain', language: 'Spanish', lang: 'es', text: 'Feliz cumpleaños', say: '' },
  { id: '356', name: 'India', language: 'Hindi', lang: 'hi', text: 'जन्मदिन मुबारक हो', say: 'Janmadin mubarak ho' },
  { id: '818', name: 'Egypt', language: 'Arabic', lang: 'ar', rtl: true, text: 'عيد ميلاد سعيد', say: 'Eid milad saeed' },
  { id: '156', name: 'China', language: 'Mandarin', lang: 'zh', text: '生日快乐', say: 'Shēngrì kuàilè' },
  { id: '404', name: 'Kenya', language: 'Swahili', lang: 'sw', text: 'Heri ya siku ya kuzaliwa', say: '' },
  { id: '528', name: 'Netherlands', language: 'Dutch', lang: 'nl', text: 'Gefeliciteerd', say: '' },
];

// Which countries get linked by animated arcs (pairs of ids).
export const LINKS = [
  ['840', '250'], ['250', '818'], ['818', '356'], ['356', '392'], ['392', '840'],
  ['276', '643'], ['643', '156'], ['792', '364'], ['364', '404'], ['076', '724'],
  ['724', '380'], ['380', '528'], ['410', '392'], ['840', '076'], ['528', '792'], ['156', '410'],
];
