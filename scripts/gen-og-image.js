/**
 * Generate Open Graph share image for WeChat/Twitter/etc
 */
const { createCanvas, registerFont } = require('canvas');
const fs = require('fs');
const path = require('path');

const W = 1200;
const H = 630;
const canvas = createCanvas(W, H);
const ctx = canvas.getContext('2d');

// Background: warm gradient
const bg = ctx.createLinearGradient(0, 0, W, H);
bg.addColorStop(0, '#fafaf9');
bg.addColorStop(0.5, '#fdf8f3');
bg.addColorStop(1, '#faf5f0');
ctx.fillStyle = bg;
ctx.fillRect(0, 0, W, H);

// Decorative vinyl record (large, subtle)
ctx.save();
ctx.translate(W - 160, 140);
ctx.beginPath();
ctx.arc(0, 0, 200, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(0,0,0,0.03)';
ctx.fill();
ctx.beginPath();
ctx.arc(0, 0, 60, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(212,115,78,0.08)';
ctx.fill();
ctx.restore();

// Decorative circle (top left)
ctx.beginPath();
ctx.arc(100, 100, 80, 0, Math.PI * 2);
ctx.fillStyle = 'rgba(212,115,78,0.06)';
ctx.fill();

// Title
ctx.fillStyle = '#1a1a1a';
ctx.font = 'bold 64px "Noto Serif SC", "SimSun", serif';
ctx.fillText('Echo-Music', 80, 240);

ctx.fillStyle = '#d4734e';
ctx.font = 'bold 64px "Noto Serif SC", "SimSun", serif';
ctx.fillText('Of The Day', 80, 320);

// Subtitle
ctx.fillStyle = '#888888';
ctx.font = '28px "Noto Sans SC", "Microsoft YaHei", sans-serif';
ctx.fillText('历史上的今天，这些作品诞生了', 80, 400);

ctx.fillStyle = '#aaaaaa';
ctx.font = 'italic 22px "Noto Sans SC", "Microsoft YaHei", sans-serif';
ctx.fillText('Discover the music born on this date in history', 80, 440);

// Bottom decoration: three dots representing three albums
const dotY = 520;
[300, 600, 900].forEach((x, i) => {
  ctx.beginPath();
  ctx.arc(x, dotY, 8, 0, Math.PI * 2);
  ctx.fillStyle = i === 1 ? '#d4734e' : '#cccccc';
  ctx.fill();
});

// Bottom text
ctx.fillStyle = '#bbbbbb';
ctx.font = '18px "Noto Sans SC", sans-serif';
ctx.fillText('340 天 · 636 张专辑/单曲 · 日期准确', 80, 570);
ctx.fillText('lonelyastronaut03.github.io/Echo-Music-Of-The-Day', 80, 600);

const outPath = path.join(__dirname, '..', 'assets', 'og-image.png');
fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
console.log('OG image created:', outPath, `(${W}x${H})`);
