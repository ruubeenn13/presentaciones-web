// Utilidades compartidas por render.mjs y pdf.mjs: localizar el deck,
// servirlo por HTTP y capturar cada diapositiva a 1920x1080 con Playwright.
import { spawnSync } from 'node:child_process';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { existsSync, readdirSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

export const ROOT = resolve(fileURLToPath(import.meta.url), '..', '..', '..');
export const DECKS = join(ROOT, 'decks');
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** 1 pt = 2 px en una diapositiva de 13,33 in a 1920 px de ancho. */
const PX_PER_PT = WIDTH / (13.333 * 72);

const MIME = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript',
  '.mjs': 'text/javascript', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp',
  '.avif': 'image/avif', '.gif': 'image/gif', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.otf': 'font/otf', '.mp4': 'video/mp4', '.webm': 'video/webm',
};

/**
 * Resuelve el nombre de un deck (carpeta en decks/) o una ruta relativa a la raíz a su ruta absoluta.
 * @param {string|undefined} name nombre de la carpeta, p. ej. "2026-10-tema", o ruta como "docs/ejemplo"
 * @returns {string} ruta absoluta del deck
 */
export function resolveDeck(name) {
  if (!name) {
    const decks = readdirSync(DECKS).filter((d) => !d.startsWith('_'));
    fail(`Indica el deck. Disponibles: ${decks.join(', ') || '(ninguno)'}`);
  }
  const asPath = resolve(ROOT, name);
  const dir = existsSync(join(asPath, 'index.html'))
    ? asPath
    : join(DECKS, name.replace(/^decks[\\/]/, '').replace(/[\\/]$/, ''));
  if (!existsSync(join(dir, 'index.html'))) fail(`No existe ${join(dir, 'index.html')}`);
  return dir;
}

export function fail(msg) {
  console.error(`✖ ${msg}`);
  process.exit(1);
}

/** Un deck web es un proyecto con package.json (Vite): se presenta desde su versión construida en dist/. */
/**
 * Ejecuta npm en un directorio (en Windows, npm es un .cmd y necesita la shell).
 * @param {string} cwd directorio
 * @param {string[]} args argumentos de npm
 */
export function npmEn(cwd, args) {
  return process.platform === 'win32'
    ? spawnSync(`npm ${args.join(' ')}`, { cwd, stdio: 'inherit', shell: true })
    : spawnSync('npm', args, { cwd, stdio: 'inherit' });
}

export const esWeb = (deckDir) => existsSync(join(deckDir, 'package.json'));

/**
 * Devuelve el directorio que hay que servir. Para un deck web, instala sus dependencias si faltan
 * y lo construye (npm run build), para que render, pdf y presentar usen siempre la versión publicada.
 * @param {string} deckDir ruta absoluta del deck
 * @returns {string} deckDir, o deckDir/dist si es un deck web
 */
export function prepararDeck(deckDir) {
  if (!esWeb(deckDir)) return deckDir;
  const npm = (args) => {
    const r = npmEn(deckDir, args);
    if (r.status !== 0) fail(`npm ${args.join(' ')} falló en ${deckDir}`);
  };
  if (!existsSync(join(deckDir, 'node_modules'))) npm(['ci', '--ignore-scripts']); // sin descargar ffmpeg: solo hace falta para editar tomas
  npm(['run', 'build', '--silent']);
  return join(deckDir, 'dist');
}

/**
 * Sirve un directorio por HTTP (rutas relativas y fuentes locales funcionan igual que en Pages).
 * Atiende peticiones Range para que los vídeos se puedan reproducir y saltar como en Pages.
 * @param {string} dir directorio raíz
 * @param {number} [port] puerto fijo; por defecto, uno libre
 * @returns {Promise<{url: string, close: () => void}>}
 */
export async function serve(root, port = 0) {
  const dir = resolve(root);
  const server = createServer(async (req, res) => {
    try {
      let path = join(dir, decodeURIComponent(new URL(req.url, 'http://x').pathname));
      if (!path.startsWith(dir + sep) && path !== dir) throw new Error('fuera');
      if ((await stat(path)).isDirectory()) path = join(path, 'index.html');
      const type = MIME[extname(path).toLowerCase()] ?? 'application/octet-stream';
      const body = await readFile(path);
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
      if (range) {
        const start = range[1] ? Number(range[1]) : body.length - Number(range[2]);
        const end = range[1] && range[2] ? Math.min(Number(range[2]), body.length - 1) : body.length - 1;
        res.writeHead(206, {
          'Content-Type': type, 'Accept-Ranges': 'bytes',
          'Content-Range': `bytes ${start}-${end}/${body.length}`, 'Content-Length': end - start + 1,
        });
        res.end(body.subarray(start, end + 1));
        return;
      }
      res.writeHead(200, { 'Content-Type': type, 'Accept-Ranges': 'bytes', 'Content-Length': body.length });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });
  await new Promise((ok) => server.listen(port, '127.0.0.1', ok));
  return { url: `http://127.0.0.1:${server.address().port}/`, close: () => server.close() };
}

/**
 * Abre el deck y entrega cada diapositiva activada al callback, junto con sus incidencias de maquetación.
 * @param {string} deckDir ruta absoluta del deck
 * @param {(page: import('playwright').Page, index: number, issues: object) => Promise<void>} onSlide
 * @returns {Promise<number>} número de diapositivas
 */
export async function eachSlide(deckDir, onSlide) {
  const { url, close } = await serve(prepararDeck(deckDir));
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: WIDTH, height: HEIGHT } });
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    const total = await page.locator('.slide').count();
    if (total === 0) fail('No hay elementos .slide en index.html');

    for (let i = 0; i < total; i++) {
      await page.evaluate((idx) => {
        document.querySelectorAll('.slide').forEach((s, n) => {
          s.classList.toggle('active', n === idx);
          s.classList.toggle('visible', n === idx);
        });
        document.querySelectorAll('.slide')[idx]
          .querySelectorAll('.reveal')
          .forEach((el) => el.classList.add('visible'));
      }, i);
      await page.waitForTimeout(700);
      const issues = await page.evaluate(inspectSlide, { idx: i, minPx: 24 * PX_PER_PT });
      await onSlide(page, i, issues);
    }
    return total;
  } finally {
    await browser.close();
    close();
  }
}

/** Se ejecuta en el navegador: busca desbordes, texto cortado, solapes y texto < 24 pt. */
function inspectSlide({ idx, minPx }) {
  const slide = document.querySelectorAll('.slide')[idx];
  const box = slide.getBoundingClientRect();
  const visible = (el) => {
    const cs = getComputedStyle(el);
    return cs.visibility !== 'hidden' && cs.display !== 'none' && Number(cs.opacity) > 0;
  };
  const texts = [...slide.querySelectorAll('*')].filter((el) =>
    visible(el) && [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()));
  const label = (el) => `<${el.tagName.toLowerCase()}> «${el.textContent.trim().slice(0, 40)}»`;
  const scale = box.width / slide.offsetWidth || 1;
  const out = { overflow: [], clipped: [], overlap: [], small: [] };

  for (const el of texts) {
    const range = document.createRange();
    range.selectNodeContents(el);
    const r = range.getBoundingClientRect();
    if (r.left < box.left - 1 || r.top < box.top - 1 || r.right > box.right + 1 || r.bottom > box.bottom + 1)
      out.overflow.push(label(el));
    if (el.scrollWidth > el.clientWidth + 1 && getComputedStyle(el).overflowX !== 'visible'
      || el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY !== 'visible')
      out.clipped.push(label(el));
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (px < minPx - 0.5) out.small.push(`${label(el)} ${Math.round((px * 24) / minPx)} pt`);
  }
  for (let a = 0; a < texts.length; a++) {
    for (let b = a + 1; b < texts.length; b++) {
      if (texts[a].contains(texts[b]) || texts[b].contains(texts[a])) continue;
      const p = texts[a].getBoundingClientRect(), q = texts[b].getBoundingClientRect();
      const w = Math.min(p.right, q.right) - Math.max(p.left, q.left);
      const h = Math.min(p.bottom, q.bottom) - Math.max(p.top, q.top);
      if (w > 2 * scale && h > 2 * scale) out.overlap.push(`${label(texts[a])} ↔ ${label(texts[b])}`);
    }
  }
  return out;
}
