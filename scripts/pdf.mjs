// npm run pdf -- <deck>
// Exporta el deck a decks/<deck>/<deck>.pdf (una página 1920x1080 por diapositiva) como respaldo sin internet.
import { basename, join } from 'node:path';
import { chromium } from 'playwright';
import { resolveDeck, eachSlide, WIDTH, HEIGHT } from './lib/deck.mjs';

const deckDir = resolveDeck(process.argv[2]);
const file = join(deckDir, `${basename(deckDir)}.pdf`);

const shots = [];
await eachSlide(deckDir, async (page) => {
  shots.push((await page.screenshot({ type: 'jpeg', quality: 92 })).toString('base64'));
});

const html = `<!doctype html><style>
  @page { size: ${WIDTH}px ${HEIGHT}px; margin: 0 }
  body { margin: 0 } img { display: block; width: ${WIDTH}px; height: ${HEIGHT}px; break-after: page }
</style>${shots.map((b) => `<img src="data:image/jpeg;base64,${b}">`).join('')}`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({ path: file, width: `${WIDTH}px`, height: `${HEIGHT}px`, printBackground: true });
await browser.close();
console.log(`✓ ${shots.length} páginas → ${file}`);
