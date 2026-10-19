// npm run presentar -- <deck>
// Presenta un deck sin internet: construye la versión publicada si es un deck web, la sirve en
// http://127.0.0.1:4321/ y abre el navegador. Ctrl+C para terminar.
import { spawn } from 'node:child_process';
import { resolveDeck, prepararDeck, serve } from './lib/deck.mjs';

const PUERTO = 4321;
const deckDir = resolveDeck(process.argv[2]);
const { url } = await serve(prepararDeck(deckDir), PUERTO);

const abrir = { win32: ['cmd', ['/c', 'start', '', url]], darwin: ['open', [url]] }[process.platform]
  ?? ['xdg-open', [url]];
spawn(abrir[0], abrir[1], { stdio: 'ignore', detached: true }).unref();
console.log(`✓ Presentando en ${url} (sin internet). Ctrl+C para terminar.`);
