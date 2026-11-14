# Mapa simplificado del campus en 8 zonas — instrucciones de implementación

Fuente: lámina oficial "Campus Hermosillo 2026" (Dirección de Infraestructura y Adquisiciones, UNISON). Las zonas se trazaron sobre la lámina siguiendo los ejes de las calles internas y se verificaron superponiéndolas al plano.
Referencia visual del resultado esperado: [`mapa-campus-zonas.svg`](mapa-campus-zonas.svg).

## 1. Objetivo

Reemplazar el mapa vacío de `frontend/src/components/search/CampusZoneSelector.jsx` (hoy un cuadro con círculos en posiciones arbitrarias) por un mapa esquemático del campus dividido **únicamente** en las 8 zonas fijas. La silueta del campus partida en 8 secciones clicables, sobre el plano real recortado (ver "Actualización" abajo).

`ZONA-MOVIL` no tiene forma en el mapa; sigue disponible en el `<select>` y en el botón "Venta móvil".

### Actualización: plano real de fondo

El mapa ya no es de colores planos. Debajo de los polígonos va la lámina oficial recortada al contorno de las zonas (todo lo de afuera es transparente):

- Imagen: `frontend/src/assets/mapa-campus-hermosillo.webp` (2000×1100 px, con canal alfa, ~370 KB). Ya está en el repo; no regenerarla.
- Cubre exactamente el `viewBox` `0 0 1000 550`, así que los polígonos de la sección 4 calzan sobre ella sin ajustes.
- Resultado esperado: [`mapa-campus-zonas-vista-previa.png`](mapa-campus-zonas-vista-previa.png).

Cambios respecto a la sección 5 (lo demás se mantiene):

1. `import campusMap from '../../assets/mapa-campus-hermosillo.webp';` y, como primer hijo del `<svg>`, `<image href={campusMap} x="0" y="0" width="1000" height="550" preserveAspectRatio="none" />`.
2. Polígono normal: `fill={shape.color}`, `fillOpacity="0.35"`, `stroke="#002D62"`, `strokeWidth="2.5"`. Seleccionado: `fill="#F2A900"`, `fillOpacity="0.6"`, `stroke="#002D62"`, `strokeWidth="4"`.
3. Círculo de la etiqueta con `stroke="#FFFFFF"` y `strokeWidth="1.5"` para que destaque sobre el plano.
4. Quitar la clase `bg-slate-50` del `<svg>` solo si el fondo de la tarjeta ya es claro; el área fuera del campus debe verse limpia, sin calles ni manzanas vecinas.
5. Agregar en `frontend/src/assets/README.md` la procedencia de la imagen: lámina "Campus Hermosillo 2026" de la Dirección de Infraestructura y Adquisiciones (www.dia.unison.mx), recortada al contorno del campus.

## 2. Sistema de coordenadas

- `viewBox="0 0 1000 550"`, norte arriba.
- Los polígonos se guardan en el frontend, indexados por `codigo` (no por `id`). **No se cambia `schema.sql`.**
- `campus_zones.mapa_x` / `mapa_y` (enteros 0–100) se conservan como posición porcentual de la etiqueta principal: `x_svg = mapa_x * 10`, `y_svg = mapa_y * 5.5`. Para dibujar se usan las `etiquetas` exactas de la sección 4; los valores de BD solo se actualizan para que sean coherentes.

## 3. Las 8 zonas

| # | `codigo` | Nombre | Qué abarca | Límites | `mapa_x` | `mapa_y` |
| - | - | - | - | - | - | - |
| 1 | `ZONA-CIENCIAS` | Ciencias Exactas y Computación | Manzana 3, parte oeste y sur: 3C Geología, 3D–3G y 3R Física y Polímeros, 3K1–3K4 Matemáticas y Ciencias de la Computación, 3H, 3I, 3L, 3M, 3P | O: Calle de la Sabiduría · N: Av. Universidad (hasta antes de 3A) · E: límite con 3Q/3O/Centro de las Artes · S: Av. Luis Donaldo Colosio | 75 | 77 |
| 2 | `ZONA-BIBLIOTECA` | Biblioteca Central y Museo | **Dos piezas.** (a) Biblioteca Central 12F. (b) Rectoría 2A, Vicerrectoría y manzana 11, explanada de Calle Rosales y Museo y Biblioteca 1A | (a) Av. Sonora, Calle del Conocimiento, Comedor. (b) Blvd. Luis Encinas, Calle de la Sabiduría, Calle de la Cultura, Av. Universidad | 79 | 48 |
| 3 | `ZONA-PLAZA` | Plaza del Estudiante y Comedor Universitario | Plaza del Estudiante (04) y Comedor Universitario 12D | N: Av. Sonora · E: Calle de la Cultura · S: Av. Universidad · O: Biblioteca Central | 71 | 51 |
| 4 | `ZONA-INGENIERIA` | División de Ingeniería | Manzana 5 (Ing. Química, Industrial, Civil y Minas, Químico Biológicas), manzana 8 (Ing. Industrial y Electrónica, Mecatrónica, Servicios Escolares, estacionamiento multinivel) y sur de la manzana 12 (Ing. Civil 12A–12C, 12E) | N: Av. Sonora · O: Calle de la Reforma y Calle del Conocimiento · E: Calle de la Sabiduría · S: Av. Colosio | 62 | 75 |
| 5 | `ZONA-SOCIALES` | Ciencias Sociales, Derecho y Contabilidad | Manzanas 9 y 10: Derecho, Contabilidad, Economía, Psicología y Comunicación, Sociología, Historia, Trabajo Social, Enfermería | O: Calle de la Reforma · N/E: Blvd. Luis Encinas · E: Calle de la Sabiduría · S: Av. Sonora | 52 | 27 |
| 6 | `ZONA-SALUD` | Ciencias Biológicas y de la Salud | Sur de la manzana 7: Medicina (7C, 7D, 7E, 7H, 7I, 7J), Odontología 7K, Unidad de Posgrado 7F, 7A, Instituto de Geología | N: pista perimetral del área deportiva · E: Calle de la Reforma · S: Av. Colosio · O: Calle Francisco Q. Salazar | 21 | 86 |
| 7 | `ZONA-HUMANIDADES` | Humanidades y Bellas Artes | Manzana 3, parte norte y este: Letras y Lingüística 3A/3Q, 3B, 3U, Humanidades y Bellas Artes 3T, Música 3N, Arquitectura y Diseño 3O, Centro de las Artes 3J | N: Av. Universidad · E: Calle Rosales · S: Av. Colosio · O: límite con zona 1 | 89 | 69 |
| 8 | `ZONA-DEPORTIVA` | Área Deportiva y Gimnasio Universitario | Norte de la manzana 7 (Gimnasio 7B, canchas, estadios de béisbol y softbol, fútbol, alberca) y manzana 6 (Estadio Miguel Castro Servín, tiro con arco) | N: Blvd. Navarrete · O: Calle Francisco Q. Salazar · E: Calle de la Reforma (norte) y Calle del Conocimiento (sur) · S: zona 6 y Av. Colosio | 23 | 45 |

Notas de asignación:
- La zona 2 es la única con dos piezas: la Biblioteca Central y el Museo están separados físicamente por la Plaza del Estudiante (zona 3). Ambas piezas llevan el mismo número, color y comportamiento.
- Enfermería está en la manzana 10 y queda dentro de la zona 5 por contigüidad; la descripción de la zona 6 ya no debe mencionarla.
- Lenguas Extranjeras (manzana 13) está fuera del polígono principal, al sur de Av. Colosio; no se dibuja. Quien venda ahí elige la zona 7.

## 4. Datos listos para copiar

Crear `frontend/src/data/campusZoneShapes.js`:

```js
export const CAMPUS_MAP_VIEWBOX = '0 0 1000 550';

export const CAMPUS_ZONE_SHAPES = {
  'ZONA-CIENCIAS': {
    color: '#CFE3F7',
    etiquetas: [[750, 426]],
    poligonos: ['684,338 755,325 765,324 765,366 815,366 815,450 853,450 854,499 707,510 690,382']
  },
  'ZONA-BIBLIOTECA': {
    color: '#FBE3A6',
    etiquetas: [[790, 265], [587, 281]],
    poligonos: [
      '540,261 610,254 634,251 634,302 546,311',
      '653,99 684,134 721,176 757,202 832,215 915,213 978,204 989,283 929,292 913,300 846,311 755,325 750,239 669,247 654,162'
    ]
  },
  'ZONA-PLAZA': {
    color: '#D9F0D3',
    etiquetas: [[713, 283]],
    poligonos: ['634,251 669,247 750,239 755,325 684,338 676,298 634,302']
  },
  'ZONA-INGENIERIA': {
    color: '#E3D9F2',
    etiquetas: [[618, 412]],
    poligonos: ['381,274 540,261 546,311 634,302 676,298 684,338 690,382 707,510 579,524 557,350 390,368']
  },
  'ZONA-SOCIALES': {
    color: '#F9D5CF',
    etiquetas: [[522, 147]],
    poligonos: ['368,49 397,38 500,9 548,11 577,22 610,55 653,99 654,162 669,247 634,251 610,254 540,261 381,274 375,179']
  },
  'ZONA-SALUD': {
    color: '#CDEDEA',
    etiquetas: [[206, 471]],
    poligonos: ['19,399 90,431 233,428 232,359 268,359 272,401 305,404 307,460 393,460 396,535 324,538 243,521 127,479 22,440 9,424']
  },
  'ZONA-HUMANIDADES': {
    color: '#F6D3E6',
    etiquetas: [[886, 382]],
    poligonos: ['765,324 846,311 913,300 946,465 934,490 919,493 854,499 853,450 815,450 815,366 765,366']
  },
  'ZONA-DEPORTIVA': {
    color: '#DDE8B9',
    etiquetas: [[228, 250]],
    poligonos: ['257,92 277,72 351,53 368,49 375,179 381,274 390,368 557,350 579,524 515,528 396,535 393,460 307,460 305,404 272,401 268,359 232,359 233,428 90,431 19,399']
  }
};
```

Los polígonos comparten vértices en sus fronteras: teselan la silueta sin huecos ni traslapes. No redondear ni reescalar las coordenadas.

Reemplazar el arreglo `zones` de `backend/database/seed.js` (mismo orden, mismos `codigo` y `nombre`; cambian descripción y coordenadas):

```js
const zones = [
  ['ZONA-CIENCIAS', 'Ciencias Exactas y Computación', 'Edificios 3C a 3I, 3K, 3M, 3P y 3R: Matemáticas, Computación, Física y Geología', 75, 77],
  ['ZONA-BIBLIOTECA', 'Biblioteca Central y Museo', 'Biblioteca Central, Rectoría, Vicerrectoría y Museo y Biblioteca', 79, 48],
  ['ZONA-PLAZA', 'Plaza del Estudiante y Comedor Universitario', 'Corazón del campus: Plaza del Estudiante y Comedor Universitario', 71, 51],
  ['ZONA-INGENIERIA', 'División de Ingeniería', 'Ingeniería Civil, Industrial, Química, Minas, Mecatrónica, Químico Biológicas y Servicios Escolares', 62, 75],
  ['ZONA-SOCIALES', 'Ciencias Sociales, Derecho y Contabilidad', 'Derecho, Contabilidad, Economía, Psicología, Comunicación, Sociología, Historia, Trabajo Social y Enfermería', 52, 27],
  ['ZONA-SALUD', 'Ciencias Biológicas y de la Salud', 'Medicina, Odontología y Unidad de Posgrado', 21, 86],
  ['ZONA-HUMANIDADES', 'Humanidades y Bellas Artes', 'Letras, Música, Arquitectura, Bellas Artes, Centro de las Artes y Lenguas Extranjeras', 89, 69],
  ['ZONA-DEPORTIVA', 'Área Deportiva y Gimnasio Universitario', 'Gimnasio Universitario, canchas, alberca, estadios de béisbol y Estadio Castro Servín', 23, 45],
  ['ZONA-MOVIL', 'Vendedor en Movimiento / Entrega a Acordar en Campus', 'Sin punto fijo, se desplaza entre departamentos', null, null]
];
```

## 5. Cambios en `CampusZoneSelector.jsx`

Mantener la firma del componente, el `<select>`, el botón "Venta móvil" y "Limpiar zona". Cambiar solo el `<svg>`:

1. `viewBox={CAMPUS_MAP_VIEWBOX}`, clases `w-full max-w-2xl mx-auto rounded-xl border border-slate-200 bg-slate-50`. Quitar el `<path>` del recuadro y la cruz blanca.
2. Por cada zona con entrada en `CAMPUS_ZONE_SHAPES[zone.codigo]`, un solo `<g>` con `role="button"`, `tabIndex={0}`, `aria-label={zone.nombre}`, `aria-pressed`, `onClick` y `onKeyDown` (Enter y Espacio), igual que hoy. Dentro: un `<title>`, un `<polygon>` por cada elemento de `poligonos` y una etiqueta por cada elemento de `etiquetas`.
3. Polígono normal: `fill={shape.color}`, `stroke="#FFFFFF"`, `strokeWidth="3"`, `strokeLinejoin="round"`. Seleccionado: `fill="#F2A900"`, `stroke="#002D62"`. Dibujar la zona seleccionada al final para que su borde no quede tapado.
4. Etiqueta: `<circle r="16">` más `<text fontSize="18" fontWeight="700" textAnchor="middle" y={cy + 6} pointerEvents="none">` con `zone.orden_visual`. Normal: círculo `#002D62`, número blanco. Seleccionada: círculo `#002D62`, número blanco (el dorado nunca se usa como color de texto, RNF-04).
5. Indicador de norte: `<text x="965" y="40" fontSize="18" fill="#002D62">N ↑</text>`.
6. Foco visible por teclado en el `<g>` (por ejemplo `focus-visible:outline` o un `stroke` navy de 4 al enfocar).
7. Una zona de la API sin entrada en `CAMPUS_ZONE_SHAPES` simplemente no se dibuja; sigue en el `<select>`.

Accesibilidad móvil (RNF-02): en 360 px de ancho la pieza de la Biblioteca Central mide menos de 44 px. El `<select>` es la alternativa táctil y debe permanecer.

## 6. Documentación y datos existentes

- Si `especificacion_tecnica_emprendebuho.md` o `docs/especificacion-base-de-datos.md` listan las descripciones o coordenadas del seed de `campus_zones`, actualizarlas en el mismo commit y registrar la decisión en `docs/decisiones-tecnicas.md` (regla de oro de `AGENTS.md`).
- El seed solo corre en una base vacía: ejecutar `npm run db:reset` para ver las nuevas coordenadas.
- Revisar pruebas que dependan de `mapa_x`, `mapa_y` o de los círculos del mapa (`frontend/tests/integration.test.js`, `frontend/tests/browser.e2e.mjs`, `backend/tests/`).

## 7. Criterios de aceptación

- [x] El mapa muestra exactamente 9 polígonos (8 zonas; la zona 2 en dos piezas) sin huecos ni traslapes, igual a `docs/mapa-campus-zonas.svg`.
- [x] Debajo de los polígonos se ve el plano real del campus y fuera del contorno no aparece nada (ni calles ni manzanas vecinas).
- [x] Clic, Enter o Espacio sobre una zona la selecciona y sincroniza el `<select>`; elegir en el `<select>` resalta la zona en el mapa.
- [x] Al seleccionar la zona 2 se resaltan sus dos piezas.
- [x] `ZONA-MOVIL` no aparece en el mapa y sigue funcionando en lista y botón.
- [x] Ningún texto usa `#F2A900` sobre fondo claro.
- [x] `npm test`, `npm run build` y `npm run lint` pasan.
