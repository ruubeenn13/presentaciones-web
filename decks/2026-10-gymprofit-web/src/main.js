// La web de scroll: el scroll es la línea de tiempo. Cada escena (.slide) mide 200vh y su marco
// se queda fijo mientras el scroll la recorre; al llegar a su «reposo» está en su estado final.
// Con .active puesta desde fuera (render, pdf, deck-critic) la página salta a ese reposo.
import './estilos.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { crearEstudio } from './movil.js';

gsap.registerPlugin(ScrollTrigger);

const reducido = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const escenas = [...document.querySelectorAll('.slide')];
const fondos = [...document.querySelectorAll('.fondo')];
const numero = new Intl.NumberFormat('es-ES', { useGrouping: 'always' });

/**
 * Pose del móvil en el reposo de cada escena, en píxeles del lienzo de 1920x1080.
 * h = alto del móvil; ry/rx = giro; luz = foco naranja; visible = 0 lo saca de escena.
 */
const POSES = [
  { x: 960, y: 545, h: 780, ry: -0.32, rx: 0.06, rz: 0, luz: 1, visible: 1 },     // 1 portada, dentro de la palabra
  { x: 1620, y: 600, h: 560, ry: -0.62, rx: 0.04, rz: 0.04, luz: 0.7, visible: 1 }, // 2 se aparta
  { x: 1420, y: 525, h: 860, ry: -0.2, rx: 0.02, rz: 0, luz: 1, visible: 1 },       // 3 alta, grande
  { x: 310, y: 600, h: 400, ry: 0.42, rx: 0.04, rz: 0, luz: 0.6, visible: 1 },      // 4 se encoge a un lado
  { x: 520, y: 525, h: 860, ry: 0.22, rx: 0.02, rz: 0, luz: 1, visible: 1 },        // 5 sesión
  { x: 1550, y: 520, h: 800, ry: -0.24, rx: 0.02, rz: 0, luz: 0, visible: 1 },      // 6 alimentos, sobre naranja
  { x: 1500, y: 1500, h: 860, ry: -0.6, rx: 0.3, rz: 0, luz: 0, visible: 0 },       // 7 sin móvil
  { x: 520, y: 1500, h: 860, ry: 0.6, rx: 0.3, rz: 0, luz: 0, visible: 0 },         // 8 sin móvil
  { x: 470, y: 525, h: 860, ry: 0.18, rx: 0.02, rz: 0, luz: 1, visible: 1 },        // 9 cierre con los récords
];

/** Qué muestra la pantalla en cada escena: vídeo (se reproduce solo en su escena) o fotograma fijo. */
const PANTALLAS = [
  { imagen: 'video/alta-inicio.webp' },
  { imagen: 'video/alta-inicio.webp' },
  { video: 'video/alta.mp4', imagen: 'video/alta.webp', bucle: true },
  { imagen: 'video/alta.webp' },
  { video: 'video/sesion.mp4', imagen: 'video/sesion.webp', bucle: true },
  { video: 'video/alimento.mp4', imagen: 'video/alimento.webp', bucle: true },
  { imagen: 'video/records.webp' },
  { imagen: 'video/records.webp' },
  { video: 'video/records.mp4', imagen: 'video/records.webp', bucle: false },
];

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
  return m;
});

// ---------- Geometría del scroll ----------
let tops = [], reposos = [], llegadas = [], vh = window.innerHeight;
function medir() {
  vh = window.innerHeight;
  tops = escenas.map((s) => s.offsetTop);
  reposos = escenas.map((s, i) => tops[i] + s.offsetHeight - vh);
  // El móvil llega a su pose a mitad del recorrido de la escena (o al empezarla, si no hay recorrido).
  llegadas = escenas.map((s, i) => tops[i] + (reposos[i] - tops[i]) * 0.5);
}

const suave = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const mezcla = (a, b, t) => Object.fromEntries(Object.keys(a).map((k) => [k, a[k] + (b[k] - a[k]) * t]));

/** Pose del móvil para una posición de scroll: interpola entre el reposo de una escena y la llegada a la siguiente. */
function poseEn(y) {
  if (y <= reposos[0]) return POSES[0];
  for (let i = 0; i < escenas.length - 1; i++) {
    if (y < llegadas[i + 1]) {
      if (y <= reposos[i]) return POSES[i];
      return mezcla(POSES[i], POSES[i + 1], suave((y - reposos[i]) / (llegadas[i + 1] - reposos[i])));
    }
  }
  return POSES[escenas.length - 1];
}

/** Escena a la vista: la que ocupa el centro de la pantalla. */
function escenaEn(y) {
  let n = 0;
  for (let i = 0; i < escenas.length; i++) if (tops[i] <= y + vh / 2) n = i;
  return n;
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

// ---------- Escena actual: vídeo, pantalla, rótulos y .active ----------
let actual = -1;
let activaPropia = 0;
function cambiarEscena(n) {
  if (n === actual) return;
  actual = n;
  medios.forEach((m, i) => {
    if (!m.video) return;
    if (i === n) { m.video.currentTime = 0; m.video.play().catch(() => {}); } else m.video.pause();
  });
  const m = medios[n];
  estudio.setPantalla(m.video ? m.textura : m.imagen);
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

function fotograma() {
  const y = window.scrollY;
  estudio.setPose(poseEn(y));
  cambiarEscena(escenaEn(y));
  moverFondos();
  sincronizarRotulos();
  estudio.render();
}

// ---------- Scroll suave y líneas de tiempo ----------
let lenis = null;
function irA(n, inmediato = false) {
  const i = Math.max(0, Math.min(escenas.length - 1, n));
  if (lenis && !inmediato) lenis.scrollTo(reposos[i], { duration: 1.2, easing: suave });
  else { lenis?.scrollTo(reposos[i], { immediate: true }); window.scrollTo(0, reposos[i]); }
}

/** Animación de entrada de cada escena, guiada por el scroll (scrub) y terminada antes del reposo. */
function lineasDeTiempo() {
  const tl = (i) => gsap.timeline({
    defaults: { ease: 'power3.out' },
    scrollTrigger: { trigger: escenas[i], start: 'top top', end: 'bottom bottom', scrub: true },
  });
  const lineas = (sel) => ({ yPercent: 105, stagger: 0.08, duration: 0.35, targets: sel });
  const subir = (t, sel, at = 0) => { const l = lineas(sel); t.from(l.targets, { yPercent: l.yPercent, stagger: l.stagger, duration: l.duration }, at); };
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
  t.from('#escena-3 .apoyo', { opacity: 0, y: 20, duration: 0.2 }, 0.3);
  relleno(t);

  // 4. Piezas: del móvil sale el trazo a la API y de la API a las demás.
  t = tl(3);
  subir(t, '#escena-4 .linea > span');
  document.querySelectorAll('#escena-4 .trazo').forEach((p, i) => {
    const largo = p.getTotalLength();
    gsap.set(p, { strokeDasharray: largo });
    t.fromTo(p, { strokeDashoffset: largo }, { strokeDashoffset: 0, duration: 0.25, ease: 'none' }, 0.2 + (i ? 0.35 : 0) + i * 0.05);
  });
  t.from('#escena-4 .pieza-app', { opacity: 0, duration: 0.15 }, 0.1);
  t.from('#escena-4 .pieza-api', { opacity: 0, y: 30, duration: 0.2 }, 0.4);
  t.from('#escena-4 .pieza-panel, #escena-4 .pieza-web', { opacity: 0, y: 30, stagger: 0.08, duration: 0.2 }, 0.6);
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

// ---------- Teclado: escena siguiente y anterior ----------
window.addEventListener('keydown', (e) => {
  const sig = [' ', 'ArrowRight', 'ArrowDown', 'PageDown'].includes(e.key);
  const ant = ['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key);
  if (!sig && !ant && e.key !== 'Home' && e.key !== 'End') return;
  e.preventDefault();
  const y = window.scrollY;
  // Desde el reposo de la escena actual va a la siguiente; a medio camino, completa la actual.
  const n = escenaEn(y);
  if (e.key === 'Home') return irA(0);
  if (e.key === 'End') return irA(escenas.length - 1);
  if (sig) irA(y < reposos[n] - 4 ? n : n + 1);
  else irA(y > reposos[n] + 4 ? n : n - 1);
});

// ---------- .active desde fuera: ir al estado final de esa escena ----------
new MutationObserver(() => {
  const i = escenas.findIndex((s) => s.classList.contains('active'));
  if (i < 0 || i === activaPropia) return;
  activaPropia = i;
  irA(i, true);
  ScrollTrigger.update();
  fotograma();
}).observe(document.getElementById('escenas'), { subtree: true, attributes: true, attributeFilter: ['class'] });

// ---------- Arranque ----------
async function arrancar() {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  await document.fonts.ready;
  medir();
  if (!reducido) {
    lenis = new Lenis({ lerp: 0.09, smoothWheel: true });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
    lineasDeTiempo();
  }
  window.addEventListener('resize', () => { medir(); ScrollTrigger.refresh(); });
  ScrollTrigger.refresh();
  await estudio.listo.catch(() => {});
  gsap.ticker.add(fotograma);
  fotograma();
}
arrancar();
