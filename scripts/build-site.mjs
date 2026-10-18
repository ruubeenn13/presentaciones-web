// npm run build-site
// Monta _site/ para GitHub Pages: cada deck en /<deck>/ (index.html, assets/ y PDF)
// y en la raíz el índice de site/ con la lista de decks.
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT, DECKS } from './lib/deck.mjs';

const site = join(ROOT, '_site');
const repo = process.env.GITHUB_REPOSITORY
  ? `https://github.com/${process.env.GITHUB_REPOSITORY}`
  : 'https://github.com/';
const mes = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric', timeZone: 'UTC' });
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

rmSync(site, { recursive: true, force: true });
cpSync(join(ROOT, 'site'), site, { recursive: true });

const decks = readdirSync(DECKS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && existsSync(join(DECKS, d.name, 'index.html')))
  .map((d) => d.name)
  .sort()
  .reverse();

const items = decks.map((name) => {
  const src = join(DECKS, name);
  const dest = join(site, name);
  mkdirSync(dest);
  cpSync(join(src, 'index.html'), join(dest, 'index.html'));
  if (existsSync(join(src, 'assets'))) cpSync(join(src, 'assets'), join(dest, 'assets'), { recursive: true });
  const pdf = existsSync(join(src, `${name}.pdf`));
  if (pdf) cpSync(join(src, `${name}.pdf`), join(dest, `${name}.pdf`));

  const html = readFileSync(join(src, 'index.html'), 'utf8');
  const title = html.match(/<title>([^<]*)<\/title>/i)?.[1].trim() || name;
  const [y, m] = name.split('-').map(Number);
  const fecha = mes.format(new Date(Date.UTC(y, m - 1)));
  return `
      <li><a href="./${name}/">
        <span class="title">${esc(title)}</span>
        <span class="meta"><time datetime="${name.slice(0, 7)}">${fecha}</time>${pdf ? '<span class="pdf">con PDF</span>' : ''}</span>
      </a></li>`;
});

const index = readFileSync(join(ROOT, 'site', 'index.html'), 'utf8')
  .replace('<!--DECKS-->', items.join('') || '<li class="empty">Aún no hay ninguna publicada.</li>')
  .replace('<!--COUNT-->', decks.length === 0 ? '' : decks.length === 1 ? '1 publicada.' : `${decks.length} publicadas.`)
  .replace('<!--REPO-->', repo);
writeFileSync(join(site, 'index.html'), index);
console.log(`✓ _site/ con ${decks.length} decks`);
