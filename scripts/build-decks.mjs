// npm run build-decks
// Construye los decks web (los que tienen package.json): npm ci (sin scripts de instalación, que
// solo descargan herramientas como ffmpeg) y npm run build en cada uno,
// para que build-site publique su dist/. Lo usa el workflow de Pages; vale igual en local.
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { DECKS, esWeb, fail, npmEn } from './lib/deck.mjs';

const decks = readdirSync(DECKS, { withFileTypes: true })
  .filter((d) => d.isDirectory() && !d.name.startsWith('_') && esWeb(join(DECKS, d.name)))
  .map((d) => d.name);

for (const name of decks) {
  const cwd = join(DECKS, name);
  for (const args of [existsSync(join(cwd, 'package-lock.json')) ? ['ci', '--ignore-scripts'] : ['install', '--ignore-scripts'], ['run', 'build']]) {
    const r = npmEn(cwd, args);
    if (r.status !== 0) fail(`npm ${args.join(' ')} falló en ${name}`);
  }
  console.log(`✓ ${name}/dist`);
}
if (decks.length === 0) console.log('No hay decks web que construir.');
