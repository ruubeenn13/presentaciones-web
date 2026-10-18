// npm run render -- <deck>
// Captura cada diapositiva a 1920x1080 en decks/<deck>/renders/NN.png e informa de
// desbordes, texto cortado, solapes y texto < 24 pt. Sale con código 1 si hay desbordes o cortes.
import { mkdir, readdir, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { resolveDeck, eachSlide } from './lib/deck.mjs';

const deckDir = resolveDeck(process.argv[2]);
const out = join(deckDir, 'renders');
await mkdir(out, { recursive: true });
for (const f of await readdir(out)) if (f.endsWith('.png')) await rm(join(out, f));

let blocking = 0;
const total = await eachSlide(deckDir, async (page, i, issues) => {
  const n = String(i + 1).padStart(2, '0');
  await page.screenshot({ path: join(out, `${n}.png`) });
  const lines = [
    ...issues.overflow.map((t) => `  ✖ desborde: ${t}`),
    ...issues.clipped.map((t) => `  ✖ texto cortado: ${t}`),
    ...issues.overlap.map((t) => `  ⚠ solape: ${t}`),
    ...issues.small.map((t) => `  ⚠ texto pequeño: ${t}`),
  ];
  blocking += issues.overflow.length + issues.clipped.length;
  console.log(`${lines.length ? '•' : '✓'} ${n}.png`);
  lines.forEach((l) => console.log(l));
});

console.log(`\n${total} diapositivas en ${out}`);
if (blocking) {
  console.error(`✖ ${blocking} desbordes o cortes: el deck no está terminado.`);
  process.exit(1);
}
