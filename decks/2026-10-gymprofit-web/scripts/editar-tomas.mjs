// npm run tomas
// Edita las grabaciones originales de grabaciones/ (ignoradas por git) y deja en public/video/
// las versiones para la web: recortadas, a 30 fps, H.264 High sin audio, con +faststart y con la
// barra de navegación del emulador tapada por una franja negra con la píldora de gestos.
// De cada toma saca también un fotograma clave en WebP (movimiento reducido y PDF).
import { spawnSync } from 'node:child_process';
import { mkdirSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ffmpeg from 'ffmpeg-static';

const DECK = resolve(fileURLToPath(import.meta.url), '..', '..');
const SRC = join(DECK, 'grabaciones');
const OUT = join(DECK, 'public', 'video');
mkdirSync(OUT, { recursive: true });

/** Salida a 720x1600: la proporción 9:20 de las tomas, nítida en un móvil que ocupa ~900 px de alto. */
const ANCHO = 720;
/** Barra de navegación del emulador: 48 dp a 2,625 = 126 px de 2400. */
const NAV = 126;
/** Píldora de gestos: 216 x 12 px, gris claro, centrada en la franja. */
const PILDORA = { w: 216, h: 12, color: '0xE6E6E6' };

/**
 * Tomas: tramos [inicio, fin, velocidad] en segundos del original, pausa final y fotogramas clave.
 * `decimar` quita los fotogramas repetidos (pausas) antes de cortar, dejando como mucho `decimar` fotogramas quietos.
 */
const TOMAS = [
  {
    nombre: 'alta',
    decimar: 9,
    tramos: [[0, 7, 1], [7, 22, 1.6], [22, null, 1]],
    pausaFinal: 3,
    claves: { 'alta-inicio': 0.2, alta: 'fin' },
  },
  {
    nombre: 'sesion',
    origen: 'sesion-cierre',
    tramos: [[2.3, 9.6, 1], [33.6, 45, 1]],
    claves: { sesion: 'fin' },
  },
  {
    nombre: 'alimento',
    tramos: [[1.5, 16, 1], [24.6, null, 1]],
    claves: { alimento: 'fin' },
  },
  {
    nombre: 'records',
    tramos: [[0, null, 1]],
    claves: { records: 'fin' },
  },
];

const run = (args) => {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', ...args], { stdio: 'inherit' });
  if (r.status !== 0) throw new Error(`ffmpeg falló: ${args.join(' ')}`);
};

/** Duración en segundos de un vídeo, leída de la salida de ffmpeg. */
function duracion(file) {
  const r = spawnSync(ffmpeg, ['-hide_banner', '-i', file], { encoding: 'utf8' });
  const m = r.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

/** Filtro que tapa la barra de navegación (en el original de 1080x2400) y dibuja la píldora. */
const tapaNav = () => {
  const { w, h, color } = PILDORA;
  const x = (1080 - w) / 2, y = 2400 - NAV / 2 - h / 2, r = h / 2;
  // La píldora: rectángulo con los extremos redondeados por geq sobre el canal alfa.
  return [
    `drawbox=x=0:y=${2400 - NAV}:w=1080:h=${NAV}:color=black:t=fill[base]`,
    `color=c=${color}:s=${w}x${h},format=rgba,geq=r='r(X,Y)':g='g(X,Y)':b='b(X,Y)':` +
      `a='if(lt(X,${r}),255*lte(hypot(X-${r},Y-${r}),${r}),if(gt(X,${w - r}),255*lte(hypot(X-${w - r},Y-${r}),${r}),255))'[pil]`,
    `[base][pil]overlay=${x}:${y}:shortest=1`,
  ];
};

for (const toma of TOMAS) {
  const src = join(SRC, `${toma.origen ?? toma.nombre}.mp4`);
  const out = join(OUT, `${toma.nombre}.mp4`);
  const total = duracion(src);

  // 1. Pasa a 30 fps fijos y, si toca, quita las pausas (screenrecord solo emite fotogramas cuando algo cambia).
  const pre = [`[0:v]fps=30${toma.decimar ? `,mpdecimate=max=${toma.decimar}:hi=768:lo=320:frac=0.33,setpts=N/30/TB` : ''}[v0]`];
  const largo = toma.decimar ? null : total;

  // 2. Corta los tramos, ajusta su velocidad y los une.
  const partes = toma.tramos.map(([a, b, vel], i) => {
    const fin = b ?? largo;
    const trim = fin == null ? `trim=start=${a}` : `trim=start=${a}:end=${fin}`;
    return `[s${i}]${trim},setpts=(PTS-STARTPTS)/${vel}[p${i}]`;
  });
  const split = `[v0]split=${toma.tramos.length}${toma.tramos.map((_, i) => `[s${i}]`).join('')}`;
  const concat = `${toma.tramos.map((_, i) => `[p${i}]`).join('')}concat=n=${toma.tramos.length}:v=1:a=0[v1]`;

  // 3. Pausa final, barra de navegación tapada, escala y 30 fps fijos.
  const pausa = toma.pausaFinal ? `,tpad=stop_mode=clone:stop_duration=${toma.pausaFinal}` : '';
  const [caja, pildora, overlay] = tapaNav();
  const graph = [
    ...pre, split, ...partes, concat,
    `[v1]fps=30${pausa},${caja}`, pildora,
    `${overlay},scale=${ANCHO}:-2:flags=lanczos,fps=30,format=yuv420p[out]`,
  ].join(';');

  run([
    '-i', src, '-filter_complex', graph, '-map', '[out]', '-an',
    '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'veryslow', '-tune', 'animation',
    '-crf', '25', '-g', '60', '-r', '30', '-movflags', '+faststart', out,
  ]);

  // 4. Fotogramas clave en WebP.
  const dur = duracion(out);
  for (const [nombre, t] of Object.entries(toma.claves)) {
    const seg = t === 'fin' ? Math.max(0, dur - 0.1) : t;
    run(['-ss', String(seg), '-i', out, '-frames:v', '1', '-c:v', 'libwebp', '-quality', '82',
      join(OUT, `${nombre}.webp`)]);
  }
  console.log(`✓ ${toma.nombre}.mp4  ${dur.toFixed(1)} s  ${(statSync(out).size / 1e6).toFixed(2)} MB`);
}
