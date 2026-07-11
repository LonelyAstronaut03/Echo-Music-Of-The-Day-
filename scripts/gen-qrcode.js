/**
 * Generate a beautiful QR code for sharing
 */
const QRCode = require('qrcode');
const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

const URL = 'https://lonelyastronaut03.github.io/Echo-Music-Of-The-Day-/';

async function main() {
  // Generate QR code as canvas
  const qrCanvas = createCanvas(400, 400);
  await QRCode.toCanvas(qrCanvas, URL, {
    width: 400,
    margin: 2,
    color: { dark: '#1a1a1a', light: '#ffffff' },
    errorCorrectionLevel: 'H'
  });

  // Create final canvas with padding and text
  const W = 560;
  const H = 640;
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext('2d');

  // White background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, W, H);

  // Rounded rect behind QR
  const qrX = 80, qrY = 60, qrSize = 400, qrRadius = 20;
  ctx.beginPath();
  ctx.moveTo(qrX + qrRadius, qrY);
  ctx.lineTo(qrX + qrSize - qrRadius, qrY);
  ctx.quadraticCurveTo(qrX + qrSize, qrY, qrX + qrSize, qrY + qrRadius);
  ctx.lineTo(qrX + qrSize, qrY + qrSize - qrRadius);
  ctx.quadraticCurveTo(qrX + qrSize, qrY + qrSize, qrX + qrSize - qrRadius, qrY + qrSize);
  ctx.lineTo(qrX + qrRadius, qrY + qrSize);
  ctx.quadraticCurveTo(qrX, qrY + qrSize, qrX, qrY + qrSize - qrRadius);
  ctx.lineTo(qrX, qrY + qrRadius);
  ctx.quadraticCurveTo(qrX, qrY, qrX + qrRadius, qrY);
  ctx.closePath();
  ctx.fillStyle = '#fafaf9';
  ctx.fill();
  ctx.strokeStyle = '#e8e6e1';
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw QR code
  ctx.drawImage(qrCanvas, qrX, qrY, qrSize, qrSize);

  // Title
  ctx.fillStyle = '#1a1a1a';
  ctx.font = 'bold 28px "Noto Serif SC", serif';
  ctx.textAlign = 'center';
  ctx.fillText('Echo-Music Of The Day', W / 2, 520);

  // Subtitle
  ctx.fillStyle = '#888888';
  ctx.font = '18px "Noto Sans SC", sans-serif';
  ctx.fillText('历史上的今天 · 每日音乐推荐', W / 2, 555);

  // URL
  ctx.fillStyle = '#aaaaaa';
  ctx.font = '14px "Noto Sans SC", sans-serif';
  ctx.fillText('lonelyastronaut03.github.io/Echo-Music-Of-The-Day', W / 2, 585);

  // Decorative dots
  [200, 280, 360].forEach((x, i) => {
    ctx.beginPath();
    ctx.arc(x, 610, 5, 0, Math.PI * 2);
    ctx.fillStyle = i === 1 ? '#d4734e' : '#cccccc';
    ctx.fill();
  });

  const outPath = path.join(__dirname, '..', 'assets', 'qrcode.png');
  fs.writeFileSync(outPath, canvas.toBuffer('image/png'));
  console.log('QR code created:', outPath, `(${W}x${H})`);
}

main().catch(console.error);
