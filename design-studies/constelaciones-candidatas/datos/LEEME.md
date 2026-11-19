# datos — las 88 constelaciones

## Qué hay acá

| archivo | qué es |
|---|---|
| `fuente-constellations.lines.json` | copia vendorizada del dataset original (FeatureCollection, 89 features, 27 KB) |
| `LICENCIA-d3-celestial.txt` | el texto completo de la licencia, tal cual está en el repo de origen |
| `nombres-88.mjs` | los 88 nombres (español, inglés, latín, alternativas) con su procedencia |
| `construir-catalogo.mjs` | el script que arma la versión reducida |
| `catalogo-88.json` | **generado** — la versión reducida y versionada, con procedencia y licencia adentro |

## Fuente y licencia

- Dataset: `data/constellations.lines.json` de [d3-celestial](https://github.com/ofrohn/d3-celestial),
  de Olaf Frohn.
- Licencia: **BSD 3-Clause**. *Copyright (c) 2015, Olaf Frohn. All rights reserved.*
- Se conserva el aviso de copyright y el texto completo de la licencia en esta carpeta; la página
  `catalogo.html` y el bloque `meta` de `catalogo-88.json` citan fuente, autor y licencia.
- `sha256` del archivo vendorizado:
  `294f66bef5d5cf50b1e17f16d2efa1d97a15131612c68dd935adef6e7373e13c`.

No hubo que interpretar la licencia: el repo trae `LICENSE` en la raíz y es BSD 3-Clause, que
permite redistribuir conservando el aviso y la licencia.

## Reconstruir

```
node datos/construir-catalogo.mjs
```

No toca la red: lee el archivo vendorizado y `nombres-88.mjs`. Si se actualiza el dataset, se
reemplaza `fuente-constellations.lines.json`, se actualiza el `sha256` del bloque `meta` en el
script y se vuelve a correr. El script falla si el archivo no trae exactamente 88 constelaciones o
si algún id se queda sin nombre.

## Forma de `catalogo-88.json`

```
{ meta: {...}, constelaciones: [ { id, nombre_es, nombre_en, nombre_la, nombre_es_fuente,
  nombre_es_alternativos, rank, dec_media, nodos, segmentos, lineas } ] }
```

- `id`: abreviatura IAU (`And`, `Ori`, `UMa`…).
- `lineas`: las polilíneas del dataset, en pares `[RA, Dec]` J2000. RA en grados en `[-180, 180)`
  tal como viene en el dataset; Dec en grados `[-90, 90]`. Cada par consecutivo de una polilínea es
  un segmento.
- `nodos`: vértices distintos de la figura (sin contar repetidos).
- `dec_media`: promedio de la Dec de los nodos, para el filtro de hemisferio.
- `rank`: campo `rank` del dataset (1–3).

## Qué NO dice este dataset

- Las líneas que unen estrellas son **convencionales**: la IAU define límites y abreviaturas, no
  figuras. Otro dataset dibuja la misma constelación con otros enlaces.
- `rank` es la jerarquía de estilo del dataset (mayor tamaño o brillo para el nombre), no una
  categoría oficial.
- No hay magnitudes: los puntos de la página pesan todos igual.
- Serpens viene partida en dos features (Caput y Cauda); acá es una constelación con las dos partes
  y un solo conteo. 89 features = 88 constelaciones.
