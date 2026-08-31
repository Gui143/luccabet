/**
 * Gerador do baralho (sprites reais de cartas).
 *
 * Saída:
 *   public/cards/<rank><suit>.png   -> ex.: ah.png (Ás de copas), as.png, th.png (10 de espadas)
 *   public/cards/back.png           -> verso da carta
 *   public/cards/atlas.png          -> sprite atlas 13x4 (52 cartas, 1 request só = alta performance na web)
 *   public/cards/atlas.json         -> metadados com as coordenadas de cada frame
 *
 * ranks: a,k,q,j,t(10),9..2   suits: s=espadas, h=copas, d=ouros, c=paus
 * Os naipes são paths vetoriais (não glifos Unicode) para renderizar igual em
 * qualquer navegador/sistema, sem depender de fonte instalada.
 *
 * Uso: node tools/generate-cards.mjs
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(__dirname, '../public/cards');

const CARD_W = 200;
const CARD_H = 280;

const SUITS = [
  { key: 's', color: '#14181f', name: 'espadas' },
  { key: 'h', color: '#d32029', name: 'copas' },
  { key: 'd', color: '#d32029', name: 'ouros' },
  { key: 'c', color: '#14181f', name: 'paus' },
];

const RANKS = [
  { key: '2', label: '2' },
  { key: '3', label: '3' },
  { key: '4', label: '4' },
  { key: '5', label: '5' },
  { key: '6', label: '6' },
  { key: '7', label: '7' },
  { key: '8', label: '8' },
  { key: '9', label: '9' },
  { key: 't', label: '10' },
  { key: 'j', label: 'J' },
  { key: 'q', label: 'Q' },
  { key: 'k', label: 'K' },
  { key: 'a', label: 'A' },
];

// ---------------------------------------------------------------- utilidades
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Naipes como paths vetoriais desenhados numa caixa de 100x100. */
const SUIT_PATHS = {
  // copas
  h: '<path d="M50 96 C 50 96 4 65 4 40 C 4 21 18 8 33 8 C 43 8 49 15 50 22 C 51 15 57 8 67 8 C 82 8 96 21 96 40 C 96 65 50 96 50 96 Z"/>',
  // ouros
  d: '<path d="M50 3 L 93 50 L 50 97 L 7 50 Z"/>',
  // espadas: coração invertido + haste
  s:
    '<g transform="translate(50,40) scale(0.60,-0.56) translate(-50,-50)">' +
    '<path d="M50 96 C 50 96 4 65 4 40 C 4 21 18 8 33 8 C 43 8 49 15 50 22 C 51 15 57 8 67 8 C 82 8 96 21 96 40 C 96 65 50 96 50 96 Z"/></g>' +
    '<path d="M45 58 C 45 58 40 78 38 86 C 36.5 92 40 96 45 96 L 55 96 C 60 96 63.5 92 62 86 C 60 78 55 58 55 58 Z"/>',
  // paus: três círculos + haste
  c:
    '<circle cx="50" cy="27" r="19"/>' +
    '<circle cx="29" cy="58" r="19"/>' +
    '<circle cx="71" cy="58" r="19"/>' +
    '<path d="M45 56 L 55 56 L 68 90 C 69.5 95 66 97 62 95 L 50 89 L 38 95 C 34 97 30.5 95 32 90 Z"/>',
};

/**
 * Desenha um naipe vetorial.
 * @param suit  objeto do naipe
 * @param cx    centro X em pixels
 * @param cy    centro Y em pixels
 * @param size  lado do quadrado do naipe em pixels
 * @param flip  true = naipe de cabeça para baixo (metade inferior da carta)
 */
function pip(suit, cx, cy, size, color, flip = false) {
  const s = size / 100;
  const rot = flip ? ` rotate(180 ${(size / 2).toFixed(2)} ${(size / 2).toFixed(2)})` : '';
  return (
    `<g transform="translate(${(cx - size / 2).toFixed(2)},${(cy - size / 2).toFixed(2)}) scale(${s.toFixed(4)})">` +
    `<g transform="${rot}"><g fill="${color}">${SUIT_PATHS[suit.key]}</g></g>` +
    `</g>`
  );
}

/** Layout clássico de naipes das cartas numeradas (2..10) e do Ás */
function pipLayout(rank, suit) {
  const col = suit.color;
  const L = 0.29;
  const R = 0.71;
  const C = 0.5;
  const t = 0.19, u = 0.32, m = 0.5, l = 0.68, b = 0.81;
  const size = rank === 'a' ? 104 : rank === 't' ? 40 : rank === '9' ? 42 : 46;
  const out = [];

  const put = (x, y) => out.push(pip(suit, x * CARD_W, y * CARD_H, size, col, y > m));

  if (rank === 'a') {
    out.push(pip(suit, C * CARD_W, 0.5 * CARD_H, size, col));
    // ornamentos do ás
    out.push(
      `<circle cx="${C * CARD_W}" cy="${0.5 * CARD_H}" r="66" fill="none" stroke="${col}" stroke-opacity="0.16" stroke-width="2"/>`,
    );
    return out.join('');
  }
  if (rank === '2') [ [C, t], [C, b] ].forEach(([x, y]) => put(x, y));
  if (rank === '3') [ [C, t], [C, m], [C, b] ].forEach(([x, y]) => put(x, y));
  if (rank === '4') [ [L, t], [R, t], [L, b], [R, b] ].forEach(([x, y]) => put(x, y));
  if (rank === '5') [ [L, t], [R, t], [C, m], [L, b], [R, b] ].forEach(([x, y]) => put(x, y));
  if (rank === '6') [ [L, t], [R, t], [L, m], [R, m], [L, b], [R, b] ].forEach(([x, y]) => put(x, y));
  if (rank === '7') [ [L, t], [R, t], [C, u], [L, m], [R, m], [L, b], [R, b] ].forEach(([x, y]) => put(x, y));
  if (rank === '8') [ [L, t], [R, t], [C, u], [L, m], [R, m], [C, l], [L, b], [R, b] ].forEach(([x, y]) => put(x, y));
  if (rank === '9') [ [L, t], [R, t], [L, u], [R, u], [C, m], [L, l], [R, l], [L, b], [R, b] ].forEach(([x, y]) => put(x, y));
  if (rank === 't') [ [L, t], [R, t], [C, 0.255], [L, u], [R, u], [L, l], [R, l], [C, 0.745], [L, b], [R, b] ].forEach(([x, y]) => put(x, y));
  return out.join('');
}

/** Cartas de figura (J/Q/K): design espelhado com moldura ornamental */
function courtFace(rank, suit) {
  const label = rank === 'j' ? 'J' : rank === 'q' ? 'Q' : 'K';
  const col = suit.color;
  const inner = { x: 26, y: 26, w: CARD_W - 52, h: CARD_H - 52 };

  const ornament = (flip) => {
    const transform = flip ? ` transform="rotate(180 ${CARD_W / 2} ${CARD_H / 2})"` : '';
    return `<g${transform}>
      ${pip(suit, CARD_W / 2, flip ? 144 : 118, 36, col)}
      <text x="${CARD_W / 2}" y="${flip ? 118 : 190}" text-anchor="middle" font-family="DejaVu Serif" font-weight="bold" font-size="74" fill="${col}">${label}</text>
    </g>`;
  };

  return `
    <rect x="${inner.x}" y="${inner.y}" width="${inner.w}" height="${inner.h}" rx="10"
          fill="${col}" fill-opacity="0.06" stroke="${col}" stroke-opacity="0.45" stroke-width="2"/>
    <rect x="${inner.x + 9}" y="${inner.y + 9}" width="${inner.w - 18}" height="${inner.h - 18}" rx="6"
          fill="none" stroke="${col}" stroke-opacity="0.25" stroke-width="1"/>
    <circle cx="${inner.x + 9}" cy="${inner.y + 9}" r="3.2" fill="${col}" fill-opacity="0.5"/>
    <circle cx="${inner.x + inner.w - 9}" cy="${inner.y + 9}" r="3.2" fill="${col}" fill-opacity="0.5"/>
    <circle cx="${inner.x + 9}" cy="${inner.y + inner.h - 9}" r="3.2" fill="${col}" fill-opacity="0.5"/>
    <circle cx="${inner.x + inner.w - 9}" cy="${inner.y + inner.h - 9}" r="3.2" fill="${col}" fill-opacity="0.5"/>
    ${ornament(false)}
    ${ornament(true)}
    <line x1="${inner.x + 34}" y1="${CARD_H / 2}" x2="${inner.x + inner.w - 34}" y2="${CARD_H / 2}" stroke="${col}" stroke-opacity="0.3" stroke-width="1.4"/>
    <circle cx="${CARD_W / 2}" cy="${CARD_H / 2}" r="7" fill="#fff" stroke="${col}" stroke-opacity="0.5" stroke-width="1.4"/>
    <circle cx="${CARD_W / 2}" cy="${CARD_H / 2}" r="2.6" fill="${col}" fill-opacity="0.75"/>
  `;
}

function cardSvg(rank, suit) {
  const col = suit.color;
  const label = rank.label;
  const face = ['j', 'q', 'k'].includes(rank.key) ? courtFace(rank, suit) : pipLayout(rank.key, suit);
  const rankSize = label === '10' ? 34 : 40;
  const corner = `
    <g>
      <text x="17" y="45" font-family="DejaVu Sans" font-weight="bold" font-size="${rankSize}" fill="${col}">${esc(label)}</text>
      ${pip(suit, 28, 66, 24, col)}
    </g>
    <g transform="rotate(180 ${CARD_W / 2} ${CARD_H / 2})">
      <text x="17" y="45" font-family="DejaVu Sans" font-weight="bold" font-size="${rankSize}" fill="${col}">${esc(label)}</text>
      ${pip(suit, 28, 66, 24, col)}
    </g>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <linearGradient id="paper" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff"/>
      <stop offset="100%" stop-color="#f1f3f6"/>
    </linearGradient>
  </defs>
  <rect x="1.5" y="1.5" width="${CARD_W - 3}" height="${CARD_H - 3}" rx="16" fill="url(#paper)" stroke="#c9ccd4" stroke-width="3"/>
  <rect x="8" y="8" width="${CARD_W - 16}" height="${CARD_H - 16}" rx="11" fill="none" stroke="${col}" stroke-opacity="0.16" stroke-width="1.5"/>
  ${face}
  ${corner}
</svg>`;
}

function backSvg() {
  const pattern = [];
  for (let i = -CARD_H; i < CARD_W + CARD_H; i += 14) {
    pattern.push(`<line x1="${i}" y1="0" x2="${i + CARD_H}" y2="${CARD_H}" stroke="#ffffff" stroke-opacity="0.10" stroke-width="5"/>`);
    pattern.push(`<line x1="${i + CARD_H}" y1="0" x2="${i}" y2="${CARD_H}" stroke="#000000" stroke-opacity="0.10" stroke-width="5"/>`);
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_W}" height="${CARD_H}" viewBox="0 0 ${CARD_W} ${CARD_H}">
  <defs>
    <linearGradient id="back" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#1d4ed8"/>
      <stop offset="55%" stop-color="#7f1d1d"/>
      <stop offset="100%" stop-color="#111827"/>
    </linearGradient>
    <clipPath id="clipBack"><rect x="10" y="10" width="${CARD_W - 20}" height="${CARD_H - 20}" rx="10"/></clipPath>
  </defs>
  <rect x="1.5" y="1.5" width="${CARD_W - 3}" height="${CARD_H - 3}" rx="16" fill="#f8fafc" stroke="#c9ccd4" stroke-width="3"/>
  <rect x="10" y="10" width="${CARD_W - 20}" height="${CARD_H - 20}" rx="10" fill="url(#back)"/>
  <g clip-path="url(#clipBack)">${pattern.join('')}</g>
  <rect x="18" y="18" width="${CARD_W - 36}" height="${CARD_H - 36}" rx="8" fill="none" stroke="#fde68a" stroke-opacity="0.75" stroke-width="2"/>
  <circle cx="${CARD_W / 2}" cy="${CARD_H / 2}" r="34" fill="#0b1220" fill-opacity="0.35" stroke="#fde68a" stroke-opacity="0.8" stroke-width="2"/>
  <text x="${CARD_W / 2}" y="${CARD_H / 2 + 16}" text-anchor="middle" font-family="DejaVu Serif" font-weight="bold" font-size="40" fill="#fde68a">L</text>
</svg>`;
}

// ------------------------------------------------------------------ geração
async function main() {
  mkdirSync(OUT, { recursive: true });

  const files = [];
  const atlasFrames = {};

  const backBuf = await sharp(Buffer.from(backSvg())).png({ compressionLevel: 9 }).toBuffer();
  writeFileSync(resolve(OUT, 'back.png'), backBuf);
  files.push('back.png');

  const jobs = [];
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      jobs.push({ rank, suit, name: `${rank.key}${suit.key}.png` });
    }
  }

  const buffers = {};
  for (const { rank, suit, name } of jobs) {
    const buf = await sharp(Buffer.from(cardSvg(rank, suit))).png({ compressionLevel: 9 }).toBuffer();
    writeFileSync(resolve(OUT, name), buf);
    buffers[name] = buf;
    files.push(name);
  }

  // sprite atlas: 13 colunas (2..A) x 4 linhas (espadas, copas, ouros, paus)
  const composite = [];
  let i = 0;
  for (const suit of SUITS) {
    for (const rank of RANKS) {
      const name = `${rank.key}${suit.key}.png`;
      const col = i % 13;
      const row = Math.floor(i / 13);
      composite.push({ input: buffers[name], left: col * CARD_W, top: row * CARD_H });
      atlasFrames[`${rank.key}${suit.key}`] = { x: col * CARD_W, y: row * CARD_H, w: CARD_W, h: CARD_H };
      i += 1;
    }
  }

  await sharp({
    create: { width: 13 * CARD_W, height: 4 * CARD_H, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite(composite)
    .png({ compressionLevel: 9 })
    .toFile(resolve(OUT, 'atlas.png'));

  writeFileSync(
    resolve(OUT, 'atlas.json'),
    JSON.stringify(
      {
        image: 'atlas.png',
        cardWidth: CARD_W,
        cardHeight: CARD_H,
        columns: 13,
        rows: 4,
        suits: SUITS.map((s) => s.key),
        ranks: RANKS.map((r) => r.key),
        frames: atlasFrames,
      },
      null,
      2,
    ),
  );

  console.log(`✔ ${files.length + 2} arquivos gerados em public/cards (atlas 13x4 de ${13 * CARD_W}x${4 * CARD_H})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
