/**
 * Everyday Music - 专辑数据生成脚本
 *
 * 使用 Claude API 批量生成专辑数据库。
 * 运行方式：node scripts/generate-data.js
 *
 * 需要设置环境变量：ANTHROPIC_API_KEY
 */

const fs = require("fs");
const path = require("path");

// ============================================================
// 配置
// ============================================================

const CONFIG = {
  // 输出文件路径
  outputPath: path.join(__dirname, "..", "data", "albums.json"),

  // 每批处理的天数（控制 API 调用的 token 量）
  daysPerBatch: 10,

  // 目标：全年 366 天
  targetDates: generateAllDates(),

  // Anthropic API 配置
  model: "claude-sonnet-5",
  maxTokens: 16384,
};

// ============================================================
// Schema 定义（用于 API 提示词）
// ============================================================

const ALBUM_SCHEMA = {
  type: "object",
  properties: {
    id: { type: "string", description: "唯一标识，如 'pink-floyd-dark-side-1973'" },
    name: { type: "string", description: "专辑英文名" },
    nameZh: { type: "string", description: "专辑中文名" },
    artist: { type: "string", description: "艺术家英文名" },
    artistZh: { type: "string", description: "艺术家中文名" },
    releaseDate: { type: "string", description: "发行月日，MM-DD 格式，如 '03-01'" },
    year: { type: "number", description: "发行年份" },
    coverImage: { type: "string", description: "专辑封面图片 URL" },
    genres: {
      type: "array",
      items: { type: "string" },
      description: "音乐品类，如 ['Rock', 'Psychedelic']",
    },
    language: {
      type: "string",
      enum: ["chinese", "english", "japanese", "korean", "other"],
      description: "语种代码",
    },
    languageZh: { type: "string", description: "中文语种名，如 '华语'、'英语'" },
    descriptionZh: { type: "string", description: "中文专辑简介（约 250 字）" },
    descriptionEn: { type: "string", description: "英文专辑简介（约 250 words）" },
    storiesZh: { type: "string", description: "中文趣事（约 200 字）" },
    storiesEn: { type: "string", description: "英文趣事（约 200 words）" },
    historicalImpactZh: {
      type: "string",
      description: "中文历史影响（约 150 字，如无显著影响可省略）",
    },
    historicalImpactEn: {
      type: "string",
      description: "英文历史影响（约 150 words，如无显著影响可省略）",
    },
    links: {
      type: "object",
      properties: {
        wikipedia: { type: "string" },
        spotify: { type: "string" },
        douban: { type: "string" },
      },
      description: "外部链接",
    },
  },
  required: [
    "id",
    "name",
    "nameZh",
    "artist",
    "artistZh",
    "releaseDate",
    "year",
    "coverImage",
    "genres",
    "language",
    "languageZh",
    "descriptionZh",
    "descriptionEn",
    "storiesZh",
    "storiesEn",
  ],
};

// ============================================================
// 工具函数
// ============================================================

function generateAllDates() {
  const dates = [];
  for (let m = 1; m <= 12; m++) {
    const month = String(m).padStart(2, "0");
    const daysInMonth = new Date(2024, m, 0).getDate(); // 2024 is leap year
    for (let d = 1; d <= daysInMonth; d++) {
      dates.push(`${month}-${String(d).padStart(2, "0")}`);
    }
  }
  return dates;
}

function buildPrompt(dates) {
  const dateList = dates.join(", ");
  return `你是一位博学的音乐史学家和策展人。请为以下每个日期推荐 3 张发行于当日的优质专辑。

日期列表：${dateList}

对每个日期，请：
1. 推荐恰好 3 张真实存在的、发行于该月日的专辑（年份不限）
2. 恰好 1 张为华语专辑（中文演唱），不要多也不要少
3. 3 张专辑应在知名度和音乐品类上有所搭配，自然地兼顾知名作品和冷门佳作
4. 优先确保信息准确性（特别是发行日期和年份）

对每张专辑请提供：
- 中英文名称和艺术家名
- 确切的发行月日（MM-DD）和年份
- 2-3 个音乐品类标签（如 Rock, Jazz, R&B, Hip-Hop, Classical, Folk 等）
- 语种（chinese/english/japanese/korean/other）
- 专辑封面图片 URL（优先使用 Wikipedia/Wikimedia 的稳定链接）
- 约 250 字的中英文专辑简介
- 约 200 字的中英文趣事/幕后故事
- 如果该专辑对音乐史产生了重要影响，约 150 字的历史意义说明（可选，不强求）
- 外部链接（Wikipedia、Spotify、豆瓣）

请仅输出有效的 JSON，格式如下：
{
  "MM-DD": {
    "date": "MM-DD",
    "albums": [
      { 专辑对象 1 },
      { 专辑对象 2 },
      { 专辑对象 3 }
    ]
  }
}

重要提醒：
- 每张华语专辑的 language 必须是 "chinese"，languageZh 为 "华语"
- 确保每个日期恰好有 1 张 language 为 "chinese" 的专辑
- 优先确保发行日期准确。如对日期不太确定，在描述中体现这一点
- coverImage 请使用可公开访问的稳定 URL`;
}

/**
 * 调用 Anthropic API
 */
async function callClaudeAPI(prompt) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "请设置环境变量 ANTHROPIC_API_KEY。\n" +
        "获取 API Key: https://console.anthropic.com/\n" +
        "设置方式: set ANTHROPIC_API_KEY=your-key-here  (Windows)\n" +
        "          export ANTHROPIC_API_KEY=your-key-here  (Mac/Linux)"
    );
  }

  // 动态导入 Anthropic SDK
  let Anthropic;
  try {
    Anthropic = require("@anthropic-ai/sdk").default;
  } catch {
    throw new Error(
      "请先安装 Anthropic SDK: npm install @anthropic-ai/sdk"
    );
  }

  const client = new Anthropic({ apiKey });

  const response = await client.messages.create({
    model: CONFIG.model,
    max_tokens: CONFIG.maxTokens,
    messages: [
      {
        role: "user",
        content: prompt,
      },
    ],
  });

  // 提取响应文本
  const text = response.content
    .filter((block) => block.type === "text")
    .map((block) => block.text)
    .join("");

  return text;
}

/**
 * 从 API 响应中解析 JSON
 */
function parseJSONResponse(text) {
  // 尝试直接解析
  try {
    return JSON.parse(text);
  } catch {
    // 尝试提取 JSON 块
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error("无法从 API 响应中解析 JSON");
      }
    }
    throw new Error("API 响应中未找到 JSON");
  }
}

/**
 * 验证专辑条目
 */
function validateAlbum(album, date) {
  const errors = [];

  if (!album.id) errors.push("缺少 id");
  if (!album.name) errors.push("缺少 name");
  if (!album.artist) errors.push("缺少 artist");
  if (album.releaseDate !== date)
    errors.push(`releaseDate 应为 ${date}，实际为 ${album.releaseDate}`);
  if (!album.year) errors.push("缺少 year");
  if (!album.genres || album.genres.length === 0) errors.push("缺少 genres");
  if (!album.language) errors.push("缺少 language");

  return errors;
}

/**
 * 验证一天的专辑组
 */
function validateDailyEntry(entry) {
  const errors = [];
  const albums = entry.albums;

  if (!albums || albums.length !== 3) {
    errors.push(`应有 3 张专辑，实际 ${albums ? albums.length : 0} 张`);
    return errors;
  }

  // 检查恰好 1 张华语
  const chineseCount = albums.filter((a) => a.language === "chinese").length;
  if (chineseCount !== 1) {
    errors.push(`应有恰好 1 张华语专辑，实际 ${chineseCount} 张`);
  }

  // 检查语种多样性
  const languages = albums.map((a) => a.language);
  if (new Set(languages).size < 2) {
    errors.push("语种搭配不够多样");
  }

  return errors;
}

// ============================================================
// 主流程
// ============================================================

async function main() {
  console.log("🎵 Everyday Music - 专辑数据生成器");
  console.log(`   目标: ${CONFIG.targetDates.length} 天`);
  console.log(`   每批: ${CONFIG.daysPerBatch} 天`);
  console.log(`   批数: ${Math.ceil(CONFIG.targetDates.length / CONFIG.daysPerBatch)}`);
  console.log("");

  // 加载已有数据（支持断点续传）
  let existingData = {};
  if (fs.existsSync(CONFIG.outputPath)) {
    existingData = JSON.parse(fs.readFileSync(CONFIG.outputPath, "utf-8"));
    console.log(`📂 已加载已有数据: ${Object.keys(existingData).length} 天`);
  }

  // 分批处理
  const batches = [];
  for (let i = 0; i < CONFIG.targetDates.length; i += CONFIG.daysPerBatch) {
    batches.push(CONFIG.targetDates.slice(i, i + CONFIG.daysPerBatch));
  }

  const remainingDates = batches.flat().filter((d) => !existingData[d]);
  console.log(`⏳ 待生成: ${remainingDates.length} 天\n`);

  if (remainingDates.length === 0) {
    console.log("✅ 所有日期已覆盖！");
    return;
  }

  // 重新分批（只处理未生成的日期）
  const remainingBatches = [];
  for (let i = 0; i < remainingDates.length; i += CONFIG.daysPerBatch) {
    remainingBatches.push(remainingDates.slice(i, i + CONFIG.daysPerBatch));
  }

  let totalProcessed = 0;

  for (let i = 0; i < remainingBatches.length; i++) {
    const batch = remainingBatches[i];
    console.log(
      `\n📡 批次 ${i + 1}/${remainingBatches.length} (${batch[0]} ~ ${batch[batch.length - 1]})`
    );
    console.log(`   ${batch.length} 天, ${batch.length * 3} 张专辑`);

    try {
      const prompt = buildPrompt(batch);
      console.log("   正在调用 Claude API...");

      const responseText = await callClaudeAPI(prompt);
      const parsed = parseJSONResponse(responseText);

      // 验证并合并
      let batchSuccess = 0;
      let batchErrors = 0;

      for (const date of batch) {
        if (parsed[date]) {
          const entry = parsed[date];
          const dailyErrors = validateDailyEntry(entry);

          if (dailyErrors.length === 0) {
            // 验证每张专辑
            let albumErrors = 0;
            entry.albums.forEach((album) => {
              const errs = validateAlbum(album, date);
              if (errs.length > 0) {
                albumErrors++;
                console.log(`   ⚠️ ${date} - ${album.name}: ${errs.join(", ")}`);
              }
            });

            if (albumErrors === 0) {
              existingData[date] = entry;
              batchSuccess++;
            } else {
              batchErrors++;
            }
          } else {
            console.log(`   ❌ ${date}: ${dailyErrors.join("; ")}`);
            batchErrors++;
          }
        } else {
          // API 没有为这个日期生成数据，可能遗漏
          console.log(`   ⚠️ ${date}: API 未生成`);
          batchErrors++;
        }
      }

      totalProcessed += batchSuccess;
      console.log(
        `   ✅ ${batchSuccess} 天成功, ⚠️ ${batchErrors} 天有问题`
      );

      // 每批后保存（防止丢失）
      fs.writeFileSync(
        CONFIG.outputPath,
        JSON.stringify(existingData, null, 2),
        "utf-8"
      );
      console.log(`   💾 已保存 (总计 ${Object.keys(existingData).length} 天)`);

      // API 速率限制
      if (i < remainingBatches.length - 1) {
        console.log("   ⏱️  等待 3 秒...");
        await new Promise((r) => setTimeout(r, 3000));
      }
    } catch (err) {
      console.error(`   ❌ 批次失败: ${err.message}`);

      // 保存已有数据
      fs.writeFileSync(
        CONFIG.outputPath,
        JSON.stringify(existingData, null, 2),
        "utf-8"
      );
      console.log(`   💾 已保存已有数据，可稍后继续`);
    }
  }

  // 最终统计
  console.log("\n" + "=".repeat(50));
  console.log("📊 生成完成！");

  const totalDays = Object.keys(existingData).length;
  const totalAlbums = Object.values(existingData).reduce(
    (sum, entry) => sum + entry.albums.length,
    0
  );
  const missingDates = CONFIG.targetDates.filter((d) => !existingData[d]);

  console.log(`   覆盖天数: ${totalDays}/${CONFIG.targetDates.length}`);
  console.log(`   专辑总数: ${totalAlbums}`);
  console.log(`   缺失天数: ${missingDates.length}`);

  if (missingDates.length > 0) {
    console.log(`   缺失日期: ${missingDates.slice(0, 20).join(", ")}...`);
    console.log(`\n💡 重新运行此脚本以补充缺失的日期`);
  }

  // 覆盖率统计
  const chineseAlbums = Object.values(existingData)
    .flatMap((e) => e.albums)
    .filter((a) => a.language === "chinese");
  console.log(`   华语专辑: ${chineseAlbums.length} 张`);
  console.log(`\n📁 数据文件: ${CONFIG.outputPath}`);
}

// 运行
main().catch(console.error);
