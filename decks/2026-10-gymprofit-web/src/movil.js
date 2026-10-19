// El estudio 3D: un móvil procedural iluminado con un HDRI de estudio y un foco naranja,
// con la pantalla en la proporción exacta de las tomas (9:20). Su pose se da en píxeles del
// lienzo de 1920x1080, así el móvil y el texto comparten rejilla.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

/** Pantalla 9:20 y cuerpo con un marco fino, en unidades del modelo. */
const PANTALLA = { w: 0.9, h: 2.0, r: 0.085 };
const CUERPO = { w: 0.96, h: 2.1, d: 0.085, r: 0.12 };
const FOV = 24;
const DISTANCIA = 14;

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

/** Brillo radial para el foco naranja que recorta el móvil desde abajo. */
function texturaFoco() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,106,0,0.95)');
  grad.addColorStop(0.35, 'rgba(255,106,0,0.35)');
  grad.addColorStop(1, 'rgba(255,106,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Crea el estudio sobre un canvas.
 * @param {HTMLCanvasElement} canvas
 * @returns {{ setPose: (p: object) => void, setPantalla: (t: THREE.Texture) => void, textura: (src: HTMLVideoElement|string) => THREE.Texture, render: () => void, listo: Promise<void> }}
 */
export function crearEstudio(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.setClearColor(0x000000, 0);

  const escena = new THREE.Scene();
  const camara = new THREE.PerspectiveCamera(FOV, 1, 0.1, 100);
  camara.position.set(0, 0, DISTANCIA);

  // Iluminación: HDRI de estudio (Poly Haven, CC0) para los reflejos y un foco naranja de borde.
  const pmrem = new THREE.PMREMGenerator(renderer);
  const listo = new HDRLoader().loadAsync('hdri/studio_small_09_1k.hdr').then((hdr) => {
    escena.environment = pmrem.fromEquirectangular(hdr).texture;
    hdr.dispose();
  });
  const borde = new THREE.DirectionalLight(0xff6a00, 0);
  borde.position.set(-2, -3, -2);
  const relleno = new THREE.DirectionalLight(0xffffff, 0.35);
  relleno.position.set(2, 3, 5);
  escena.add(borde, relleno);

  const movil = new THREE.Group();
  escena.add(movil);

  // Cuerpo: aluminio grafito con reflejos del estudio.
  const metal = new THREE.MeshPhysicalMaterial({ color: 0x3a3e46, metalness: 1, roughness: 0.28, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const cuerpo = new THREE.Mesh(new RoundedBoxGeometry(CUERPO.w, CUERPO.h, CUERPO.d, 8, CUERPO.r), metal);
  movil.add(cuerpo);

  // Cristal frontal negro (marco de la pantalla) y pantalla con la toma.
  const cristal = new THREE.Mesh(
    rectRedondeado(CUERPO.w - 0.02, CUERPO.h - 0.02, CUERPO.r - 0.01),
    new THREE.MeshPhysicalMaterial({ color: 0x050506, roughness: 0.06, metalness: 0, clearcoat: 1 }),
  );
  cristal.position.z = CUERPO.d / 2 + 0.001;
  const pantallaMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false });
  const pantalla = new THREE.Mesh(rectRedondeado(PANTALLA.w, PANTALLA.h, PANTALLA.r), pantallaMat);
  pantalla.position.z = CUERPO.d / 2 + 0.002;
  // Reflejo sutil del cristal sobre la pantalla.
  const brillo = new THREE.Mesh(
    rectRedondeado(PANTALLA.w, PANTALLA.h, PANTALLA.r),
    new THREE.MeshPhysicalMaterial({ color: 0x000000, transparent: true, opacity: 0.12, roughness: 0.05, metalness: 0, clearcoat: 1 }),
  );
  brillo.position.z = CUERPO.d / 2 + 0.003;
  const camaraFrontal = new THREE.Mesh(new THREE.CircleGeometry(0.018, 24), new THREE.MeshBasicMaterial({ color: 0x000000 }));
  camaraFrontal.position.set(0, PANTALLA.h / 2 - 0.045, CUERPO.d / 2 + 0.004);
  movil.add(cristal, pantalla, brillo, camaraFrontal);

  // Botones laterales e isla de cámaras trasera, para que el canto y el giro se lean como un móvil.
  const boton = (y, h) => {
    const b = new THREE.Mesh(new RoundedBoxGeometry(0.02, h, 0.03, 2, 0.008), metal);
    b.position.set(CUERPO.w / 2 + 0.006, y, 0);
    movil.add(b);
  };
  boton(0.55, 0.22); boton(0.22, 0.14);
  const isla = new THREE.Mesh(new RoundedBoxGeometry(0.42, 0.42, 0.03, 4, 0.08),
    new THREE.MeshPhysicalMaterial({ color: 0x202228, metalness: 0.6, roughness: 0.3 }));
  isla.position.set(-0.2, 0.74, -CUERPO.d / 2 - 0.012);
  movil.add(isla);

  // Foco naranja bajo el móvil: un brillo aditivo detrás, que la luz de cada escena enciende o apaga.
  const foco = new THREE.Mesh(new THREE.PlaneGeometry(3.6, 3.6), new THREE.MeshBasicMaterial({
    map: texturaFoco(), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, opacity: 0,
  }));
  escena.add(foco);

  // Pose actual en píxeles del lienzo.
  const pose = { x: 960, y: 560, h: 700, ry: 0, rx: 0, rz: 0, luz: 1, visible: 1 };
  let ancho = 1, alto = 1;

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
    const sx = ox + pose.x * u, sy = oy + pose.y * u;
    const escala = (pose.h * u * porPx) / CUERPO.h;
    movil.position.set((sx - ancho / 2) * porPx, -(sy - alto / 2) * porPx, 0);
    movil.scale.setScalar(escala * pose.visible);
    movil.rotation.set(pose.rx, pose.ry, pose.rz);
    movil.visible = pose.visible > 0.001;
    foco.position.set(movil.position.x, movil.position.y - CUERPO.h * escala * 0.46, -1.2);
    foco.scale.set(escala * 0.95, escala * 0.62, 1);
    foco.material.opacity = 0.75 * pose.luz * pose.visible;
    borde.intensity = 2.4 * pose.luz;
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
