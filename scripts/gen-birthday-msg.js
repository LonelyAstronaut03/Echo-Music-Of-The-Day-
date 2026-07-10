/**
 * Generate birthday messages for each day with album data
 * Uses DeepSeek API, results stored in albums.json
 */
const fs = require('fs');
const https = require('https');

const API_KEY = process.env.DEEPSEEK_API_KEY;
if (!API_KEY) { console.error('Set DEEPSEEK_API_KEY'); process.exit(1); }

function apiCall(prompt) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], max_tokens: 600, temperature: 0.9 });
    const req = https.request({
      hostname: 'api.deepseek.com', path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${API_KEY}` }
    }, res => {
      let data = '';
      res.on('data', d => data += d);
      res.on('end', () => {
        try {
          const r = JSON.parse(data);
          if (r.choices) resolve(r.choices[0].message.content.trim());
          else reject(new Error(data.slice(0, 200)));
        } catch(e) { reject(e); }
      });
    });
    req.on('error', reject);
    req.write(body); req.end();
  });
}

async function main() {
  const data = JSON.parse(fs.readFileSync('data/albums.json', 'utf-8'));
  let total = 0, generated = 0;

  for (const [date, entry] of Object.entries(data)) {
    if (date === '_meta') continue;
    total++;

    // Skip if already has a birthday message
    if (entry.birthdayZh && entry.birthdayEn) {
      generated++;
      continue;
    }

    const albums = entry.items;
    const mmdd = date;
    const month = parseInt(mmdd.slice(0, 2));
    const day = parseInt(mmdd.slice(3, 5));

    // Build album info for the prompt
    const albumInfoZh = albums.map(a => {
      const title = a.nameZh || a.name;
      const artist = a.artistZh || a.artist;
      const desc = (a.descriptionZh || '').slice(0, 80);
      return `《${title}》- ${artist}：${desc}`;
    }).join('\n');

    const albumInfoEn = albums.map(a => {
      const desc = (a.descriptionEn || '').slice(0, 80);
      return `"${a.name}" by ${a.artist}: ${desc}`;
    }).join('\n');

    // Generate Chinese message
    const zhPrompt = `写一段温暖的话。背景：某个人的生日是${month}月${day}日，历史上这天发行了这些专辑：\n${albumInfoZh}\n\n要求：以"${month}月${day}日，是你的生日。"开头；自然融入1-2张专辑的名字及其寓意或精神；温暖、诗意、有力量；80-120字；不要markdown；不要称呼"亲爱的"等。`;

    // Generate English message
    const enPrompt = `Write a warm message. Background: someone's birthday is ${['','January','February','March','April','May','June','July','August','September','October','November','December'][month]} ${day}. On this date in history, these albums were released:\n${albumInfoEn}\n\nRequirements: Start with "${['','January','February','March','April','May','June','July','August','September','October','November','December'][month]} ${day} is your birthday."; naturally weave in 1-2 album names and their spirit; warm, poetic, uplifting; 60-100 words; no markdown.`;

    try {
      const [zhMsg, enMsg] = await Promise.all([
        apiCall(zhPrompt),
        apiCall(enPrompt)
      ]);

      entry.birthdayZh = zhMsg;
      entry.birthdayEn = enMsg;
      generated++;

      process.stdout.write(`\r  ${generated}/${total}`);
    } catch(e) {
      console.error(`\n  Failed ${date}: ${e.message}`);
    }

    // Save every 10
    if (generated % 10 === 0) {
      data._meta.generated = new Date().toISOString();
      fs.writeFileSync('data/albums.json', JSON.stringify(data, null, 2));
    }

    await new Promise(r => setTimeout(r, 500));
  }

  data._meta.generated = new Date().toISOString();
  data._meta.birthdayMessages = generated;
  fs.writeFileSync('data/albums.json', JSON.stringify(data, null, 2));

  console.log(`\nDone! ${generated}/${total} days have birthday messages`);
}

main().catch(console.error);
