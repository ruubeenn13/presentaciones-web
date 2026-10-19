// La web de scroll: el scroll es la línea de tiempo. Cada escena (.slide) mide 200vh y su marco
// se queda fijo mientras el scroll la recorre; al llegar a su «reposo» está en su estado final.
// Con .active puesta desde fuera (render, pdf, deck-critic) la página salta a ese reposo.
import './estilos.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { crearEstudio, CUERPO, PANTALLA } from './movil.js';
import { intro, barrido, prepararTitulares } from './cinetica.js';

gsap.registerPlugin(ScrollTrigger);

const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reducido) document.documentElement.classList.remove('antes-de-intro');
const escenas = [...document.querySelectorAll('.slide')];
const fondos = [...document.querySelectorAll('.fondo')];
const numero = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });

/** Valores por defecto de la pose: foco naranja encendido, sombra, estudio iluminado, cámara quieta. */
const BASE = { rz: 0, luz: 1, oro: 0, sombra: 1, ambiente: 1, barrido: 0, cam: 0 };
/**
 * Pose del móvil en el reposo de cada escena, en píxeles del lienzo de 1920x1080.
 * En reposo siempre de cara (giro pequeño) para que la toma se lea; fuera de cuadro cuando no toca.
 */
const POSES = [
  { x: 1100, y: 765, h: 400, ry: -0.12, rx: 0.04 },               // 1 delante de la palabra, tapando su parte baja
  { x: 2550, y: 620, h: 600, ry: -0.3, rx: 0.04 },               // 2 fuera de cuadro: el gráfico manda
  { x: 1420, y: 525, h: 860, ry: -0.12, rx: 0.02 },              // 3 alta
  { x: 300, y: 560, h: 420, ry: 0.14, rx: 0.03, luz: 0.6 },      // 4 se encoge a un lado
  { x: 1240, y: 990, h: 1450, ry: -0.1, rx: 0.02 },              // 5 grande, cortado por abajo
  { x: 1550, y: 505, h: 780, ry: -0.14, rx: 0.02, luz: 0 },      // 6 sobre el naranja
  { x: 1550, y: 1950, h: 820, ry: -0.2, rx: 0.2, luz: 0, sombra: 0 }, // 7 fuera de cuadro
  { x: 470, y: 1950, h: 860, ry: 0.2, rx: 0.2, luz: 0, sombra: 0 },   // 8 fuera de cuadro
  { x: 470, y: 525, h: 860, ry: 0.12, rx: 0.02, oro: 1 },        // 9 cierre: la luz pasa a dorado
].map((p) => ({ ...BASE, ...p }));

/** Sentido del cuarto de vuelta en cada transición (i → i+1): el móvil se pone de canto y vuelve de cara. */
const GIRO = [1, -1, 1, -1, 1, -1, 1, -1];

/** Qué muestra la pantalla en cada escena: vídeo (se reproduce solo en su escena) o fotograma fijo. */
const PANTALLAS = [
  { imagen: 'video/alta-inicio.webp' },
  { imagen: 'video/alta-inicio.webp' },
  { video: 'video/alta.mp4', imagen: 'video/alta.webp', bucle: true },
  { imagen: 'video/alta.webp' },
  // La 5 y la 6 se reproducen una vez y se quedan en el último fotograma: se habla ~50 s en cada una.
  { video: 'video/sesion.mp4', imagen: 'video/sesion.webp', bucle: false },
  { video: 'video/alimento.mp4', imagen: 'video/alimento.webp', bucle: false },
  { imagen: 'video/records.webp' },
  { imagen: 'video/records.webp' },
  { video: 'video/records.mp4', imagen: 'video/records.webp', bucle: false },
];

/**
 * Primeros planos sincronizados con el vídeo: entre `desde` y `hasta` (s) la cámara se acerca al punto
 * (ux, uy) de la pantalla (0..1 desde arriba a la izquierda), que queda en (x, y) con el móvil a alto h.
 */
const CERCA = {
  2: { desde: 21.6, hasta: 27.5, ux: 0.5, uy: 0.3, x: 1340, y: 560, h: 2100 },  // «Tu plan» y el anillo de calorías
  4: { desde: 12.9, hasta: 17.7, ux: 0.5, uy: 0.36, x: 1300, y: 560, h: 2300 }, // las series al volver la app
  5: { desde: 16.9, hasta: 21.6, ux: 0.5, uy: 0.33, x: 1600, y: 560, h: 1900 }, // el anillo de 734 a 1.033
};

// ---------- Estudio 3D y pantallas ----------
const estudio = crearEstudio(document.getElementById('estudio'));
const imagenes = new Map();
const medios = PANTALLAS.map((p) => {
  if (!imagenes.has(p.imagen)) imagenes.set(p.imagen, estudio.textura(p.imagen));
  const m = { imagen: imagenes.get(p.imagen) };
  if (p.video && !reducido) {
    const v = Object.assign(document.createElement('video'), {
      src: p.video, muted: true, playsInline: true, loop: p.bucle, preload: 'auto', crossOrigin: 'anonymous',
    });
    m.video = v;
    m.textura = estudio.textura(v);
  }
  m.pantalla = m.video ? m.textura : m.imagen;
  return m;
});

// ---------- Geometría del scroll ----------
let tops = [], reposos = [], llegadas = [], vh = window.innerHeight;
function medir() {
  vh = window.innerHeight;
  tops = escenas.map((s) => s.offsetTop);
  reposos = escenas.map((s, i) => tops[i] + s.offsetHeight - vh);
  // El móvil llega a su pose casi al final del recorrido de la escena, para que el giro dure (o al empezarla, si no hay recorrido).
  llegadas = escenas.map((s, i) => tops[i] + (reposos[i] - tops[i]) * 0.85);
}

const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const tramo = (t) => Math.min(1, Math.max(0, t));
const mezcla = (a, b, t) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * t]));

/**
 * Pose del móvil para una posición de scroll. Entre el reposo de una escena y la llegada a la siguiente
 * interpola y se pone de canto (90°) a mitad de camino, que es cuando cambia la pantalla, y vuelve de cara.
 * @returns {{ pose: object, reposo: number, hacia: number }} reposo = escena en reposo o -1; hacia = escena cuya pantalla toca
 */
function poseEn(y) {
  if (y <= reposos[0]) return { pose: { ...POSES[0] }, reposo: 0, hacia: 0 };
  for (let i = 0; i < escenas.length - 1; i++) {
    if (y >= llegadas[i + 1]) continue;
    if (y <= reposos[i]) return { pose: { ...POSES[i] }, reposo: i, hacia: i };
    const lin = (y - reposos[i]) / (llegadas[i + 1] - reposos[i]);
    const e = suave(lin);
    const p = mezcla(POSES[i], POSES[i + 1], e);
    const arco = Math.sin(Math.PI * lin);
    p.ry += GIRO[i] * (Math.PI / 2) * arco;
    p.rx += arco * 0.12;
    p.cam -= arco * 0.8;
    p.barrido = arco * GIRO[i];
    return { pose: p, reposo: -1, hacia: lin < 0.5 ? i : i + 1 };
  }
  const n = escenas.length - 1;
  return { pose: { ...POSES[n] }, reposo: n, hacia: n };
}

const fueraDeCuadro = (p) => {
  const medioAncho = (p.h * CUERPO.w) / CUERPO.h / 2;
  return p.x + medioAncho < -40 || p.x - medioAncho > 1960 || p.y - p.h / 2 > 1120 || p.y + p.h / 2 < -40;
};
/** De canto o de espaldas: la pantalla no se ve y se puede cambiar. */
const sinPantalla = (p) => Math.cos(p.ry) * Math.cos(p.rx) < 0.2;

/** Escena a la vista: la que ocupa el centro de la pantalla. */
function escenaEn(y) {
  let n = 0;
  for (let i = 0; i < escenas.length; i++) if (tops[i] <= y + vh / 2) n = i;
  return n;
}

// ---------- Momento destacado: el móvil sale de la oscuridad con la primera tecla o scroll ----------
const entrada = { t: reducido ? 1 : 0, lanzada: reducido };
let lenis = null;
function lanzarEntrada() {
  if (entrada.lanzada) return;
  entrada.lanzada = true;
  // Secuencia cinética (unos 6 s) y, al asentarse la palabra, entra el móvil como antes.
  intro().then(() => gsap.to(entrada, { t: 1, duration: 2.1, ease: 'power2.inOut', onComplete: () => { lenis?.start(); irA(0, true); } }));
}
function completarEntrada() {
  document.documentElement.classList.remove('antes-de-intro');
  gsap.killTweensOf(entrada);
  entrada.t = 1; entrada.lanzada = true;
  lenis?.start();
}
/** En la portada, antes de la entrada: abajo y a oscuras; sube dando la única vuelta entera de la charla, con el foco barriendo el canto. */
function conEntrada(p) {
  const e = entrada.t;
  if (e >= 1) return p;
  return {
    ...p,
    ry: p.ry + 2 * Math.PI * (1 - e),
    y: p.y + 560 * (1 - e),
    h: p.h * (0.85 + 0.15 * e),
    ambiente: 0.02 + 0.98 * e,
    luz: Math.min(1.4, e + Math.sin(Math.PI * e) * 0.9),
    barrido: -1 + 2 * e,
    sombra: e,
  };
}

// ---------- Primeros planos ----------
function conPrimerPlano(p, i) {
  const cfg = CERCA[i], v = medios[i].video;
  if (!cfg || !v || reducido) return { pose: p, c: 0 };
  const t = v.currentTime;
  const c = suave(tramo((t - cfg.desde) / 0.9)) * (1 - suave(tramo((t - cfg.hasta) / 0.9)));
  if (c <= 0) return { pose: p, c: 0 };
  // Centro del móvil para que el punto (ux, uy) de la pantalla caiga en (x, y) con el móvil a alto h.
  const pxPorUnidad = cfg.h / CUERPO.h;
  const cerca = {
    ...p, h: cfg.h, ry: 0, rx: 0, rz: 0, sombra: 0, luz: p.luz * 0.4,
    x: cfg.x - (cfg.ux - 0.5) * PANTALLA.w * pxPorUnidad,
    y: cfg.y + (0.5 - cfg.uy) * PANTALLA.h * pxPorUnidad,
  };
  return { pose: mezcla(p, cerca, c), c };
}

// ---------- Fondos (capa por detrás del móvil) ----------
function moverFondos() {
  for (const f of fondos) {
    const s = escenas[Number(f.dataset.escena) - 1];
    const r = s.getBoundingClientRect();
    // Donde está ahora el marco fijo (sticky) de su escena.
    const arriba = Math.max(r.top, Math.min(0, r.bottom - vh));
    const fuera = arriba >= vh || arriba <= -vh;
    f.style.visibility = fuera ? 'hidden' : 'visible';
    if (!fuera) f.style.transform = `translate3d(0, ${arriba}px, 0)`;
  }
}

// ---------- Escena actual: vídeo, .active y rótulos ----------
let actual = -1;
let activaPropia = 0;
function cambiarEscena(n) {
  if (n === actual) return;
  actual = n;
  medios.forEach((m, i) => {
    if (!m.video) return;
    if (i === n) { m.video.currentTime = 0; m.video.play().catch(() => {}); } else m.video.pause();
  });
  activaPropia = n;
  escenas.forEach((s, i) => s.classList.toggle('active', i === n));
}

const rotulos = [...document.querySelectorAll('.rotulo')];
function sincronizarRotulos() {
  const v = medios[4].video;
  if (!v) return;
  const t = actual === 4 ? v.currentTime : -1;
  let ultimo = -1;
  rotulos.forEach((r, i) => { const visto = t >= Number(r.dataset.desde); r.classList.toggle('visto', visto); if (visto) ultimo = i; });
  rotulos.forEach((r, i) => r.classList.toggle('ahora', i === ultimo));
}

let pantallaPuesta = false;
function fotograma() {
  const y = window.scrollY;
  cambiarEscena(escenaEn(y));
  let { pose, reposo, hacia } = poseEn(y);
  if (reposo === 0) pose = conEntrada(pose);
  let c = 0;
  if (reposo >= 0) ({ pose, c } = conPrimerPlano(pose, reposo));
  escenas.forEach((s, i) => s.style.setProperty('--atenua', i === reposo ? c : 0));

  // La pantalla solo cambia cuando no se ve: fuera de cuadro, de canto o en un salto directo al reposo.
  if (!pantallaPuesta || reposo >= 0 || fueraDeCuadro(pose) || sinPantalla(pose)) {
    estudio.setPantalla(medios[hacia].pantalla);
    pantallaPuesta = true;
  }
  estudio.setPose(pose);
  moverFondos();
  sincronizarRotulos();
  estudio.render();
}

// ---------- Scroll suave y líneas de tiempo ----------
function irA(n, inmediato = false) {
  const i = Math.max(0, Math.min(escenas.length - 1, n));
  // 1,8 s con una curva sinusoidal: se ve el móvil de canto sin hacer esperar al público.
  if (lenis && !inmediato) lenis.scrollTo(reposos[i], { duration: 1.8, easing: (t) => (1 - Math.cos(Math.PI * t)) / 2 });
  else { lenis?.scrollTo(reposos[i], { immediate: true, force: true }); window.scrollTo(0, reposos[i]); }
}

/** Animación de entrada de cada escena, guiada por el scroll (scrub) y terminada antes del reposo. */
function lineasDeTiempo() {
  const tl = (i) => gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: { trigger: escenas[i], start: 'top top', end: 'bottom bottom', scrub: true },
  });
  const subir = (t, sel, at = 0) => t.from(sel, { yPercent: 105, stagger: 0.08, duration: 0.35 }, at);
  const contar = (t, el, at, dur = 0.4) => {
    const fin = Number(el.dataset.cuenta), o = { v: 0 };
    el.style.minWidth = `${el.offsetWidth}px`; // ancho final reservado
    t.to(o, { v: fin, duration: dur, ease: 'none', onUpdate: () => { el.textContent = numero.format(Math.round(o.v)); } }, at);
  };
  const relleno = (t) => t.to({}, { duration: 0.25 }); // el final se mantiene antes del reposo

  // 2. Commits: titular, barras que crecen y totales.
  let t = tl(1);
  subir(t, '#escena-2 .linea > span');
  t.from('#escena-2 .barra', { scaleY: 0, stagger: 0.04, duration: 0.3, ease: 'none' }, 0.15);
  t.from('#escena-2 .barra .valor', { opacity: 0, stagger: 0.04, duration: 0.1 }, 0.25);
  t.from('#escena-2 .grupo', { opacity: 0, y: 30, stagger: 0.15, duration: 0.2 }, 0.45);
  relleno(t);

  // 3. Alta.
  t = tl(2);
  subir(t, '#escena-3 .linea > span');
  relleno(t);

  // 4. Piezas: trazos del móvil a la API, del panel a la API y de la API a la base de datos.
  t = tl(3);
  subir(t, '#escena-4 .linea > span');
  document.querySelectorAll('#escena-4 .trazo').forEach((p, i) => {
    const largo = p.getTotalLength();
    gsap.set(p, { strokeDasharray: largo });
    t.fromTo(p, { strokeDashoffset: largo }, { strokeDashoffset: 0, duration: 0.2, ease: 'none' }, [0.2, 0.55, 0.45][i]);
  });
  t.from('#escena-4 .pieza-api', { opacity: 0, y: 30, duration: 0.2 }, 0.3);
  t.from('#escena-4 .pieza-bd', { opacity: 0, y: 30, duration: 0.2 }, 0.55);
  t.from('#escena-4 .pieza-panel, #escena-4 .pieza-web', { opacity: 0, y: 30, stagger: 0.1, duration: 0.2 }, 0.6);
  relleno(t);

  // 5. Sesión (los rótulos van con el vídeo).
  t = tl(4);
  subir(t, '#escena-5 .linea > span');
  relleno(t);

  // 6. Alimentos: la cifra cuenta con el scroll.
  t = tl(5);
  subir(t, '#escena-6 .linea > span');
  contar(t, document.querySelector('.cifra-198'), 0.15, 0.45);
  t.from('#escena-6 .a-198, #escena-6 .fuentes', { opacity: 0, y: 20, stagger: 0.1, duration: 0.2 }, 0.45);
  relleno(t);

  // 7. 403.
  t = tl(6);
  subir(t, '#escena-7 .linea > span');
  t.from('#escena-7 .peticion, #escena-7 .respuesta-et', { opacity: 0, y: 20, stagger: 0.12, duration: 0.2 }, 0.2);
  t.from('#escena-7 .cifra-403', { opacity: 0, scale: 0.9, transformOrigin: '100% 50%', duration: 0.3 }, 0.45);
  t.from('#escena-7 .prohibido', { opacity: 0, y: 20, duration: 0.15 }, 0.65);
  relleno(t);

  // 8. Tests: contadores.
  t = tl(7);
  subir(t, '#escena-8 .linea > span');
  document.querySelectorAll('#escena-8 .cifra').forEach((el, i) => contar(t, el, 0.15 + i * 0.12, 0.4));
  t.from('#escena-8 .dato .texto, #escena-8 .dato .etiqueta', { opacity: 0, stagger: 0.06, duration: 0.15 }, 0.35);
  relleno(t);

  // 9. Cierre: la frase y, al final, la G.
  t = tl(8);
  t.from('#escena-9 .recap', { opacity: 0, y: 20, duration: 0.2 }, 0);
  subir(t, '#escena-9 .linea > span', 0.15);
  t.from('#escena-9 .logo-g', { opacity: 0, scale: 0.6, duration: 0.25 }, 0.6);
  relleno(t);
}

// ---------- Cambio de escena: un único barrido de color plano (prueba cinética) ----------
let enBarrido = false;
function ir(n, desde) {
  const i = Math.max(0, Math.min(escenas.length - 1, n));
  if (reducido || i === desde) return irA(i, reducido);
  enBarrido = true;
  // Grafito al entrar o salir de la escena naranja; naranja en el resto.
  const color = i === 5 || desde === 5 ? '#0B0C0E' : '#FF6A00';
  barrido(() => { irA(i, true); ScrollTrigger.update(); fotograma(); }, escenas[i], color, i > desde ? 1 : -1)
    .then(() => { enBarrido = false; });
}

// ---------- Teclado: escena siguiente y anterior ----------
const TECLAS_SIG = [' ', 'ArrowRight', 'ArrowDown', 'PageDown'];
const TECLAS_ANT = ['ArrowLeft', 'ArrowUp', 'PageUp'];
window.addEventListener('keydown', (e) => {
  const sig = TECLAS_SIG.includes(e.key), ant = TECLAS_ANT.includes(e.key);
  if (!sig && !ant && e.key !== 'Home' && e.key !== 'End') return;
  e.preventDefault();
  // La primera tecla lanza la entrada de la portada; la navegación empieza cuando termina.
  if (!entrada.lanzada) return lanzarEntrada();
  if (entrada.t < 1) return;
  if (enBarrido) return;
  const y = window.scrollY;
  const n = escenaEn(y);
  if (e.key === 'Home') return ir(0, n);
  if (e.key === 'End') return ir(escenas.length - 1, n);
  // Desde el reposo de la escena actual va a la siguiente; a medio camino, completa la actual.
  if (sig) ir(y < reposos[n] - 4 ? n : n + 1, n);
  else ir(y > reposos[n] + 4 ? n : n - 1, n);
});
for (const ev of ['wheel', 'touchstart']) window.addEventListener(ev, lanzarEntrada, { passive: true });

// ---------- .active desde fuera: ir al estado final de esa escena ----------
new MutationObserver(() => {
  const i = escenas.findIndex((s) => s.classList.contains('active'));
  if (i < 0 || i === activaPropia) return;
  activaPropia = i;
  completarEntrada();
  irA(i, true);
  ScrollTrigger.update();
  fotograma();
}).observe(document.getElementById('escenas'), { subtree: true, attributes: true, attributeFilter: ['class'] });

// ---------- Arranque ----------
async function arrancar() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  await document.fonts.ready;
  medir();
  if (!reducido) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    if (!entrada.lanzada) lenis.stop();
    prepararTitulares();
    lineasDeTiempo();
  }
  // Al cambiar el tamaño (F11, ventana) las escenas cambian de alto: se vuelve al reposo de la escena actual.
  window.addEventListener('resize', () => {
    const n = Math.max(0, actual);
    medir();
    lenis?.resize();
    ScrollTrigger.refresh();
    irA(n, true);
  });
  ScrollTrigger.refresh();
  await estudio.listo.catch(() => {});
  gsap.ticker.add(fotograma);
  fotograma();
}
arrancar();
