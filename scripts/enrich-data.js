/**
 * Enrich album data with DeepSeek API
 * Adds descriptions, stories, and historical impact
 */
const fs = require('fs');
const https = require('https');

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('Set DEEPSEEK_API_KEY'); process.exit(1); }

const INPUT = 'data/albums.json';
const BATCH_SIZE = 5; // albums per API call

function apiCall(messages) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'deepseek-chat', messages, max_tokens: 4000, temperature: 0.7 });
    const req = https.request({
      hostname: 'api.deepseek.com', path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          if (r.choices) resolve(r.choices[0].message.content);
          else reject(new Error(data.slice(0, 200)));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

function buildPrompt(items) {
  const itemList = items.map((item, i) =>
    `${i+1}. ${item.name} - ${item.artist} (${item.year}) [流派: ${(item.genres||['Pop']).join(', ')}]`
  ).join('\n');

  return `为以下音乐作品生成中文内容。注意：请根据给定的流派和艺人信息，生成准确、专业的内容，不要编造。对每张作品，提供：
1. 简介（100字左右）：这张作品的具体风格和核心特色——请贴合给定的流派标签
2. 幕后故事（100字左右）：录制或发行过程中的真实趣事或背景，必须与该艺人相关
3. 历史影响（50字左右，如确实有重要影响才写，否则留空）
4. 艺术家简介（80字左右）：准确介绍该艺人，包括其国籍、主要风格和代表作

请严格输出JSON数组，每项对应一张专辑：
[
  {
    "descriptionZh": "简介",
    "descriptionEn": "English intro",
    "storiesZh": "幕后故事",
    "storiesEn": "English story",
    "historicalImpactZh": "历史影响（或空字符串）",
    "historicalImpactEn": "impact or empty",
    "artistIntroZh": "艺术家简介",
    "artistIntroEn": "Artist intro"
  }
]

专辑列表：
${itemList}`;
}

async function main() {
  const data = JSON.parse(fs.readFileSync(INPUT, 'utf-8'));
  const allItems = [];

  for (const [date, entry] of Object.entries(data)) {
    if (date === '_meta') continue;
    for (const item of entry.items) {
      // Skip already enriched items
      if (item.storiesZh && item.storiesZh.length > 20) continue;
      allItems.push({ date, item });
    }
  }

  console.log(`Need to enrich: ${allItems.length}/${data._meta.totalItems} items`);

  // Process in batches
  let enriched = 0;
  for (let i = 0; i < allItems.length; i += BATCH_SIZE) {
    const batch = allItems.slice(i, i + BATCH_SIZE);
    const items = batch.map(b => b.item);

    process.stdout.write(`Batch ${Math.floor(i/BATCH_SIZE)+1}/${Math.ceil(allItems.length/BATCH_SIZE)}... `);

    try {
      const prompt = buildPrompt(items);
      const response = await apiCall([
        { role: 'user', content: prompt }
      ]);

      // Parse JSON array from response
      const json = response.replace(/```json\n?/g, '').replace(/```/g, '').trim();
      const match = json.match(/\[[\s\S]*\]/);
      const results = JSON.parse(match ? match[0] : json);

      // Apply to items
      batch.forEach(({ date, item }, idx) => {
        if (results[idx]) {
          Object.assign(item, results[idx]);
        }
      });

      enriched += batch.length;
      console.log(`OK (${enriched}/${allItems.length})`);

      // Save progress every 5 batches
      if (i % (BATCH_SIZE * 5) === 0) {
        data._meta.generated = new Date().toISOString();
        data._meta.enriched = enriched;
        fs.writeFileSync(INPUT, JSON.stringify(data, null, 2));
      }

      await new Promise(r => setTimeout(r, 1000));
    } catch(e) {
      console.error(`Failed: ${e.message}`);
      // Save progress and continue
      data._meta.generated = new Date().toISOString();
      fs.writeFileSync(INPUT, JSON.stringify(data, null, 2));
    }
  }

  // Final save
  data._meta.generated = new Date().toISOString();
  data._meta.enriched = enriched;
  fs.writeFileSync(INPUT, JSON.stringify(data, null, 2));

  console.log(`\nDone! Enriched ${enriched} items.`);
}

main().catch(console.error);
