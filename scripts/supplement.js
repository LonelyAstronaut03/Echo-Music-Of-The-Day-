/**
 * Everyday Music - 数据补充脚本
 *
 * 检查 albums.json 的覆盖缺口，针对缺失日期生成补充数据。
 * 运行方式：node scripts/supplement.js
 */

const fs = require("fs");
const path = require("path");

const DATA_PATH = path.join(__dirname, "..", "data", "albums.json");

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

function analyze() {
  if (!fs.existsSync(DATA_PATH)) {
    console.log("❌ 尚未生成数据文件，请先运行 generate-data.js");
    console.log(`   预期路径: ${DATA_PATH}`);
    return;
  }

  const data = JSON.parse(fs.readFileSync(DATA_PATH, "utf-8"));
  const allDates = generateAllDates();
  const existingDates = Object.keys(data);
  const missingDates = allDates.filter((d) => !data[d]);

  console.log("📊 数据覆盖分析");
  console.log(`   总天数: ${allDates.length}`);
  console.log(`   已覆盖: ${existingDates.length} (${((existingDates.length / allDates.length) * 100).toFixed(1)}%)`);
  console.log(`   缺失: ${missingDates.length}`);

  if (missingDates.length === 0) {
    console.log("\n✅ 全年已全部覆盖！");
    return;
  }

  // 按月份统计
  const byMonth = {};
  missingDates.forEach((d) => {
    const month = d.slice(0, 2);
    if (!byMonth[month]) byMonth[month] = [];
    byMonth[month].push(d);
  });

  console.log("\n📅 缺失按月份分布:");
  for (const [month, dates] of Object.entries(byMonth).sort()) {
    const bar = "█".repeat(dates.length);
    console.log(`   ${month}月: ${dates.length} 天 ${bar}`);
  }

  // 检查华语覆盖
  const chineseCoverage = {};
  for (const [date, entry] of Object.entries(data)) {
    const hasChinese = entry.albums.some((a) => a.language === "chinese");
    chineseCoverage[date] = hasChinese;
  }

  const daysWithoutChinese = existingDates.filter((d) => !chineseCoverage[d]);
  if (daysWithoutChinese.length > 0) {
    console.log(`\n⚠️ 华语专辑缺失: ${daysWithoutChinese.length} 天`);
    console.log(`   ${daysWithoutChinese.slice(0, 10).join(", ")}...`);
  }

  // 检查语种多样性
  let lowDiversityCount = 0;
  for (const [date, entry] of Object.entries(data)) {
    const languages = entry.albums.map((a) => a.language);
    if (new Set(languages).size < 2) {
      lowDiversityCount++;
    }
  }
  if (lowDiversityCount > 0) {
    console.log(`\n⚠️ 语种单一: ${lowDiversityCount} 天（3张专辑语种完全相同）`);
  }

  console.log(`\n💡 运行 generate-data.js 以补充缺失日期`);
}

analyze();
