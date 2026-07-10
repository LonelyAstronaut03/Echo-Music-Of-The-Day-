/**
 * Fetch albums from Wikidata — no artist bias, genre diversity ensured
 */
const fs = require('fs');
const https = require('https');

function queryMonth(month) {
  const pad = String(month).padStart(2, '0');
  return new Promise((resolve) => {
    const q = `SELECT ?item ?itemLabel ?artistLabel ?date ?genreLabel WHERE {
  ?item (wdt:P31/(wdt:P279*)) wd:Q482994.
  ?item wdt:P577 ?date.
  FILTER(CONTAINS(STR(?date), "-${pad}-"))
  OPTIONAL { ?item wdt:P175 ?artist. }
  OPTIONAL { ?item wdt:P136 ?genre. }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en". }
} LIMIT 300`;
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
            date: (b.date?.value || '').slice(0, 10),
            genre: b.genreLabel?.value || ''
          }));
          resolve(items);
        } catch(e) { console.error(`Month ${month} parse:`, e.message); resolve([]); }
      });
    }).on('error', e => { console.error(`Month ${month} net:`, e.message); resolve([]); });
  });
}

const BROAD_GENRES = {
  'Rock': ['rock', 'metal', 'punk', 'grunge', 'indie rock', 'alternative rock'],
  'Pop': ['pop', 'synth-pop', 'dance-pop', 'electropop', 'art pop', 'baroque pop'],
  'Jazz': ['jazz', 'swing', 'bebop', 'big band', 'vocal jazz', 'smooth jazz', 'free jazz', 'fusion'],
  'R&B/Soul': ['r&b', 'soul', 'funk', 'neo soul', 'contemporary r&b', 'disco'],
  'Hip-Hop': ['hip-hop', 'hip hop', 'rap', 'trap', 'gangsta rap'],
  'Electronic': ['electronic', 'techno', 'house', 'ambient', 'trip hop', 'drum and bass'],
  'Folk/Country': ['folk', 'country', 'singer-songwriter', 'americana', 'bluegrass', 'blues'],
  'Classical': ['classical', 'opera', 'symphonic', 'orchestral', 'baroque'],
  'World/Reggae': ['reggae', 'latin', 'samba', 'bossa nova', 'afrobeat', 'j-pop', 'k-pop', 'mandopop', 'cantopop'],
};

function mapGenre(wikidataGenre) {
  const g = wikidataGenre.toLowerCase();
  for (const [broad, keywords] of Object.entries(BROAD_GENRES)) {
    for (const kw of keywords) {
      if (g.includes(kw)) return broad;
    }
  }
  return null;
}

function buildItem(album, mmdd) {
  const year = album.date.slice(0, 4);
  const id = (album.artist + '-' + album.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
  const broadGenre = mapGenre(album.genre);
  return {
    id, name: album.name, nameZh: '', artist: album.artist, artistZh: '',
    releaseDate: mmdd, year: parseInt(year), coverImage: '',
    genres: broadGenre ? [broadGenre] : ['Pop'],
    language: 'english', languageZh: '英语',
    type: 'album',
    descriptionZh: `${album.artist} 于 ${year} 年发行。`,
    descriptionEn: `Released by ${album.artist} in ${year}.`,
    storiesZh: '', storiesEn: '',
    historicalImpactZh: '', historicalImpactEn: '',
    links: {}
  };
}

async function main() {
  console.log('Fetching from Wikidata (genre diversity mode)...\n');

  const allItems = [];
  for (let m = 1; m <= 12; m++) {
    process.stdout.write(`Month ${m}... `);
    const items = await queryMonth(m);
    console.log(`${items.length} albums`);
    allItems.push(...items);
    await new Promise(r => setTimeout(r, 1000));
  }

  console.log(`\nTotal raw: ${allItems.length}`);

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

  // Select up to 3 per day, with genre priority: Jazz > R&B > Pop > Classical > others
  const PRIORITY = ['Jazz', 'R&B/Soul', 'Pop', 'Classical', 'Hip-Hop', 'Electronic', 'Folk/Country', 'World/Reggae', 'Rock'];
  const db = {};

  for (const [mmdd, items] of Object.entries(byDate)) {
    const selected = [];
    const usedGenres = new Set();

    // Sort items by genre priority
    const sorted = items.sort((a, b) => {
      const ga = mapGenre(a.genre) || 'Other';
      const gb = mapGenre(b.genre) || 'Other';
      const pa = PRIORITY.indexOf(ga), pb = PRIORITY.indexOf(gb);
      return (pa === -1 ? 99 : pa) - (pb === -1 ? 99 : pb);
    });

    // Pick items, avoiding duplicate broad genres
    for (const item of sorted) {
      if (selected.length >= 3) break;
      const bg = mapGenre(item.genre) || 'Other';
      if (!usedGenres.has(bg) || selected.length >= 2) {
        selected.push(item);
        usedGenres.add(bg);
      }
    }

    db[mmdd] = { date: mmdd, items: selected.map(s => buildItem(s, mmdd)) };
  }

  // Save
  const sorted = {};
  Object.keys(db).sort().forEach(k => { sorted[k] = db[k]; });
  sorted._meta = {
    generated: new Date().toISOString(),
    source: 'Wikidata (genre-diverse)',
    version: 9,
    totalDays: Object.keys(db).length,
    totalItems: Object.values(db).reduce((s, e) => s + e.items.length, 0),
    note: 'Genre diversity prioritized. No artist bias.'
  };

  fs.writeFileSync('data/albums.json', JSON.stringify(sorted, null, 2));

  // Stats
  const genreCounts = {};
  for (const [d, e] of Object.entries(db)) {
    e.items.forEach(i => {
      const g = (i.genres || ['Other'])[0];
      genreCounts[g] = (genreCounts[g] || 0) + 1;
    });
  }

  console.log(`\nSaved: ${Object.keys(db).length} days, ${sorted._meta.totalItems} items`);
  console.log('\nGenre distribution:');
  Object.entries(genreCounts).sort((a, b) => b[1] - a[1]).forEach(([g, c]) => {
    const bar = '#'.repeat(Math.round(c / 10));
    console.log(`  ${g.padEnd(15)}: ${String(c).padStart(3)} ${bar}`);
  });

  // Month coverage
  const byMonth = {};
  Object.keys(db).forEach(d => { const m = d.slice(0, 2); byMonth[m] = (byMonth[m] || 0) + 1; });
  console.log('\nMonth coverage:');
  for (let m = 1; m <= 12; m++) {
    const mm = String(m).padStart(2, '0');
    console.log(`  ${mm}: ${byMonth[mm] || 0} days`);
  }
}

main().catch(console.error);
