// npm run recorrido -- <deck>
// Graba un recorrido completo del deck a 1920x1080 con movimiento normal, avanzando con la barra
// espaciadora como al presentar, en decks/<deck>/renders/recorrido.webm (ignorado por git).
// Sirve para revisar transiciones y vídeos, que render y pdf no ven (usan movimiento reducido).
import { mkdirSync, readdirSync, renameSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { resolveDeck, prepararDeck, serve, WIDTH, HEIGHT } from './lib/deck.mjs';

/** Segundos en cada escena antes de pasar a la siguiente. */
const PAUSA = Number(process.env.PAUSA ?? 4);

const deckDir = resolveDeck(process.argv[2]);
const out = join(deckDir, 'renders');
const tmp = join(out, '.video');
rmSync(tmp, { recursive: true, force: true });
mkdirSync(tmp, { recursive: true });

const { url, close } = await serve(prepararDeck(deckDir));
const browser = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-gl=angle'] });
const context = await browser.newContext({
  viewport: { width: WIDTH, height: HEIGHT },
  recordVideo: { dir: tmp, size: { width: WIDTH, height: HEIGHT } },
});
const page = await context.newPage();
await page.goto(url, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
const total = await page.locator('.slide').count();
await page.waitForTimeout(PAUSA * 1000);
for (let i = 1; i < total; i++) {
  await page.keyboard.press('Space');
  await page.waitForTimeout(1300 + PAUSA * 1000);
}
await context.close();
await browser.close();
close();

const [video] = readdirSync(tmp);
const file = join(out, 'recorrido.webm');
rmSync(file, { force: true });
renameSync(join(tmp, video), file);
rmSync(tmp, { recursive: true, force: true });
console.log(`✓ ${total} escenas → ${file}`);
