/**
 * Everyday Music — 工具函数
 */

/** 从 MM-DD 字符串创建完整的 Date 对象（使用当前年份） */
function dateFromMMDD(mmdd) {
  const [month, day] = mmdd.split('-').map(Number);
  return new Date(new Date().getFullYear(), month - 1, day);
}

/** 将 Date 转为 MM-DD 格式 */
function toMMDD(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${m}-${d}`;
}

/** 获取今天的 MM-DD */
function getTodayMMDD() {
  return toMMDD(new Date());
}

/** 获取一个日期前后 N 天的 MM-DD 数组 */
function getNearbyDates(mmdd, range = 3) {
  const date = dateFromMMDD(mmdd);
  const results = [];
  for (let i = -range; i <= range; i++) {
    const d = new Date(date);
    d.setDate(d.getDate() + i);
    results.push(toMMDD(d));
  }
  return results;
}

/** 将 MM-DD 偏移 N 天 */
function offsetDate(mmdd, days) {
  const date = dateFromMMDD(mmdd);
  date.setDate(date.getDate() + days);
  return toMMDD(date);
}

/** 格式化日期显示（中文） */
function formatDateZh(mmdd) {
  const [month, day] = mmdd.split('-').map(Number);
  return `${month}月${day}日`;
}

/** 格式化日期显示（英文） */
function formatDateEn(mmdd) {
  const [month, day] = mmdd.split('-').map(Number);
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  return `${months[month - 1]} ${day}`;
}

/** 获取某月的天数 */
function daysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

/** 获取语种标签配置 */
function getLanguageTag(album) {
  const config = {
    chinese: { emoji: '🇨🇳', label: '华语', labelEn: 'Chinese' },
    english: { emoji: '🇬🇧', label: '英语', labelEn: 'English' },
    japanese: { emoji: '🇯🇵', label: '日语', labelEn: 'Japanese' },
    korean: { emoji: '🇰🇷', label: '韩语', labelEn: 'Korean' },
    other: { emoji: '🌐', label: album.languageZh || '其他', labelEn: album.language || 'Other' },
  };
  return config[album.language] || config.other;
}

/** 防抖 */
function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/** 格式化年份范围（单年或起始-至今） */
function formatYearRange(year) {
  const current = new Date().getFullYear();
  if (year === current) return String(year);
  return String(year);
}
