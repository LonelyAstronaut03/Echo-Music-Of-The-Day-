/**
 * Fetch albums from Wikidata — month by month (12 queries)
 */
const fs = require('fs');
const https = require('https');

function query(month, year) {
  const pad = String(month).padStart(2, '0');
  return new Promise((resolve) => {
    const q = `SELECT ?item ?itemLabel ?artistLabel ?date WHERE {
  ?item (wdt:P31/(wdt:P279*)) wd:Q482994.
  ?item wdt:P577 ?date.
  FILTER(CONTAINS(STR(?date), "-${pad}-"))
  OPTIONAL { ?item wdt:P175 ?artist. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 200`;
    const url = `https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`;
    https.get(url, { headers: { 'User-Agent': 'EchoMusic/1.0' }, timeout: 60000 }, res => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const r = JSON.parse(body);
          const items = (r.results?.bindings || []).map(b => ({
            name: b.itemLabel?.value || '',
            artist: b.artistLabel?.value || 'Unknown',
            date: (b.date?.value || '').slice(0, 10)
          }));
          resolve(items);
        } catch(e) { console.error(`Month ${month} parse error:`, e.message); resolve([]); }
      });
    }).on('error', e => { console.error(`Month ${month} network:`, e.message); resolve([]); });
  });
}

const NOTABLE = new Set([
  'the beatles', 'pink floyd', 'radiohead', 'david bowie', 'bob dylan', 'prince',
  'nirvana', 'led zeppelin', 'queen', 'u2', 'coldplay', 'michael jackson',
  'madonna', 'kanye west', 'kendrick lamar', 'beyonce', 'jay-z', 'eminem',
  'frank ocean', 'bjork', 'taylor swift', 'adele', 'rihanna', 'drake',
  'bruce springsteen', 'the rolling stones', 'the who', 'the clash',
  'joy division', 'the cure', 'talking heads', 'the smiths', 'r.e.m.',
  'pixies', 'green day', 'oasis', 'blur', 'arctic monkeys', 'the strokes',
  'beck', 'wilco', 'sufjan stevens', 'frank zappa', 'miles davis',
  'john coltrane', 'aretha franklin', 'stevie wonder', 'marvin gaye',
  'bob marley', 'johnny cash', 'joni mitchell', 'carole king',
  'elton john', 'fleetwood mac', 'the beach boys', 'the doors',
  'jimi hendrix', 'massive attack', 'portishead', 'daft punk',
  'arcade fire', 'the national', 'bon iver', 'tame impala',
  'lana del rey', 'billie eilish', 'the weeknd', 'amy winehouse',
  'norah jones', 'alicia keys', 'outkast', 'nas', 'wu-tang clan',
  'beastie boys', 'run-dmc', 'public enemy', 'depeche mode',
  'new order', 'the velvet underground', 'lou reed', 'iggy pop',
  'black sabbath', 'deep purple', 'ac/dc', 'metallica', 'iron maiden',
  'guns n\' roses', 'pearl jam', 'soundgarden', 'alice in chains',
  'foo fighters', 'red hot chili peppers', 'rage against the machine',
  'nine inch nails', 'tool', 'system of a down', 'slipknot',
  'the white stripes', 'the black keys', 'vampire weekend',
  'lcd soundsystem', 'grimes', 'fka twigs', 'flying lotus',
  'gorillaz', 'blur', 'pulp', 'the verve', 'stone roses',
  'nick cave', 'pj harvey', 'bjork', 'kate bush', 'sinead o\'connor',
  'lauryn hill', 'erykah badu', 'sade', 'anita baker',
  'tony bennett', 'frank sinatra', 'nat king cole', 'ray charles',
  'chuck berry', 'little richard', 'buddy holly', 'everly brothers',
  'simon & garfunkel', 'cat stevens', 'james taylor', 'jackson browne',
  'eagles', 'steely dan', 'supertramp', 'genesis', 'yes', 'king crimson',
  'jay chou', 'faye wong', 'cui jian', 'teresa teng', 'jacky cheung',
  'leslie cheung', 'anita mui', 'beyond', 'mayday', 'eason chan',
  'wang faye', 'na ying', 'jolin tsai', 'gem', 'tao zhe', 'leehom wang',
]);

function isNotable(item) {
  const a = item.artist.toLowerCase();
  for (const n of NOTABLE) { if (a.includes(n) || n.includes(a)) return true; }
  return false;
}

function buildItem(item, mmdd) {
  const year = item.date.slice(0, 4);
  const id = (item.artist + '-' + item.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  return {
    id, name: item.name, nameZh: '', artist: item.artist, artistZh: '',
    releaseDate: mmdd, year: parseInt(year), coverImage: '',
    genres: ['Pop'], language: 'english', languageZh: '英语',
    type: 'album',
    descriptionZh: `${item.artist} 于 ${year} 年发行。`,
    descriptionEn: `Released by ${item.artist} in ${year}.`,
    storiesZh: '', storiesEn: '',
    historicalImpactZh: '', historicalImpactEn: '',
    links: {}
  };
}

async function main() {
  console.log('Fetching Wikidata month by month...\n');

  const allItems = [];

  for (let month = 1; month <= 12; month++) {
    process.stdout.write(`Month ${month}... `);
    const items = await query(month);
    console.log(`${items.length} albums`);
    allItems.push(...items);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nTotal: ${allItems.length} albums`);

  // Deduplicate
  const seen = new Set();
  const unique = allItems.filter(item => {
    const key = (item.artist + '|' + item.name).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  console.log(`Unique: ${unique.length}`);

  // Group by MM-DD
  const byDate = {};
  for (const item of unique) {
    const mmdd = item.date.slice(5, 10);
    if (!mmdd || mmdd.length !== 5) continue;
    if (!byDate[mmdd]) byDate[mmdd] = [];
    byDate[mmdd].push(item);
  }

  // Build database: prioritize notable, max 3 per day
  const db = {};
  for (const [mmdd, items] of Object.entries(byDate)) {
    const notable = items.filter(isNotable);
    const selected = notable.length > 0 ? notable.slice(0, 3) : items.slice(0, 3);
    db[mmdd] = { date: mmdd, items: selected.map(s => buildItem(s, mmdd)) };
  }

  // Save
  const sorted = {};
  Object.keys(db).sort().forEach(k => { sorted[k] = db[k]; });
  sorted._meta = {
    generated: new Date().toISOString(),
    source: 'Wikidata',
    version: 8,
    totalDays: Object.keys(db).length,
    totalItems: Object.values(db).reduce((s, e) => s + e.items.length, 0),
    note: 'Accurate dates from Wikidata. Notable artists prioritized.'
  };

  fs.writeFileSync('data/albums.json', JSON.stringify(sorted, null, 2));

  const days = Object.keys(db).length;
  const total = sorted._meta.totalItems;
  console.log(`\nSaved: ${days} days, ${total} items`);

  // Show some examples
  const today = '07-10';
  if (db[today]) {
    console.log(`\nToday (${today}):`);
    db[today].items.forEach((i, n) => console.log(`  ${n+1}. ${i.name} - ${i.artist} (${i.year})`));
  }

  // Month distribution
  const byMonth = {};
  Object.keys(db).forEach(d => {
    const m = d.slice(0, 2);
    byMonth[m] = (byMonth[m] || 0) + 1;
  });
  console.log('\nMonth coverage:');
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    console.log(`  ${mm}: ${byMonth[mm] || 0} days`);
  }
}

main().catch(console.error);
