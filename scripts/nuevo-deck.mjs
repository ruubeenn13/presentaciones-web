// npm run nuevo-deck -- "Tema del deck" [AAAA-MM]
// Copia decks/_plantilla a decks/<AAAA-MM>-<tema-en-slug>/. Por defecto usa el mes actual.
import { cpSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { DECKS, fail } from './lib/deck.mjs';

const [tema, fecha = new Date().toISOString().slice(0, 7)] = process.argv.slice(2);
if (!tema) fail('Uso: npm run nuevo-deck -- "Tema del deck" [AAAA-MM]');
if (!/^\d{4}-\d{2}$/.test(fecha)) fail(`Fecha inválida: ${fecha} (formato AAAA-MM)`);

const slug = tema
  .normalize('NFD').replace(/[̀-ͯ]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const dest = join(DECKS, `${fecha}-${slug}`);
if (existsSync(dest)) fail(`Ya existe ${dest}`);

cpSync(join(DECKS, '_plantilla'), dest, { recursive: true });
console.log(`✓ decks/${fecha}-${slug}/ creado. Empieza por brief.md.`);
