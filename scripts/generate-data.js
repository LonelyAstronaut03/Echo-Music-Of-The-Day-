/**
 * Everyday Music - 专辑数据生成脚本
 * 使用 DeepSeek API 批量生成全 366 天专辑数据
 *
 * 运行方式：node scripts/generate-data.js
 * 需要设置：DEEPSEEK_API_KEY
 */

const fs = require("fs");
const path = require("path");

// ============================================================
// 配置
// ============================================================

const CONFIG = {
  outputPath: path.join(__dirname, "..", "data", "albums.json"),
  daysPerBatch: 3,
  targetDates: generateAllDates(),
  model: "deepseek-chat",
  apiBase: "https://api.deepseek.com/v1",
  maxTokens: 6000,
};

// ============================================================
// 工具函数
// ============================================================

function generateAllDates() {
  const dates = [];
  for (let m = 1; m <= 12; m++) {
    const month = String(m).padStart(2, "0");
    const daysInMonth = new Date(2024, m, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push(`${month}-${String(d).padStart(2, "0")}`);
    }
  }
  return dates;
}

function buildPrompt(dates) {
  const dateList = dates.join(", ");
  return `你是一位博学的音乐史学家和策展人。请为以下每个日期推荐恰好 3 张发行于该月日的真实专辑。

日期：${dateList}

要求：
- 每个日期恰好 3 张专辑，发行于历史上的该月日（MM-DD），年份不限
- 恰好 1 张为华语（中文演唱）专辑
- 其余 2 张来自世界各地，兼顾知名经典与冷门佳作
- 优先确保发行日期准确

每张专辑请提供以下 JSON 字段：
{
  "id": "唯一标识（如 pink-floyd-dark-side-1973）",
  "name": "英文专辑名",
  "nameZh": "中文专辑名",
  "artist": "英文艺术家名",
  "artistZh": "中文艺术家名",
  "releaseDate": "MM-DD格式（如 03-01）",
  "year": 发行年份,
  "coverImage": "",
  "genres": ["品类1", "品类2"],
  "language": "chinese/english/japanese/korean/other",
  "languageZh": "华语/英语/日语/韩语/其他",
  "descriptionZh": "中文专辑简介（约150字）",
  "descriptionEn": "英文专辑简介（约150 words）",
  "storiesZh": "中文幕后故事（约150字）",
  "storiesEn": "英文幕后故事（约150 words）",
  "historicalImpactZh": "历史影响（可选，约100字，无显著影响可省略）",
  "historicalImpactEn": "Historical impact (optional, ~100 words)",
  "links": {}
}

请严格输出以下 JSON 格式：
{
  "MM-DD": {
    "date": "MM-DD",
    "albums": [ 三张专辑对象 ]
  }
}

只输出 JSON，勿输出其他内容。`;
}

/**
 * 调用 DeepSeek API (OpenAI 兼容)
 */
async function callDeepSeekAPI(prompt) {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    throw new Error(
      "请设置环境变量 DEEPSEEK_API_KEY。\n获取 Key: https://platform.deepseek.com/"
    );
  }

  const response = await fetch(`${CONFIG.apiBase}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: CONFIG.model,
      messages: [{ role: "user", content: prompt }],
      max_tokens: CONFIG.maxTokens,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API 请求失败 (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

function parseJSONResponse(text) {
  // 尝试直接解析
  try { return JSON.parse(text); } catch {}
  // 提取 JSON 块
  const match = text.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {
      throw new Error("无法从 API 响应解析 JSON");
    }
  }
  throw new Error("API 响应中未找到 JSON");
}

function validateDailyEntry(entry) {
  const errors = [];
  const albums = entry.albums;
  if (!albums || albums.length !== 3) {
    errors.push(`应有 3 张专辑，实际 ${albums ? albums.length : 0}`);
    return errors;
  }
  const chinese = albums.filter((a) => a.language === "chinese").length;
  if (chinese !== 1) errors.push(`华语应为 1，实际 ${chinese}`);
  return errors;
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log("🎵 Echo-Music 数据生成器 (DeepSeek API)");
  console.log(`   目标: ${CONFIG.targetDates.length} 天`);
  console.log(`   每批: ${CONFIG.daysPerBatch} 天`);
  console.log(`   批数: ${Math.ceil(CONFIG.targetDates.length / CONFIG.daysPerBatch)}\n`);

  // 加载已有数据（支持断点续传）
  let existingData = {};
  if (fs.existsSync(CONFIG.outputPath)) {
    const raw = JSON.parse(fs.readFileSync(CONFIG.outputPath, "utf-8"));
    for (const [k, v] of Object.entries(raw)) {
      if (k !== "_meta") existingData[k] = v;
    }
    console.log(`📂 已有数据: ${Object.keys(existingData).length} 天`);
  }

  // 计算缺失
  const allDates = CONFIG.targetDates;
  const missingDates = allDates.filter((d) => !existingData[d]);
  console.log(`⏳ 待生成: ${missingDates.length} 天\n`);

  if (missingDates.length === 0) {
    console.log("✅ 全年已覆盖！");
    return;
  }

  // 分批
  const batches = [];
  for (let i = 0; i < missingDates.length; i += CONFIG.daysPerBatch) {
    batches.push(missingDates.slice(i, i + CONFIG.daysPerBatch));
  }

  let success = 0;

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const range = `${batch[0]} ~ ${batch[batch.length - 1]}`;
    console.log(`\n📡 批次 ${i + 1}/${batches.length} (${range}, ${batch.length}天)`);

    try {
      const prompt = buildPrompt(batch);
      console.log("   调用 DeepSeek API...");
      const text = await callDeepSeekAPI(prompt);
      const parsed = parseJSONResponse(text);

      let batchOK = 0;
      for (const date of batch) {
        if (parsed[date]) {
          const errs = validateDailyEntry(parsed[date]);
          if (errs.length === 0) {
            existingData[date] = parsed[date];
            batchOK++;
          } else {
            console.log(`   ⚠️ ${date}: ${errs.join("; ")}`);
          }
        } else {
          console.log(`   ⚠️ ${date}: API 未生成`);
        }
      }

      success += batchOK;
      console.log(`   ✅ ${batchOK}/${batch.length} 天成功`);

      // 保存
      const output = { _meta: { generated: new Date().toISOString(), version: 3 }, ...existingData };
      fs.writeFileSync(CONFIG.outputPath, JSON.stringify(output, null, 2));
      console.log(`   💾 已保存 (总计 ${Object.keys(existingData).length} 天)`);

      // 速率限制
      if (i < batches.length - 1) {
        await new Promise((r) => setTimeout(r, 2000));
      }
    } catch (err) {
      console.error(`   ❌ 失败: ${err.message}`);
      const output = { _meta: { generated: new Date().toISOString(), version: 3 }, ...existingData };
      fs.writeFileSync(CONFIG.outputPath, JSON.stringify(output, null, 2));
      console.log("   💾 已保存，可稍后重试");
    }
  }

  console.log(`\n📊 完成! 覆盖 ${Object.keys(existingData).length}/366 天`);
  const stillMissing = allDates.filter((d) => !existingData[d]);
  if (stillMissing.length > 0) {
    console.log(`   缺失 ${stillMissing.length} 天，重新运行即可补充`);
  }
}

main().catch(console.error);
