# presentaciones-web

Presentaciones web de un solo archivo con el plugin frontend-slides.

## Regla principal
Cualquier petición de presentación, deck, diapositivas o slides sigue **siempre** la skill `presentaciones` (`.claude/skills/presentaciones/SKILL.md`), sin saltarse pasos. frontend-slides es la herramienta de construcción; la skill manda sobre ella en proceso y estilo.

## Estructura
```
decks/
  _plantilla/            # se copia con nuevo-deck; no editar para un deck concreto
  AAAA-MM-tema/
    brief.md             # público, duración, objetivo, idea clave
    guion.md             # nº | titular-afirmación | evidencia visual | nota del orador | s
    design.md            # paleta 4-6 hex con función, tipografías, motivo visual (propio del deck)
    index.html           # la presentación; diapositivas = <section class="slide">
    assets/              # fuentes locales (assets/fonts/), imágenes
    renders/             # NN.png (ignorados por git)
    AAAA-MM-tema.pdf     # respaldo
  AAAA-MM-tema-web/      # deck web: lo mismo + package.json, src/, public/, dist/ (ver «Decks web»)
scripts/                 # Node + Playwright, funcionan en PowerShell
site/                    # página índice de Pages (build-site inyecta la lista de decks)
docs/                    # deck de muestra y capturas del README; no se publica
.claude/agents/deck-critic.md
.github/workflows/pages.yml
```

## Comandos
| Comando | Qué hace |
|---|---|
| `npm run nuevo-deck -- "Tema" [AAAA-MM]` | Copia `_plantilla` a `decks/AAAA-MM-tema/` |
| `npm run render -- <deck>` | PNG 1920x1080 por diapositiva en `renders/`; avisa de desbordes, cortes, solapes y texto < 24 pt. Código 1 si hay desbordes o cortes |
| `npm run pdf -- <deck>` | `decks/<deck>/<deck>.pdf`, una página por diapositiva |
| `npm run build-decks` | `npm ci` + `npm run build` en cada deck web (lo usa el workflow de Pages) |
| `npm run build-site` | Monta `_site/` (lo usa el workflow de Pages); de los decks web copia su `dist/` |
| `npm run recorrido -- <deck>` | Graba un recorrido con movimiento normal en `renders/recorrido.webm` (decks web) |
| `npm run presentar -- <deck>` | Construye si hace falta, sirve sin internet en `http://127.0.0.1:4321/` y abre el navegador |

## Decks web (con package.json)
Un deck con `package.json` es una web de scroll con Vite (p. ej. Three.js, GSAP, Lenis). Primero: `decks/2026-10-gymprofit-web/`.
- `index.html` es la fuente de Vite; se publica `dist/` (ignorado por git), construido con `base: './'` para que las rutas sean relativas.
- Render, pdf, recorrido y presentar construyen el deck antes y sirven `dist/` (con peticiones Range para los vídeos).
- Cada escena es una `<section class="slide">`. Si se le pone `.active` desde fuera, la página salta a su estado final (un MutationObserver). Con `prefers-reduced-motion` (lo que emulan render y pdf) cada escena mide 100vh y muestra su fotograma clave en vez del vídeo.
- Los recursos estáticos van en `public/` (fuentes, fotos, HDRI y vídeos editados). Las grabaciones originales van en `grabaciones/` (ignorada); `npm run tomas` dentro del deck las edita.
- Las notas del orador siguen siendo comentarios HTML dentro de cada `.slide`.

## Requisitos técnicos del index.html
- Cada diapositiva `class="slide"`; la visible lleva `.active` (los scripts la activan así).
- Lienzo 1920x1080: 30 pt ≈ 60 px, mínimo 24 pt ≈ 48 px.
- Rutas relativas; fuentes con `@font-face` desde `assets/fonts/`. Nada que dependa de internet al presentar.
- Notas del orador como comentarios HTML dentro de cada `.slide`.

## Revisión
Tras `npm run render`, lanzar el subagente `deck-critic` con el nombre del deck. Corregir solo fallos reales; máximo 2 rondas.
En un deck web, antes: `npm run recorrido` y comparar sus fotogramas con las referencias del deck (transiciones y vídeos no salen en render).

## Definición de terminado
1. `npm run render -- <deck>` termina sin desbordes ni cortes.
2. `deck-critic` devuelve `Sin fallos.` o solo fallos menores aceptados por el usuario.
3. `npm run pdf -- <deck>` exportado.
4. Nota del deck escrita en el vault.

## Notas y memoria (fuera del repo)
Decisiones, aprendizajes y notas de cada deck **no** se guardan en el repo, sino en un vault de Obsidian externo, en su carpeta `presentaciones-web/`. La ruta real está en `CLAUDE.local.md` (no versionado). Si no existe, pregunta la ruta antes de escribir notas.

- `MEMORY.md` — índice del proyecto: una línea por deck y por tema.
- `deck-AAAA-MM-tema.md` — una nota por deck: tema, fecha, estilo elegido y por qué, qué funcionó y qué no.

**Antes de empezar un deck, lee el índice y las notas de decks anteriores para no repetir estilos.** Al terminarlo, crea su nota y añade su línea al índice.

## Commits
Conventional Commits en español. Sin `Co-Authored-By`.
