/**
 * Fix genre tags using DeepSeek — all 692 items currently have "Pop"
 */
const fs = require('fs');
const https = require('https');

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('Set DEEPSEEK_API_KEY'); process.exit(1); }

function apiCall(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: 500, temperature: 0.3 });
    const req = https.request({
      hostname: 'api.deepseek.com', path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try { const r = JSON.parse(data); resolve(r.choices[0].message.content.trim()); }
        catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function main() {
  const data = JSON.parse(fs.readFileSync('data/albums.json', 'utf-8'));
  const toFix = [];

  for (const [date, entry] of Object.entries(data)) {
    if (date === '_meta') continue;
    for (const item of entry.items) {
      if (!item.genres || item.genres.length === 0 || item.genres[0] === 'Pop') {
        toFix.push({ date, item });
      }
    }
  }

  console.log(`Need to fix: ${toFix.length} items`);
  const BATCH = 10;

  for (let i = 0; i < toFix.length; i += BATCH) {
    const batch = toFix.slice(i, i + BATCH);
    const items = batch.map((b, idx) => `${idx + 1}. ${b.item.name} - ${b.item.artist} (${b.item.year})`).join('\n');

    const prompt = `为以下专辑/单曲标注准确的音乐流派标签（1-3个即可）。使用通用流派名如：Rock, Jazz, R&B, Hip-Hop, Pop, Electronic, Folk, Classical, Soul, Funk, Blues, Reggae, Metal, Punk, Country, Latin, Indie Rock, Alternative, Psychedelic, Prog Rock, Trip Hop, New Wave, Synth-pop, Grunge, Britpop, Dream Pop, Shoegaze, Post-Punk, Disco, House, Techno, Ambient, Gospel, Opera, Samba, Bossa Nova, K-Pop, J-Pop, Mandopop, Cantopop 等。

只输出JSON数组：["Genre1", "Genre2"]

${items}`;

    try {
      const response = await apiCall(prompt);
      // Parse: each line should have the genres
      const lines = response.trim().split('\n').filter(l => l.match(/^\[/));
      batch.forEach(({ date, item }, idx) => {
        if (lines[idx]) {
          try {
            const genres = JSON.parse(lines[idx]);
            if (Array.isArray(genres) && genres.length > 0) {
              item.genres = genres;
            }
          } catch {}
        }
      });

      process.stdout.write(`\r  ${Math.min(i + BATCH, toFix.length)}/${toFix.length}`);
    } catch(e) {
      console.error(`\n  Batch failed: ${e.message}`);
    }

    if (i % 50 === 0) {
      fs.writeFileSync('data/albums.json', JSON.stringify(data, null, 2));
    }

    await new Promise(r => setTimeout(r, 800));
  }

  fs.writeFileSync('data/albums.json', JSON.stringify(data, null, 2));

  // Stats
  const genres = {};
  for (const [date, entry] of Object.entries(data)) {
    if (date === '_meta') continue;
    for (const item of entry.items) {
      (item.genres || []).forEach(g => { genres[g] = (genres[g] || 0) + 1; });
    }
  }
  console.log('\n\nFixed! Top genres:');
  Object.entries(genres).sort((a, b) => b[1] - a[1]).slice(0, 15).forEach(([g, c]) => console.log(`  ${g}: ${c}`));
}

main().catch(console.error);
