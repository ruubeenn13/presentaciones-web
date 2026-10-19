// El estudio 3D: un móvil procedural iluminado con un HDRI de estudio y un foco de borde,
// con la pantalla en la proporción exacta de las tomas (9:20). Su pose se da en píxeles del
// lienzo de 1920x1080, así el móvil y el texto comparten rejilla.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

/** Pantalla 9:20 y cuerpo con un marco fino, en unidades del modelo. */
export const PANTALLA = { w: 0.9, h: 2.0, r: 0.085 };
export const CUERPO = { w: 0.96, h: 2.1, d: 0.085, r: 0.12 };
const FOV = 24;
const DISTANCIA = 14;
const NARANJA = new THREE.Color(0xff6a00);
const DORADO = new THREE.Color(0xe8b84b);

/** Rectángulo con esquinas redondeadas y UV normalizadas a 0..1. */
function rectRedondeado(w, h, r) {
  const s = new THREE.Shape();
  const x = -w / 2, y = -h / 2;
  s.moveTo(x + r, y);
  s.lineTo(x + w - r, y); s.quadraticCurveTo(x + w, y, x + w, y + r);
  s.lineTo(x + w, y + h - r); s.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  s.lineTo(x + r, y + h); s.quadraticCurveTo(x, y + h, x, y + h - r);
  s.lineTo(x, y + r); s.quadraticCurveTo(x, y, x + r, y);
  const g = new THREE.ShapeGeometry(s, 16);
  const pos = g.attributes.position, uv = g.attributes.uv;
  for (let i = 0; i < pos.count; i++) uv.setXY(i, (pos.getX(i) - x) / w, (pos.getY(i) - y) / h);
  return g;
}

/** Degradado radial blanco (el color lo pone el material): foco de luz y sombra de contacto. */
function texturaRadial(paradas) {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  paradas.forEach(([p, a]) => grad.addColorStop(p, `rgba(255,255,255,${a})`));
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Crea el estudio sobre un canvas.
 * Pose: x, y, h (px del lienzo), ry/rx/rz (giro), luz (foco), oro (0 naranja, 1 dorado),
 * sombra (contacto), ambiente (0 oscuridad, 1 estudio), barrido (-1..1, foco recorriendo el canto)
 * y cam (desplazamiento de la cámara hacia el móvil).
 * @param {HTMLCanvasElement} canvas
 */
export function crearEstudio(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x000000, 0);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camara.position.set(0, 0, DISTANCIA);

  // Iluminación: HDRI de estudio (Poly Haven, CC0) para los reflejos, un foco de borde y un relleno.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const listo = new HDRLoader().loadAsync('hdri/studio_small_09_1k.hdr').then((hdr) => {
    escena.environment = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
  });
  const borde = new THREE.SpotLight(0xff6a00, 0, 30, 0.5, 0.6, 0);
  const relleno = new THREE.DirectionalLight(0xffffff, 0.35);
  relleno.position.set(2, 3, 5);
  escena.add(borde, borde.target, relleno);

  const movil = new THREE.Group();
  escena.add(movil);

  // Cuerpo: aluminio grafito con reflejos del estudio.
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x3a3e46, metalness: 1, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  movil.add(new THREE.Mesh(new RoundedBoxGeometry(CUERPO.w, CUERPO.h, CUERPO.d, 8, CUERPO.r), metal));

  // Cristal frontal negro (marco de la pantalla) y pantalla con la toma.
  const cristal = new THREE.Mesh(
    rectRedondeado(CUERPO.w - 0.02, CUERPO.h - 0.02, CUERPO.r - 0.01),
    new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.06, metalness: 0, clearcoat: 1 }),
  );
  cristal.position.z = CUERPO.d / 2 + 0.001;
  const pantallaMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const pantalla = new THREE.Mesh(rectRedondeado(PANTALLA.w, PANTALLA.h, PANTALLA.r), pantallaMat);
  pantalla.position.z = CUERPO.d / 2 + 0.002;
  const brillo = new THREE.Mesh(
    rectRedondeado(PANTALLA.w, PANTALLA.h, PANTALLA.r),
    new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, clearcoat: 1 }),
  );
  brillo.position.z = CUERPO.d / 2 + 0.003;
  const camaraFrontal = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  camaraFrontal.position.set(0, PANTALLA.h / 2 - 0.045, CUERPO.d / 2 + 0.004);
  movil.add(cristal, pantalla, brillo, camaraFrontal);

  // Botones en el canto derecho e isla de cámaras con lentes en la espalda: se ven al girar.
  const boton = (y, h) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.024, h, 0.032, 2, 0.009), metal);
    b.position.set(CUERPO.w / 2 + 0.008, y, 0);
    movil.add(b);
  };
  boton(0.55, 0.22); boton(0.22, 0.14);
  const isla = new THREE.Mesh(new RoundedBoxGeometry(0.44, 0.44, 0.03, 4, 0.09),
    new THREE.MeshPhysicalMaterial({ color: 0x202228, metalness: 0.6, roughness: 0.3, clearcoat: 1 }));
  isla.position.set(-0.2, 0.74, -CUERPO.d / 2 - 0.012);
  movil.add(isla);
  const lenteMat = new THREE.MeshPhysicalMaterial({ color: 0x050608, metalness: 0.2, roughness: 0.05, clearcoat: 1 });
  [[-0.29, 0.83], [-0.11, 0.83], [-0.29, 0.65]].forEach(([x, y]) => {
    const l = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.02, 32), lenteMat);
    l.rotation.x = Math.PI / 2;
    l.position.set(x, y, -CUERPO.d / 2 - 0.03);
    movil.add(l);
  });

  // Foco de borde bajo el móvil (brillo aditivo) y sombra de contacto en el suelo del estudio.
  const foco = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({
    map: texturaRadial([[0, 0.95], [0.35, 0.35], [1, 0]]), color: NARANJA,
    transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0,
  }));
  const sombra = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({
    map: texturaRadial([[0, 0.9], [0.5, 0.45], [1, 0]]), color: 0x000000,
    transparent: true, depthWrite: false, toneMapped: false, opacity: 0,
  }));
  escena.add(foco, sombra);

  const pose = { x: 960, y: 560, h: 700, ry: 0, rx: 0, rz: 0, luz: 1, oro: 0, sombra: 1, ambiente: 1, barrido: 0, cam: 0 };
  let ancho = 1, alto = 1;
  const color = new THREE.Color();

  function redimensionar() {
    ancho = window.innerWidth; alto = window.innerHeight;
    renderer.setSize(ancho, alto, false);
    camara.aspect = ancho / alto;
    camara.updateProjectionMatrix();
  }
  window.addEventListener('resize', redimensionar);
  redimensionar();

  function aplicarPose() {
    const u = Math.min(ancho / 1920, alto / 1080);
    const ox = (ancho - 1920 * u) / 2, oy = (alto - 1080 * u) / 2;
    const porPx = (2 * DISTANCIA * Math.tan(THREE.MathUtils.degToRad(FOV / 2))) / alto;
    const escala = (pose.h * u * porPx) / CUERPO.h;
    movil.position.set((ox + pose.x * u - ancho / 2) * porPx, -(oy + pose.y * u - alto / 2) * porPx, 0);
    movil.scale.setScalar(escala);
    movil.rotation.set(pose.rx, pose.ry, pose.rz);
    camara.position.set(0, 0, DISTANCIA + pose.cam);

    color.copy(NARANJA).lerp(DORADO, pose.oro);
    const pie = movil.position.y - (CUERPO.h / 2) * escala;
    foco.material.color.copy(color);
    foco.position.set(movil.position.x, pie + CUERPO.h * escala * 0.04, -1.2);
    foco.scale.set(escala * 0.95, escala * 0.62, 1);
    foco.material.opacity = 0.75 * pose.luz;
    sombra.position.set(movil.position.x, pie - 0.03 * escala, -0.35);
    sombra.scale.set(CUERPO.w * escala * 1.7, 0.2 * escala, 1);
    sombra.material.opacity = 0.7 * pose.sombra;

    // El foco de borde apunta al móvil desde atrás y abajo; el barrido lo pasa de un canto al otro.
    borde.color.copy(color);
    borde.position.set(movil.position.x + pose.barrido * 5 * escala, movil.position.y - 3 * escala, -3);
    borde.target.position.copy(movil.position);
    borde.intensity = 220 * pose.luz;
    escena.environmentIntensity = pose.ambiente;
    relleno.intensity = 0.35 * pose.ambiente;
  }

  return {
    listo,
    setPose(p) { Object.assign(pose, p); },
    setPantalla(t) {
      if (pantallaMat.map === t) return;
      pantallaMat.map = t;
      pantallaMat.needsUpdate = true;
    },
    textura(src) {
      const t = typeof src === 'string' ? new THREE.TextureLoader().load(src) : new THREE.VideoTexture(src);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = renderer.capabilities.getMaxAnisotropy();
      t.minFilter = THREE.LinearFilter;
      t.generateMipmaps = false;
      return t;
    },
    render() {
      aplicarPose();
      renderer.render(escena, camara);
    },
  };
}
