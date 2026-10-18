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
- Un solo momento destacado, en la diapositiva 2. Al activarse, el tramo Niebla aparece en 300 ms; después,
  el tramo Naranja barre el anillo en 1.200 ms con 1 − (1 − t)³ mientras «645» cuenta de 0 a 645
  (momento 7 de la app, «Cifras que cuentan»). Se repite cada vez que se entra en la diapositiva.
- Nada más se anima. El HTML lleva el estado final; con prefers-reduced-motion se muestra directo.
