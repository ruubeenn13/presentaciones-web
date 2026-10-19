// Prueba de dirección: tipografía cinética a toda pantalla, con color plano y cortes secos.
// - intro(): la secuencia de la portada (unos 6 s) con los textos del guion; acaba con «GymProFit»
//   asentada exactamente donde está la palabra de la portada, y entonces se retira.
// - barrido(): el único cambio de escena, 0,8–1,2 s. Un panel de color plano tapa la pantalla,
//   salta a la escena nueva mientras no se ve, la destapa y el titular entra palabra a palabra.
// La «sensación de velocidad» es desenfoque más estiramiento en el eje del movimiento.
import gsap from 'gsap';

const capa = document.getElementById('cinetica');
const lienzo = capa.querySelector('.lienzo');
const NARANJA = '#FF6A00', GRAFITO = '#0B0C0E', HUESO = '#F2F2F3', SUPERFICIE = '#1B1E24';

/** Crea una línea de palabras (cada palabra en su span) en el lienzo de la capa. */
function linea(texto, { x, y, tam, color, peso = 900, cursiva = false }) {
  const p = document.createElement('p');
  p.className = 'cin-linea';
  Object.assign(p.style, {
    left: `calc(${x} * var(--u))`, top: `calc(${y} * var(--u))`, fontSize: `calc(${tam} * var(--u))`,
    color, fontWeight: String(peso), fontStyle: cursiva ? 'italic' : 'normal',
  });
  for (const [i, w] of texto.split(' ').entries()) {
    if (i) p.append(' ');
    const s = document.createElement('span');
    s.className = 'cin-palabra';
    s.textContent = w;
    p.append(s);
  }
  lienzo.append(p);
  return [...p.querySelectorAll('.cin-palabra')];
}

/** Golpe de palabra: entra desde un lado, estirada y desenfocada, y frena en seco. */
function golpe(tl, palabras, at, { eje = 'x', desde = -1, paso = 0.13 } = {}) {
  const prop = eje === 'x' ? { xPercent: 140 * desde, scaleX: 2.2, scaleY: 0.9 } : { yPercent: 160 * desde, scaleY: 2.4, scaleX: 0.92 };
  tl.fromTo(palabras, { ...prop, filter: 'blur(18px)', opacity: 0 }, {
    xPercent: 0, yPercent: 0, scaleX: 1, scaleY: 1, filter: 'blur(0px)', opacity: 1,
    duration: 0.32, ease: 'expo.out', stagger: paso,
  }, at);
}

/** Corte seco: cambia el fondo y deja solo lo que se indica (sin fundidos). */
function corte(tl, at, fondo, visibles) {
  tl.call(() => {
    capa.style.background = fondo;
    lienzo.querySelectorAll('.cin-linea, .cin-filas').forEach((e) => { e.style.visibility = 'hidden'; });
    visibles.forEach((e) => { e.style.visibility = 'visible'; });
  }, null, at);
}

/**
 * Secuencia de la portada. Devuelve una promesa que se resuelve cuando la palabra se ha asentado
 * y la capa se ha retirado (la portada real queda debajo, idéntica).
 */
export function intro() {
  lienzo.textContent = '';
  capa.hidden = false;
  capa.style.background = NARANJA;

  // Textos del guion, por planos.
  const p1 = linea('Un proyecto', { x: 144, y: 330, tam: 400, color: GRAFITO });
  const p2 = linea('de clase', { x: 144, y: 280, tam: 520, color: HUESO });
  const p3 = linea('llevado como', { x: 144, y: 340, tam: 380, color: GRAFITO, cursiva: true, peso: 800 });
  const p4a = linea('un producto', { x: 144, y: 150, tam: 340, color: HUESO });
  const p4b = linea('de verdad', { x: 144, y: 500, tam: 420, color: NARANJA });

  // Fondo generativo: filas de «GymProFit» que corren en sentidos alternos.
  const filas = document.createElement('div');
  filas.className = 'cin-filas';
  for (let i = 0; i < 7; i++) {
    const f = document.createElement('p');
    f.className = 'cin-fila';
    f.textContent = 'GymProFit GymProFit GymProFit GymProFit GymProFit';
    f.style.top = `calc(${-40 + i * 170} * var(--u))`;
    f.style.color = i === 3 ? NARANJA : SUPERFICIE;
    filas.append(f);
  }
  lienzo.append(filas);
  // La palabra que cae y se asienta: misma caja y estilo que .gigante de la portada.
  const gigante = document.createElement('p');
  gigante.className = 'gigante cin-gigante';
  gigante.textContent = 'GymProFit';
  lienzo.append(gigante);

  const lineas = (ws) => ws.map((w) => w.parentElement).filter((v, i, a) => a.indexOf(v) === i);
  return new Promise((listo) => {
    const tl = gsap.timeline({ onComplete: () => { capa.hidden = true; lienzo.textContent = ''; listo(); } });
    corte(tl, 0, NARANJA, lineas(p1));
    golpe(tl, p1, 0.05);
    corte(tl, 0.95, GRAFITO, lineas(p2));
    golpe(tl, p2, 0.98, { desde: 1 });
    corte(tl, 1.75, NARANJA, lineas(p3));
    golpe(tl, p3, 1.78, { eje: 'y', desde: 1 });
    corte(tl, 2.55, GRAFITO, lineas([...p4a, ...p4b]));
    golpe(tl, p4a, 2.58, { desde: -1, paso: 0.1 });
    golpe(tl, p4b, 2.9, { desde: 1, paso: 0.12 });
    // Plano final: filas en movimiento, la palabra cae gigante y se asienta.
    corte(tl, 3.55, GRAFITO, [filas]);
    [...filas.children].forEach((f, i) => {
      tl.fromTo(f, { xPercent: i % 2 ? -30 : -5 }, { xPercent: i % 2 ? -5 : -30, duration: 2.4, ease: 'none' }, 3.55);
    });
    tl.set(gigante, { visibility: 'visible' }, 3.7);
    tl.fromTo(gigante, { yPercent: -260, scaleY: 2.2, filter: 'blur(22px)' },
      { yPercent: 0, scaleY: 1, filter: 'blur(0px)', duration: 0.42, ease: 'power4.in' }, 3.7);
    // Impacto: aplastamiento corto y las filas acusan el golpe.
    tl.to(gigante, { scaleY: 0.86, scaleX: 1.04, duration: 0.07, ease: 'power2.out' }, 4.12);
    tl.to(gigante, { scaleY: 1, scaleX: 1, duration: 0.35, ease: 'elastic.out(1, 0.5)' }, 4.19);
    tl.to(filas, { y: 18, duration: 0.07, yoyo: true, repeat: 1 }, 4.12);
    // Se asienta: las filas se cortan en seco y el fondo de la capa desaparece; queda la portada.
    corte(tl, 5.6, GRAFITO, [gigante]);
    // La portada real (oculta hasta ahora) aparece debajo, idéntica, y la capa se retira.
    tl.call(() => document.documentElement.classList.remove('antes-de-intro'), null, 5.9);
    tl.set(capa, { background: 'transparent' }, 5.95);
    tl.to({}, { duration: 0.05 }, 6.0);
  });
}

/**
 * Cambio de escena: tapa con color plano, llama a saltar() mientras no se ve, destapa y anima el
 * titular de la escena nueva. Unos 1,1 s en total.
 * @param {() => void} saltar mueve la página a la escena nueva (sin animación)
 * @param {HTMLElement} escena la sección de destino
 * @param {string} color '#FF6A00' o '#0B0C0E'
 * @param {number} sentido 1 hacia delante, -1 hacia atrás
 */
export function barrido(saltar, escena, color, sentido = 1) {
  lienzo.textContent = '';
  capa.hidden = false;
  capa.style.background = color;
  const tapa = sentido > 0 ? ['inset(0 100% 0 0)', 'inset(0 0% 0 0)', 'inset(0 0 0 100%)'] : ['inset(0 0 0 100%)', 'inset(0 0 0 0%)', 'inset(0 100% 0 0)'];
  const palabras = [...escena.querySelectorAll('.titular .cin-palabra-titular')];
  return new Promise((listo) => {
    gsap.timeline({ onComplete: () => { capa.hidden = true; capa.style.clipPath = ''; listo(); } })
      .fromTo(capa, { clipPath: tapa[0] }, { clipPath: tapa[1], duration: 0.38, ease: 'power3.in' })
      .call(() => {
        saltar();
        gsap.set(palabras, { xPercent: 90 * sentido, scaleX: 2, filter: 'blur(16px)', opacity: 0 });
      })
      .to(capa, { clipPath: tapa[2], duration: 0.36, ease: 'power3.out' }, '+=0.04')
      .to(palabras, {
        xPercent: 0, scaleX: 1, filter: 'blur(0px)', opacity: 1,
        duration: 0.34, ease: 'expo.out', stagger: 0.045, clearProps: 'filter,transform',
      }, '-=0.22');
  });
}

/** Parte los titulares en palabras para la entrada cinética (sin tocar su texto). */
export function prepararTitulares() {
  document.querySelectorAll('.titular .linea > span').forEach((s) => {
    const partes = s.textContent.split(/(\s+)/);
    s.textContent = '';
    for (const p of partes) {
      if (/^\s+$/.test(p)) { s.append(p); continue; }
      s.append(Object.assign(document.createElement('span'), { className: 'cin-palabra-titular', textContent: p }));
    }
  });
}
