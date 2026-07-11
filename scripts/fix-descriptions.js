/**
 * Fix bad descriptions: some were generated without proper artist/genre context
 * Re-generates content with genre info included in the prompt
 */
const fs = require('fs');
const https = require('https');

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('Set DEEPSEEK_API_KEY'); process.exit(1); }

function apiCall(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: 2000, temperature: 0.7 });
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

// Keywords that indicate a generic/hallucinated description
const RED_FLAGS = [
  '独立摇滚', 'indie rock', '英国乐队', 'British band',
  '旋律流畅', '富有感染力', '展现了乐队', '首张专辑',
];

function isSuspicious(descZh, genres, artist) {
  if (!descZh) return false;
  // Very generic descriptions are suspicious
  let flagCount = 0;
  for (const flag of RED_FLAGS) {
    if (descZh.includes(flag)) flagCount++;
  }
  // If description has 3+ generic phrases and the artist name isn't mentioned, suspicious
  const mentionsArtist = descZh.includes(artist.slice(0, 2));
  if (flagCount >= 3 && !mentionsArtist) return true;
  return false;
}

async function main() {
  const data = JSON.parse(fs.readFileSync('data/albums.json', 'utf-8'));
  const toFix = [];

  for (const [date, entry] of Object.entries(data)) {
    if (date === '_meta') continue;
    for (const item of entry.items) {
      if (isSuspicious(item.descriptionZh || '', item.genres || [], item.artist)) {
        toFix.push({ date, item });
      }
    }
  }

  console.log(`Suspicious entries: ${toFix.length}/${Object.values(data).reduce((s,e)=>s+(e.items?.length||0),0)}`);

  const BATCH = 3;
  for (let i = 0; i < toFix.length; i += BATCH) {
    const batch = toFix.slice(i, i + BATCH);
    const items = batch.map((b, idx) => {
      const item = b.item;
      return `${idx + 1}. ${item.name} - ${item.artist} (${item.year}) [${(item.genres||[]).join(', ')}]`;
    }).join('\n');

    const prompt = `你是音乐专家。为以下音乐作品重写内容。每项提供：\\n1. descriptionZh（中文简介100字）：准确描述风格和特色\\n2. storiesZh（中文幕后故事80字）：真实有趣的录制背景\\n3. artistIntroZh（中文艺人简介60字）：准确介绍艺人\\n\\n【重要】请确保内容准确、信息正确，不要编造。\\n\\n${items}\\n\\n输出JSON数组：[{\"descriptionZh\":\"\",\"storiesZh\":\"\",\"artistIntroZh\":\"\"}]`;

    try {
      const response = await apiCall(prompt);
      let json = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const match = json.match(/\[[\s\S]*\]/);
      const results = JSON.parse(match ? match[0] : json);

      batch.forEach(({ date, item }, idx) => {
        if (results[idx]) {
          if (results[idx].descriptionZh) item.descriptionZh = results[idx].descriptionZh;
          if (results[idx].storiesZh) item.storiesZh = results[idx].storiesZh;
          if (results[idx].artistIntroZh) item.artistIntroZh = results[idx].artistIntroZh;
        }
      });

      process.stdout.write(`\r  ${Math.min(i + BATCH, toFix.length)}/${toFix.length}`);
    } catch(e) {
      console.error(`\n  Batch ${i} failed: ${e.message}`);
    }

    if (i % 30 === 0) {
      fs.writeFileSync('data/albums.json', JSON.stringify(data, null, 2));
    }

    await new Promise(r => setTimeout(r, 1000));
  }

  fs.writeFileSync('data/albums.json', JSON.stringify(data, null, 2));
  console.log(`\nFixed ${toFix.length} descriptions`);
}

main().catch(console.error);
