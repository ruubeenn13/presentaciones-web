# DESIGN.md — GymProFit, la web de scroll

Presentación en forma de web de scroll para proyector (1920×1080, escala a 16:10 y 4K).
Se basa en la marca real de la app (colores y fuentes de `TFG-GymProFit`) y en los tres vídeos
de referencia (reloj en estudio oscuro, bote a sangre en naranja, objetos flotando en un estudio).
La vara de medir es la del reloj: objeto grande, giros que enseñan canto y espalda, y primeros planos.
No se ha consultado UXKIN: la dirección sale de la marca y de esas referencias.

## Idea
**Un estudio de fotografía a oscuras con un solo producto: el móvil con la app real.**
Una luz naranja de estudio lo recorta desde abajo; la tipografía gigante pasa por delante y por
detrás de él; el scroll mueve la cámara, no dispara animaciones. Cada sección cambia la luz.

## Color

| Token | Hex | Papel |
|---|---|---|
| `--grafito` | #0B0C0E | Fondo del estudio (≈ 70 % de la página) |
| `--superficie` | #1B1E24 | Planos del esquema, pista de gráficos, suelo del estudio |
| `--hueso` | #F2F2F3 | Titulares y texto principal (18,4:1 sobre grafito) |
| `--niebla` | #A1A9B6 | Texto de apoyo, etiquetas, datos del TFG (8,1:1 sobre grafito) |
| `--naranja` | #FF6A00 | Marca: luz de estudio, cifra protagonista, sección 6 a sangre |
| `--dorado` | #E8B84B | Solo logros: récords de la app, cifra de tests, la G y la luz del cierre |
| `--proteina` / `--carbos` / `--grasa` | #6BA6F5 / #E8A94B / #B295E8 | Solo en la escena 6, como en la app |

- Sobre naranja el texto es grafito (7,0:1), nunca blanco (2,9:1).
- La luz naranja es un foco (degradado radial bajo el móvil), nunca un degradado decorativo de fondo.
- Prohibido: morados, neones, degradados lineales de dos colores, texto con degradado.

## Tipografía

| Rol | Familia y peso | Tamaño en lienzo 1920 | Interlineado |
|---|---|---|---|
| Gigante (palabra-objeto) | Barlow Condensed 900 | 360–620 px | 0,8 |
| Titular-afirmación | Barlow Condensed 800 | 104–132 px | 0,95 |
| Cifra | Barlow Condensed 900 (cifras tabulares) | 160–440 px | 0,85 |
| Texto | Barlow 500 | 60 px | 1,15 |
| Etiqueta editorial | Barlow 600 | 48 px (suelo de 24 pt) | 1,1 |

- Todo el texto de contenido mide 60 px o más; las etiquetas editoriales (márgenes verticales,
  contador de escena, créditos de foto en el pie) usan 48 px, nunca menos.
- Sin mayúsculas espaciadas: etiquetas en minúscula de frase. Itálica 800 solo para la palabra
  que se mueve en la escena 5 («intacta»), como señal de movimiento.
- `font-variant-numeric: tabular-nums` en todas las cifras que cuentan.
- Archivos locales en `public/fonts/` (OFL): Barlow 400/500/600 y Barlow Condensed 600/700 de la
  app; Barlow Condensed 800/900 y 800 itálica de @fontsource.

## Espacio y medida
- Unidad: `--u = min(100vw / 1920, 100vh / 1080)`. Todo se escribe en múltiplos de `--u`,
  así el lienzo escala igual a 4K y se centra en 16:10.
- Escala de 8: 8, 16, 24, 48, 96, 144, 192.
- Márgenes de lienzo: 144 a los lados, 96 arriba y abajo. Texto de lectura ≤ 18 palabras por línea.
- Composición asimétrica: el móvil se mueve por la rejilla (izquierda, centro, derecha); el
  texto va siempre al lado contrario. Nada centrado salvo portada y cierre.

## Forma y profundidad
- Sin tarjetas. Los bloques de información son tipografía sobre el estudio.
- Radio solo en el móvil (el modelo) y en las fotos flotantes (4 px).
- Profundidad con luz, no con sombras CSS: el foco naranja bajo el móvil, una sombra de contacto
  en el suelo del estudio y desenfoque de profundidad en las fotos lejanas.

## Componentes
- **Móvil 3D** (Three.js): cuerpo procedural de cantos redondeados, marco de aluminio PBR,
  botones en el canto, isla de cámaras con tres lentes y pantalla 9:20 con `VideoTexture` de las
  grabaciones reales. Aluminio grafito satinado (rugosidad 0,55, poco reflejo del HDRI) para que
  se vea igual en todas las escenas. Iluminación HDRI de Poly Haven (`studio_small_09`, CC0), dos
  focos rasantes que solo tocan los cantos (naranja; dorado en el cierre) y una sombra de contacto.
- **Poses**: en reposo, siempre de cara (giro ≤ 0,15 rad) para que la toma se lea. Entre escenas
  se pone de canto (90°), cambia la pantalla mientras no se ve y vuelve de cara; el sentido se
  alterna. En las escenas 2, 7 y 8 sale de cuadro. La vuelta entera es solo de la portada.
- **Primeros planos**: sincronizados con el vídeo, la cámara se acerca a la parte de la pantalla
  que importa y el texto de la escena se aparta: «Tu plan» (escena 3), las series al volver la
  app (5) y el anillo de 734 a 1.033 kcal (6). Después vuelve al plano general.
- **Tomas**: la del alta (escena 3) va en bucle, porque es el plan B de la demo. La sesión (5) y el
  alimento (6) se reproducen una vez y se quedan en el último fotograma: plano general, los tres
  rótulos a la vista y el anillo en 1.033. Se habla unos 50 s en cada una.
- **Palabra gigante**: «GymProFit» entera detrás del canvas 3D; el móvil, delante y abajo, solo
  tapa la parte baja de las letras del centro, así la palabra se lee entera.
- **Revelado por máscara**: las líneas suben desde un `clip-path`, guiadas por el scroll.
- **Contador**: cifra que cuenta con el scroll, con el ancho final reservado.
- **Gráfico de commits**: barras por mes que crecen con el scroll; TFG en niebla, después en naranja.
- **Esquema de piezas**: el móvil y, detrás, API, base de datos, panel y web, en texto. Trazos
  como en el README de GymProFit: móvil → API, panel → API y API → base de datos; la web es
  estática y va sin trazo.
- **Etiqueta vertical de margen**: texto girado 90° en el borde izquierdo con el dato real de la
  escena (versión, dominio, fecha de los datos).
- **Contador de escena** abajo a la derecha: «3 de 9». La charla es una secuencia, por eso se numera.

## Movimiento
- Todo con scrub (ScrollTrigger + Lenis): el scroll es la línea de tiempo. Escenas fijadas.
- Un solo momento destacado, en la portada: con la primera tecla o el primer scroll (no al
  cargar, para que lo vea el público), el móvil sale de la oscuridad dando media vuelta, con el
  foco barriendo el canto, y se queda delante de la palabra. Es la única vuelta entera.
- Curvas: `power3.out` para entradas por máscara; `none` para lo que sigue al scroll.
- Teclado: espacio, → y Av Pág van a la escena siguiente; ←, Re Pág a la anterior (scroll suave
  de 1,8 s).
- `prefers-reduced-motion`: sin scrub ni 3D en movimiento; cada escena muestra su estado final.

## Imagen
- Sin fotos de archivo: la única imagen es la app real dentro del móvil. Las fotos de Unsplash
  que se probaron en las escenas 4 y 6 no se veían y se quitaron.
- Iconos: ninguno. El logo es `logo-g.svg` (la G de la app).

## Prohibido en esta web
Tarjetas idénticas, degradados morados, iconos de relleno, emojis, mayúsculas espaciadas,
cadenas «A · B · C», flechas decorativas, líneas bajo los títulos, fundidos genéricos.
