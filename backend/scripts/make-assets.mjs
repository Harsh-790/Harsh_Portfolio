/**
 * Asset generator â€” creates the monochrome "figure plates" that ship with the
 * demo content (project covers, gallery plates, profile portrait, certificates).
 *
 * They are plain SVG files so the seed data never depends on the network, and
 * they are deliberately designed (not random noise) so the empty portfolio still
 * looks like an editorial data-science publication.
 *
 *   npm run assets
 *
 * Replace any of them from the admin panel at /admin/media.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = join(here, '..', '..', 'frontend', 'public', 'uploads', 'seed');
mkdirSync(OUT, { recursive: true });

/* deterministic pseudo random so every run produces identical files */
function rng(seed) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

const PALETTES = {
  light: { bg: '#F4F4F1', ink: '#131313', mid: '#6E6E68', soft: '#C9C9C2', line: '#DCDCD5' },
  paper: { bg: '#FAFAF8', ink: '#141414', mid: '#75756E', soft: '#D2D2CB', line: '#E4E4DE' },
  dark: { bg: '#101011', ink: '#F3F2EF', mid: '#8C8C86', soft: '#2E2E31', line: '#26262A' },
};

const MONO = "ui-monospace, 'JetBrains Mono', 'SFMono-Regular', Menlo, Consolas, monospace";

/* â”€â”€ figure bodies â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function scatter(w, h, c, rnd) {
  const out = [];
  const pad = 90;
  for (let i = 0; i < 150; i++) {
    const x = pad + rnd() * (w - pad * 2);
    const y = pad + rnd() * (h - pad * 2);
    const cls = rnd();
    const r = 2 + rnd() * 3.4;
    out.push(
      `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" fill="${cls > 0.55 ? c.ink : c.mid}" opacity="${(0.25 + rnd() * 0.55).toFixed(2)}"/>`,
    );
  }
  // decision boundary
  let d = `M ${pad} ${h * 0.72}`;
  for (let x = pad; x <= w - pad; x += (w - pad * 2) / 8) {
    d += ` Q ${x + 40} ${h * 0.72 - Math.sin(x / 90) * 130} ${x + (w - pad * 2) / 8} ${h * 0.66}`;
  }
  return `${out.join('')}<path d="${d}" fill="none" stroke="${c.ink}" stroke-width="2.4" stroke-dasharray="12 8"/><g opacity=".9">${grid(w, h, c)}</g>`;
}

function grid(w, h, c) {
  const out = [];
  for (let x = 90; x < w; x += (w - 180) / 6) out.push(`<line x1="${x}" y1="60" x2="${x}" y2="${h - 60}" stroke="${c.line}" stroke-width="1"/>`);
  for (let y = 90; y < h; y += (h - 180) / 5) out.push(`<line x1="60" y1="${y}" x2="${w - 60}" y2="${y}" stroke="${c.line}" stroke-width="1"/>`);
  return out.join('');
}

function forecast(w, h, c, rnd) {
  const pad = 90;
  const pts = [];
  let y = h * 0.66;
  for (let i = 0; i <= 13; i++) {
    y -= (rnd() - 0.35) * 46;
    y = Math.min(Math.max(y, pad), h - pad);
    pts.push([pad + (i * (w - pad * 2)) / 13, y]);
  }
  const line = pts.map((p, i) => `${i ? 'L' : 'M'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ');
  const band = `${line} L ${pts[pts.length - 1][0]} ${h - pad} L ${pts[0][0]} ${h - pad} Z`;
  const bars = pts
    .map((p, i) => `<rect x="${(p[0] - 9).toFixed(1)}" y="${(p[1] + 26).toFixed(1)}" width="18" height="${(h - pad - p[1] - 26).toFixed(1)}" fill="${c.soft}" opacity="${(0.35 + (i % 3) * 0.18).toFixed(2)}"/>`)
    .join('');
  return `${grid(w, h, c)}${bars}<path d="${band}" fill="${c.ink}" opacity=".06"/><path d="${line}" fill="none" stroke="${c.ink}" stroke-width="3" stroke-linejoin="round"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="7" fill="${c.ink}"/><circle cx="${pts[pts.length - 1][0]}" cy="${pts[pts.length - 1][1]}" r="15" fill="none" stroke="${c.ink}" stroke-width="1.4" opacity=".5"/>`;
}

function heat(w, h, c, rnd) {
  const cols = 9;
  const rows = 6;
  const cw = (w - 180) / cols;
  const ch = (h - 180) / rows;
  let out = '';
  for (let r = 0; r < rows; r++) {
    for (let q = 0; q < cols; q++) {
      const v = rnd();
      out += `<rect x="${90 + q * cw + 3}" y="${90 + r * ch + 3}" width="${cw - 6}" height="${ch - 6}" fill="${c.ink}" opacity="${(v * 0.82 + 0.05).toFixed(2)}"/>`;
    }
  }
  return out;
}

function contours(w, h, c, rnd) {
  let out = '';
  for (let i = 0; i < 11; i++) {
    const k = i / 11;
    const d = [];
    for (let x = 0; x <= 10; x++) {
      const px = 70 + (x * (w - 140)) / 10;
      const amp = 120 * (1 - k) + 26;
      const py = h / 2 + Math.sin((x / 10) * Math.PI * (1.1 + k) + k * 4) * amp * (0.55 + rnd() * 0.1) + (k - 0.5) * 120;
      d.push(`${x ? 'L' : 'M'} ${px.toFixed(1)} ${py.toFixed(1)}`);
    }
    out += `<path d="${d.join(' ')}" fill="none" stroke="${c.ink}" stroke-width="${(2.6 - k * 1.7).toFixed(2)}" opacity="${(0.85 - k * 0.55).toFixed(2)}"/>`;
  }
  return out;
}

function network(w, h, c, rnd) {
  const nodes = [];
  for (let i = 0; i < 26; i++) nodes.push([110 + rnd() * (w - 220), 110 + rnd() * (h - 220), 6 + rnd() * 13]);
  let edges = '';
  nodes.forEach((a, i) => {
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j];
      const dist = Math.hypot(a[0] - b[0], a[1] - b[1]);
      if (dist < 210) edges += `<line x1="${a[0].toFixed(1)}" y1="${a[1].toFixed(1)}" x2="${b[0].toFixed(1)}" y2="${b[1].toFixed(1)}" stroke="${c.mid}" stroke-width="1" opacity="${(0.5 - dist / 520).toFixed(2)}"/>`;
    }
  });
  const dots = nodes.map((n, i) => `<circle cx="${n[0].toFixed(1)}" cy="${n[1].toFixed(1)}" r="${n[2].toFixed(1)}" fill="${i % 4 === 0 ? c.ink : c.bg}" stroke="${c.ink}" stroke-width="2"/>`).join('');
  return `${edges}${dots}`;
}

function spectrum(w, h, c, rnd) {
  const n = 64;
  const bw = (w - 180) / n;
  let out = '';
  for (let i = 0; i < n; i++) {
    const env = Math.sin((i / n) * Math.PI) ** 0.7;
    const peak = rnd() ** 2;
    const bh = (h - 200) * env * (0.18 + peak * 0.82);
    out += `<rect x="${(90 + i * bw + 1.6).toFixed(1)}" y="${((h - 90 - bh) / 1).toFixed(1)}" width="${(bw - 3.2).toFixed(1)}" height="${bh.toFixed(1)}" fill="${c.ink}" opacity="${(0.18 + peak * 0.7).toFixed(2)}"/>`;
  }
  return `${out}<line x1="90" y1="${h - 90}" x2="${w - 90}" y2="${h - 90}" stroke="${c.ink}" stroke-width="1.6"/>`;
}

function matrix(w, h, c, rnd) {
  const cells = [
    [52, 8, 3, 1],
    [6, 44, 2, 3],
    [2, 4, 38, 9],
    [1, 2, 11, 41],
  ];
  const gx = 150;
  const gy = 130;
  const size = Math.min(w - gx * 2, h - gy * 2);
  const cs = size / 4;
  let out = '';
  for (let r = 0; r < 4; r++) {
    for (let q = 0; q < 4; q++) {
      const v = cells[r][q] / 56;
      out += `<rect x="${gx + q * cs}" y="${gy + r * cs}" width="${cs}" height="${cs}" fill="${c.ink}" opacity="${(0.06 + v * 0.9).toFixed(2)}" stroke="${c.bg}" stroke-width="2"/>`;
      out += `<text x="${gx + q * cs + cs / 2}" y="${gy + r * cs + cs / 2 + 7}" font-family="${MONO}" font-size="19" text-anchor="middle" fill="${v > 0.35 ? c.bg : c.ink}" opacity="${(0.55 + v * 0.45).toFixed(2)}">${cells[r][q]}</text>`;
    }
  }
  for (let i = 0; i < 4; i++) {
    out += `<text x="${gx + i * cs + cs / 2}" y="${gy - 22}" font-family="${MONO}" font-size="15" text-anchor="middle" fill="${c.mid}">${['C0', 'C1', 'C2', 'C3'][i]}</text>`;
    out += `<text x="${gx - 24}" y="${gy + i * cs + cs / 2 + 5}" font-family="${MONO}" font-size="15" text-anchor="end" fill="${c.mid}">${['P0', 'P1', 'P2', 'P3'][i]}</text>`;
  }
  void rnd;
  return out;
}

function ranking(w, h, c, rnd) {
  const n = 7;
  const labels = ['AGE', 'TENURE', 'PLAN', 'CALLS', 'SPEND', 'TICKETS', 'NPS'];
  const rows = [];
  for (let i = 0; i < n; i++) rows.push({ l: labels[i], v: 0.22 + rnd() * 0.78 });
  rows.sort((a, b) => b.v - a.v);
  const x0 = 250;
  let out = '';
  rows.forEach((r, i) => {
    const y = 110 + i * ((h - 200) / n);
    out += `<text x="${x0 - 26}" y="${y + 6}" font-family="${MONO}" font-size="17" text-anchor="end" fill="${c.mid}">${r.l}</text>`;
    out += `<rect x="${x0}" y="${y - 12}" width="${r.v * (w - x0 - 130)}" height="24" fill="${c.ink}" opacity="${(0.95 - i * 0.1).toFixed(2)}"/>`;
    out += `<text x="${x0 + r.v * (w - x0 - 130) + 14}" y="${y + 6}" font-family="${MONO}" font-size="15" fill="${c.mid}">${(r.v * 100).toFixed(1)}</text>`;
  });
  return out;
}

function bars(w, h, c, rnd) {
  const n = 22;
  const bw = (w - 200) / n;
  let out = '';
  for (let i = 0; i < n; i++) {
    const v = rnd();
    const bh = (h - 260) * (0.2 + v * 0.8);
    out += `<rect x="${(100 + i * bw + bw * 0.18).toFixed(1)}" y="${(h - 120 - bh).toFixed(1)}" width="${(bw * 0.64).toFixed(1)}" height="${bh.toFixed(1)}" fill="${i % 5 === 0 ? c.ink : c.mid}" opacity="${(0.35 + v * 0.6).toFixed(2)}"/>`;
  }
  return `${out}<line x1="100" y1="${h - 120}" x2="${w - 100}" y2="${h - 120}" stroke="${c.ink}" stroke-width="1.8"/>`;
}

/* â”€â”€ plate wrapper â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

function plate({ w, h, index, caption, sub, palette = 'light', figure, tick = true, inset = 34 }) {
  const c = PALETTES[palette];
  const body = figure(w, h, c);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img">
  <rect width="${w}" height="${h}" fill="${c.bg}"/>
  ${body}
  <rect x="${inset}" y="${inset}" width="${w - inset * 2}" height="${h - inset * 2}" fill="none" stroke="${c.line}" stroke-width="1.4"/>
  ${tick
      ? `<path d="M${inset} ${inset + 16} v-16 h16 M${w - inset - 16} ${inset} h16 v16 M${w - inset} ${h - inset - 16} v16 h-16 M${inset + 16} ${h - inset} h-16 v-16" fill="none" stroke="${c.mid}" stroke-width="1.6"/>`
      : ''}
  <text x="${inset + 26}" y="${inset + 46}" font-family="${MONO}" font-size="15" letter-spacing="2.6" fill="${c.mid}">${index}</text>
  <text x="${w - inset - 26}" y="${inset + 46}" font-family="${MONO}" font-size="15" letter-spacing="2.6" fill="${c.mid}" text-anchor="end">${sub}</text>
  <text x="${inset + 26}" y="${h - inset - 26}" font-family="${MONO}" font-size="16" letter-spacing="3.4" fill="${c.ink}">${caption}</text>
</svg>
`;
}

/* â”€â”€ the set â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */

const figures = [
  { fn: scatter, caption: 'CLASS PROBABILITY FIELD', index: 'FIG. 01', sub: 'XGBOOST / 0.947 AUC' },
  { fn: forecast, caption: '12-WEEK DEMAND FORECAST', index: 'FIG. 02', sub: 'MAPE 8.4%' },
  { fn: heat, caption: 'CORRELATION MATRIX', index: 'FIG. 03', sub: '42 FEATURES' },
  { fn: contours, caption: 'LOSS SURFACE PROJECTION', index: 'FIG. 04', sub: 'EPOCH 120' },
  { fn: network, caption: 'EMBEDDING SIMILARITY GRAPH', index: 'FIG. 05', sub: 'n = 128 DIM' },
  { fn: spectrum, caption: 'SIGNAL ENERGY PROFILE', index: 'FIG. 06', sub: '24 kHz' },
  { fn: matrix, caption: 'CONFUSION MATRIX', index: 'FIG. 07', sub: 'n = 240' },
  { fn: ranking, caption: 'FEATURE IMPORTANCE', index: 'FIG. 08', sub: 'GAIN / SPLIT' },
  { fn: bars, caption: 'PREDICTION DISTRIBUTION', index: 'FIG. 09', sub: 'BINS 22' },
];

figures.forEach((f, i) => {
  const palette = i % 4 === 3 ? 'dark' : i % 3 === 2 ? 'paper' : 'light';
  writeFileSync(
    join(OUT, `figure-${String(i + 1).padStart(2, '0')}.svg`),
    plate({ w: 1400, h: 1000, index: f.index, caption: f.caption, sub: f.sub, palette, figure: (w, h, c) => f.fn(w, h, c, rng(7717 + i * 913)) }),
  );
});

/* project detail screenshots â€” wider crops with different palettes */
const detailFigures = [heat, scatter, forecast, network, matrix, contours, bars, spectrum, ranking];
detailFigures.forEach((fn, i) => {
  writeFileSync(
    join(OUT, `detail-${String(i + 1).padStart(2, '0')}.svg`),
    plate({
      w: 1600,
      h: 900,
      index: `SHOT ${String(i + 1).padStart(2, '0')}`,
      caption: ['MODEL DIAGNOSTICS', 'PREDICTION FIELD', 'FORECAST OUTPUT', 'RETRIEVAL GRAPH', 'VALIDATION', 'ERROR SURFACE', 'CLASS BALANCE', 'FEATURE SIGNAL', 'ATTRIBUTION'][i],
      sub: `v1.${i}`,
      palette: i % 3 === 1 ? 'dark' : 'light',
      figure: (w, h, c) => fn(w, h, c, rng(4400 + i * 577)),
    }),
  );
});

/* gallery plates â€” mixed ratios for the masonry grid */
const gallerySpecs = [
  [1200, 1500, 'paper', contours, 'WORKSHOP / FEATURE ENGINEERING', 'GDG MEETUP', 'EVENT 01'],
  [1200, 900, 'dark', network, 'RAG PIPELINE REVIEW', 'TEAM SESSION', 'EVENT 02'],
  [1200, 1200, 'light', ranking, 'MODEL REVIEW BOARD', 'SPRINT 14', 'EVENT 03'],
  [1200, 800, 'paper', scatter, 'LECTURE / ML BASICS', 'CAMPUS TALK', 'EVENT 04'],
  [1200, 1400, 'light', spectrum, 'DATA COLLECTION WEEK', 'FIELD WORK', 'EVENT 05'],
  [1200, 900, 'dark', heat, 'DASHBOARD HANDOFF', 'OPS TEAM', 'EVENT 06'],
  [1200, 1100, 'paper', bars, 'NOTEBOOK REFACTOR', 'PAIRING DAY', 'EVENT 07'],
  [1200, 1300, 'light', forecast, 'FORECAST BRIEFING', 'Q3 REVIEW', 'EVENT 08'],
];
gallerySpecs.forEach(([w, h, palette, fn, caption, sub, index], i) => {
  writeFileSync(
    join(OUT, `gallery-${String(i + 1).padStart(2, '0')}.svg`),
    plate({ w, h, index, caption, sub, palette, figure: (W, H, c) => fn(W, H, c, rng(9100 + i * 331)) }),
  );
});

/* certificates â€” typographic plates */
const certs = [
  ['DEEP LEARNING SPECIALISATION', 'COURSERA / DEEPLEARNING.AI', '2024'],
  ['GOOGLE DATA ANALYTICS', 'GOOGLE CAREER CERTIFICATE', '2023'],
  ['AWS CERTIFIED ML SPECIALTY', 'AMAZON WEB SERVICES', '2025'],
];
certs.forEach(([title, org, year], i) => {
  const c = i === 1 ? PALETTES.dark : PALETTES.paper;
  writeFileSync(
    join(OUT, `certificate-${String(i + 1).padStart(2, '0')}.svg`),
    `<svg xmlns="http://www.w3.org/2000/svg" width="1400" height="1000" viewBox="0 0 1400 1000" role="img">
  <rect width="1400" height="1000" fill="${c.bg}"/>
  <rect x="46" y="46" width="1308" height="908" fill="none" stroke="${c.line}" stroke-width="1.6"/>
  <rect x="62" y="62" width="1276" height="876" fill="none" stroke="${c.line}" stroke-width="1"/>
  <text x="700" y="300" font-family="${MONO}" font-size="17" letter-spacing="6" fill="${c.mid}" text-anchor="middle">CERTIFICATE OF COMPLETION</text>
  <line x1="520" y1="348" x2="880" y2="348" stroke="${c.ink}" stroke-width="1.6"/>
  <text x="700" y="470" font-family="${MONO}" font-size="52" letter-spacing="3" fill="${c.ink}" text-anchor="middle">${title}</text>
  <text x="700" y="540" font-family="${MONO}" font-size="19" letter-spacing="4.5" fill="${c.mid}" text-anchor="middle">${org}</text>
  <text x="700" y="800" font-family="${MONO}" font-size="17" letter-spacing="4" fill="${c.mid}" text-anchor="middle">ISSUED ${year}</text>
  <path d="M110 850 h180 M1110 850 h180" stroke="${c.line}" stroke-width="1.4"/>
  <text x="110" y="890" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${c.mid}">ISSUING BODY</text>
  <text x="1290" y="890" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${c.mid}" text-anchor="end">CREDENTIAL ID</text>
</svg>
`,
  );
});

/* profile portrait â€” abstract editorial silhouette, replaceable from /admin/profile */
function portrait() {
  const c = PALETTES.paper;
  const r = rng(20260214);
  let halftone = '';
  for (let y = 120; y < 1080; y += 26) {
    for (let x = 90; x < 810; x += 26) {
      const d = Math.hypot((x - 450) / 420, (y - 640) / 520);
      const v = Math.max(0, 1 - d) * 0.85 + r() * 0.15;
      if (v > 0.18) halftone += `<circle cx="${x}" cy="${y}" r="${(1.1 + v * 2.6).toFixed(1)}" fill="${c.ink}" opacity="${(v * 0.4).toFixed(2)}"/>`;
    }
  }
  return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200" viewBox="0 0 900 1200" role="img">
  <rect width="900" height="1200" fill="${c.bg}"/>
  <g opacity=".55">${halftone}</g>
  <g fill="#2B2B2B">
    <path d="M450 300c78 0 140 62 140 140 0 46-14 78-30 108-22 42-46 84-46 138 0 0-64 26-128 0 0-54-24-96-46-138-16-30-30-62-30-108 0-78 62-140 140-140z" opacity=".92"/>
    <path d="M118 1200c0-176 92-306 226-352 44-15 78-24 106-24h1c28 0 62 9 106 24 134 46 226 176 226 352z" opacity=".92"/>
  </g>
  <rect x="322" y="418" width="256" height="58" rx="4" fill="#101010"/>
  <rect x="322" y="418" width="256" height="58" rx="4" fill="none" stroke="#545454" stroke-width="1.4"/>
  <path d="M118 1200c0-176 92-306 226-352" fill="none" stroke="#6E6E68" stroke-width="1.2"/>
  <rect x="34" y="34" width="832" height="1132" fill="none" stroke="${c.line}" stroke-width="1.4"/>
  <path d="M34 50 v-16 h16 M850 34 h16 v16 M866 1150 v16 h-16 M50 1166 h-16 v-16" fill="none" stroke="${c.mid}" stroke-width="1.6"/>
  <text x="60" y="80" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${c.mid}">PORTRAIT / 001</text>
  <text x="840" y="80" font-family="${MONO}" font-size="15" letter-spacing="3" fill="${c.mid}" text-anchor="end">REPLACE IN ADMIN</text>
  <text x="60" y="1150" font-family="${MONO}" font-size="16" letter-spacing="3.6" fill="${c.ink}">DATA SCIENTIST</text>
  <text x="840" y="1150" font-family="${MONO}" font-size="16" letter-spacing="3.6" fill="${c.ink}" text-anchor="end">2026</text>
</svg>
`;
}

writeFileSync(join(OUT, 'portrait.svg'), portrait());

/* placeholder rÃ©sumÃ© (real, openable one-page PDF â€” replace via /admin/profile) */
function resumePdf() {
  const W = 595.28;
  const H = 841.89;
  const ops = [];
  let y = H - 68;

  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
  const text = (s, size, x = 56, gap = 0, font = 'F1', color = 0.1) => {
    ops.push(`BT ${color} g /${font} ${size} Tf ${x} ${y.toFixed(2)} Td (${esc(s)}) Tj ET`);
    y -= size * 1.45 + gap;
  };
  const rule = (gap = 18) => {
    y += 8;
    ops.push(`0.75 w 0.82 G 56 ${y.toFixed(2)} m ${W - 56} ${y.toFixed(2)} l S`);
    y -= gap;
  };
  const label = (s) => {
    y -= 12;
    text(s, 8.5, 56, 10, 'F1', 0.45);
  };

  text('HARSH RAJ', 30, 56, 4, 'F2', 0);
  text('DATA SCIENTIST / AI & ML', 11, 56, 4, 'F1', 0.35);
  text('New Delhi, India  Â·  hello@harshraj.dev  Â·  github.com/harshraj', 9.5, 56, 6, 'F1', 0.35);
  rule(16);

  label('PROFILE');
  text('Data scientist with five years of practice across retail, healthcare and industrial data. Builds', 10);
  text('systems rather than reports: pipelines, evaluation harnesses, monitoring and dashboards.', 10, 56, 10);

  label('EXPERIENCE');
  text('Data Scientist â€” Northlane Analytics', 10.5, 56, 2, 'F2', 0);
  text('Mar 2024 â€” Present Â· New Delhi', 9, 56, 3, 'F1', 0.4);
  text('Rebuilt the churn label definition and shipped a nightly scoring service (+14% save rate).', 9.5, 68, 1, 'F1', 0.25);
  text('Set the team standard for model evaluation: rolling-origin validation and calibration checks.', 9.5, 68, 9, 'F1', 0.25);
  text('Machine Learning Engineer (Contract) â€” Kitewave Labs', 10.5, 56, 2, 'F2', 0);
  text('Jun 2023 â€” Feb 2024 Â· Remote', 9, 56, 3, 'F1', 0.4);
  text('Shipped hybrid retrieval over 12.4k documents with citation enforcement (88% accuracy).', 9.5, 68, 1, 'F1', 0.25);
  text('Built the evaluation harness that gated every release; cut compliance inbox volume by 61%.', 9.5, 68, 9, 'F1', 0.25);
  text('Data Analyst â†’ Analytics Lead â€” Metrocommerce Retail', 10.5, 56, 2, 'F2', 0);
  text('Jul 2022 â€” May 2023 Â· Gurugram', 9, 56, 3, 'F1', 0.4);
  text('Replaced a spreadsheet forecast with a global gradient-boosted model (MAPE 24% â†’ 8.4%).', 9.5, 68, 1, 'F1', 0.25);
  text('Led a three-person analytics team through the forecasting replacement project.', 9.5, 68, 9, 'F1', 0.25);
  text('Research Intern â€” IIT Delhi, Vision & Learning Lab', 10.5, 56, 2, 'F2', 0);
  text('Jan 2022 â€” Jun 2022 Â· New Delhi', 9, 56, 3, 'F1', 0.4);
  text('Contrastive pretraining pipeline: +9 points accuracy over a supervised baseline on 4k images.', 9.5, 68, 10, 'F1', 0.25);

  label('SKILLS');
  text('Python Â· SQL Â· Pandas Â· NumPy Â· Scikit-learn Â· XGBoost / LightGBM Â· PyTorch', 9.5, 56, 1, 'F1', 0.25);
  text('Computer vision Â· NLP & LLMs Â· Forecasting Â· Statistics Â· Docker Â· Airflow Â· MLflow Â· Power BI', 9.5, 56, 10, 'F1', 0.25);

  label('SELECTED METRICS');
  text('Churn classifier 94.7% accuracy Â· Defect detection 96% recall at 38 ms Â· Forecast MAPE 8.4%', 9.5, 56, 1, 'F1', 0.25);
  text('Document assistant 88% answer accuracy with citations on every response.', 9.5, 56, 10, 'F1', 0.25);

  label('EDUCATION');
  text('B.Tech, Computer Science & Engineering â€” Delhi Technological University (2020 â€” 2024)', 9.5, 56, 1, 'F1', 0.25);
  text('Deep Learning Specialisation (DeepLearning.AI) Â· Google Data Analytics Â· AWS ML Specialty', 9.5, 56, 8, 'F1', 0.25);

  const stream = ops.join('\n');
  const objs = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>',
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>',
    `<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objs.forEach((body, i) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objs.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objs.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objs.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, 'latin1');
}

writeFileSync(join(OUT, 'resume.pdf'), resumePdf());

console.log('Assets written to frontend/public/uploads/seed');
