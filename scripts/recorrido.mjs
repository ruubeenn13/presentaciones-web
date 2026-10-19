// npm run recorrido -- <deck>
// Graba un recorrido completo del deck con movimiento normal, avanzando con la barra espaciadora
// como al presentar, en decks/<deck>/renders/recorrido[-<variante>].webm (ignorado por git).
// Sirve para revisar transiciones y vídeos, que render y pdf no ven (usan movimiento reducido).
//   PAUSA=6            segundos en cada escena (por defecto, 6)
//   PAUSAS=6,6,24,...  segundos por escena, para quedarse hasta un momento concreto de un vídeo
//   TAMANO=1366x768    tamaño de la página (por defecto, 1920x1080)
//   VENTANA=1          ventana normal del navegador, con sus barras (la página queda más baja)
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { resolveDeck, prepararDeck, serve, WIDTH, HEIGHT } from './lib/deck.mjs';

const PAUSA = Number(process.env.PAUSA ?? 6);
const PAUSAS = (process.env.PAUSAS ?? '').split(',').filter(Boolean).map(Number);
const [ancho, alto] = (process.env.TAMANO ?? `${WIDTH}x${HEIGHT}`).split('x').map(Number);
const ventana = process.env.VENTANA === '1';
const variante = [PAUSAS.length && 'momentos', ventana && 'ventana', process.env.TAMANO && `${ancho}x${alto}`].filter(Boolean).join('-');

const deckDir = resolveDeck(process.argv[2]);
const out = join(deckDir, 'renders');
const tmp = join(out, '.video');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const { url, close } = await serve(prepararDeck(deckDir));
const args = ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle'];
if (ventana) args.push(`--window-size=${ancho},${alto}`);
const browser = await chromium.launch({ headless: !ventana, args });
const context = await browser.newContext({
  // Con ventana, la página mide lo que deja el navegador (sin pestañas ni barra de direcciones).
  viewport: ventana ? null : { width: ancho, height: alto },
  recordVideo: { dir: tmp, size: { width: ancho, height: alto } },
});
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const total = await page.locator('.slide').count();
const ultima = () => page.evaluate(() => document.querySelector('.slide:last-of-type')?.classList.contains('active'));
const vista = await page.evaluate(() => `${innerWidth}x${innerHeight}`);

const activa = () => page.evaluate(() => [...document.querySelectorAll('.slide')].findIndex((s) => s.classList.contains('active')));
const pausa = async () => page.waitForTimeout((PAUSAS[await activa()] ?? PAUSA) * 1000);
await page.waitForTimeout(2000);
// La primera tecla puede lanzar una entrada en vez de avanzar: se sigue hasta que la última escena esté activa.
for (let i = 0; i < total * 2 && !(await ultima()); i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(3200);
  await pausa();
}
await pausa();
await context.close();
await browser.close();
close();

const [video] = readdirSync(tmp);
const file = join(out, `recorrido${variante ? `-${variante}` : ''}.webm`);
rmSync(file, { force: true });
renameSync(join(tmp, video), file);
rmSync(tmp, { recursive: true, force: true });
console.log(`✓ ${total} escenas, página de ${vista} → ${file}`);
