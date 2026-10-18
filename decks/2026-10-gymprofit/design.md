# Diseño

## Portada elegida
A, segura («La marca»). Fiel a la app en modo oscuro.

## Paleta

| Hex | Nombre | Función |
|-----|--------|---------|
| #0B0C0E | Grafito | Fondo de todas las diapositivas (dominante) |
| #1B1E24 | Superficie | Pista vacía de los arcos |
| #F2F2F3 | Hueso | Titulares y texto principal |
| #A1A9B6 | Niebla | Texto secundario, tramo del TFG y conectores |
| #FF6A00 | Naranja | Arcos y cifras clave, siempre en masa, nunca como filete |
| #ECBB3D | Dorado | Solo la G del logo (portada y cierre): acento único |

## Tipografías

| Familia | Papel | Pesos | Archivo |
|---------|-------|-------|---------|
| Barlow Condensed | Titulares y cifras | 700 | assets/fonts/barlow-condensed-700.woff2 |
| Barlow | Texto | 500, 600 | assets/fonts/barlow-500.woff2, assets/fonts/barlow-600.woff2 |

Licencia: assets/fonts/OFL-barlow.txt. Logo: assets/logo-g.svg (vectorizado del logo de la app, dos paths).

## Motivo visual
El arco de la G: anillo grueso (grosor = 17 % del diámetro, extremos rectos) que empieza a las 12 y gira
en sentido horario, con la pista en Superficie y los tramos en Naranja o Niebla. Siempre mide algo real;
nunca es decorativo.

## Movimiento
- Una sola transición: fundido de 300 ms con cubic-bezier(.2,0,0,1).
- Lo que mide algo se construye al entrar, con 1 − (1 − t)³, y se repite cada vez que se entra:
  - Portada y cierre: la G se descubre con un barrido desde las 12 (1.100 ms).
  - 2 (momento fuerte, «Cifras que cuentan»): el tramo Niebla aparece en 300 ms; después el Naranja barre en 1.200 ms mientras «645» cuenta de 0 a 645.
  - 3: los cinco tramos se completan uno tras otro, como las cinco preguntas.
  - 4: el anillo de la API se cierra y luego se trazan los conectores (app, base de datos, panel).
  - 5: se apuntan las dos series del primer arco; al volver, el tercero se restaura de golpe.
  - 6, 7 y 8: las cifras cuentan desde 0 (198.000, 403, 1.100, 26, 49); en la 7 el conector crece antes del 403 y en la 8 el anillo se cierra con la cuenta.
- El texto no se anima. Las cifras reservan su ancho final para no mover nada mientras cuentan.
- El HTML lleva el estado final; con prefers-reduced-motion se muestra directo, sin animar.
