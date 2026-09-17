# Morph de Modal — contrato de ciclo de vida

Documento de estado y contrato. Última revisión: 15/09/2026.
Cubre el morph (fantasmas + shell), el ciclo de vida de los modales y cómo se mide.

## Mapa de archivos

| Archivo | Qué manda ahí |
|---|---|
| `src/components/Modal/gsap-morph.js` | El motor `mode: 'gsap'`: `gsapMorphFromOrigin` (devuelve `settle`, `abort`, `abandonContent`), `gsapMorphToOrigin` (devuelve `settle`, `abort`, `retarget`, `abandonContent`, `dispose`), fantasmas, medición, `hideOrigin`/`restoreOrigin` |
| `src/components/Modal/morph.js` | Los modos `travel` / `transform` / `simple` (misma API, sin fantasmas) |
| `src/components/Modal/host.js` | Quién crea y destruye cada modal (`enter`, `leave`, `sync`, `finish`), el lock de scroll, el overlay, y las guardias de ciclo de vida |
| `src/components/Modal/store.js` | Estado de los items (`open`, `close`, `update`, `remove`) |
| `src/components/Modal/card.js` | Mete el contenido en la card del modal (`fillBody`) |
| `src/components/Modal/Modal.vue` | Wrapper de Vue: slot -> modal, `v-model:open`, props |
| `src/views/GsapMorphView.vue` | Demo/playground donde se mide (3 triggers) |
| `.reasonix/harness/` | Arnés de medición (gitignored, no se commitea) |
| `.reasonix/probe/RESULTADOS.md` | Resultados crudos de esta ronda de verificación |

## Cómo DEBE comportarse

1. **Cada apertura es un modal propio.** Un item por open, con su diálogo, su shell, su
   body y su contenido. Nunca se recicla ni se comparte el elemento de otro modal: si el
   modal A se está cerrando y el usuario abre B, A sigue cerrando con su animación normal,
   en el fondo, y B entra encima.
2. **Un abrir nunca se descarta.** Llegue cuando llegue (con otro modal abierto, abriendo o
   cerrándose), la petición se honra: se manda cerrar el anterior y se abre el nuevo.
   "Abrir modales tan rápido como quiera" es un requisito, no un caso borde.
3. **El modal bloquea el fondo siempre, y el clic fuera cierra siempre.** No hay modo no
   bloqueante: el overlay captura, la página va `inert`, el scroll se congela y el diálogo
   es `aria-modal="true"`. Mientras haya uno encima no se abre nada desde fuera: para abrir
   otro hay que cerrar el anterior.
4. **El trigger oculto sigue siendo picable, y el lock suelta en cuanto el cierre
   empieza.** Esa pareja es la que hace posible el doble clic de memoria muscular: la
   primera picada la recoge el overlay y cierra; la segunda llega ya al trigger (sin
   `inert` y sin `pointer-events: none`) y abre el modal nuevo encima del que se va. El
   origen se oculta con `opacity: 0`, nunca con `pointer-events: none`.
5. **El modal viejo se cierra entero y sin prisas**: su shell, su contenido y su vuelo de
   fantasmas llegan a su destino. Nadie lo mata a mitad por abrir otro.
6. **Contenido por modal.** El nodo de contenido vivo se lo queda el modal NUEVO (es el
   que interactúa, y así conserva los listeners del framework); el viejo recibe una copia
   visual y suelta el contenido: deja de escribir en nodos que ya no son suyos.
7. **Un trigger no se destapa mientras lo esté usando otro modal vivo.** En una ráfaga
   desde el mismo trigger, el que se va primero no puede dejarlo visible debajo del nuevo.
8. **Un cierre que releva una apertura a medio camino continúa desde la geometría viva**
   (no salta al tamaño completo del modal antes de empezar a cerrarse).
9. **Estados de reposo garantizados** (esto es lo que se mide, no lo que se supone):
   0 hosts de fantasmas huérfanos, 0 contenido con `opacity: 0` sin restaurar, el trigger
   con su opacidad correcta (oculto si su modal está abierto, visible si no) **y con su
   `transition` como estaba** (no un `none` pegado), **su icono y su texto en su estado
   natural** (sin `opacity` inline), sin lock de scroll colgado, y 1 diálogo abierto /
   0 cerrado.
10. **La visibilidad del contenido compartido se posee por ELEMENTO, con recuento.** En una
    ráfaga al mismo trigger hay tres vuelos vivos escondiendo el MISMO icono y el MISMO
    texto del origin; el valor natural vuelve cuando suelta el **último**, no cada uno al
    terminar el suyo. Si cada transición devuelve "su" valor guardado, la última en soltar
    escribe el `0` que leyó de otra y el origin se queda vacío para siempre.
11. **El texto compartido vuela en las hileras del DESTINO, no en las del origen.** Las tres
    combinaciones son la regla, no la casualidad: origen de una hilera + destino de una
    hilera → **una hilera durante todo el vuelo** (nada se apila); origen apilado + destino
    de una hilera → arranca apilado y **se corrige** mientras vuela; origen de una hilera +
    destino apilado → el texto **se apila** al llegar. Apilarse es una función, pero solo
    cuando el modal de destino la tiene.
12. **El mismo modal reabriéndose no deja su copia anterior a la vista.** Si el modal que se
    está cerrando es el MISMO que se está abriendo (mismo `origin`, o mismo
    contenido/título/variante/tipo), su copia se apaga **en el sitio** — sin vuelo de vuelta,
    sin moverse y **en el mismo frame** (`vanish`: `transition: none; opacity: 0`, y el
    desmonte un tick después, `VANISH_TEARDOWN_DELAY`) — y el modal nuevo entra encima como
    si nada. Con modales **distintos** el relevo sigue siendo el de siempre: las dos copias
    vuelan a la vez, cada una con su contenido, y la vieja aterriza en el fondo.

    **El apagón es instantáneo, no un fundido.** Antes era un fundido de
    `closeVanishDuration` (0.14 s) y ese fundido *era* el bug: duraba lo justo para que se
    vieran las dos superficies montadas una sobre otra. Medido en `#/gsap-morph` con un bucle
    de cerrar/reabrir el mismo trigger cada 210 ms — el mismo instrumento, mismo bucle y
    mismos 10 ciclos en los dos builds:

    | build | cuadros | cuadros con 2 superficies visibles | máx. superficies |
    |---|---|---|---|
    | con el fundido | 221 | **52** | 2 |
    | apagón instantáneo | 228 | **0** | 1 |

    Una superficie cuenta si su shell pasa de 300 px de ancho con `opacity > 0.05`. Los
    cuadros malos son del tipo `{w:319, op:0.81}` + `{w:311, op:1}`: la copia que se va
    fundiéndose **encima** de la que entra, las dos a tamaño parecido y a 8 px una de otra —
    el modal doblado que el dueño fotografió (título partido en dos líneas y cuerpo
    desbordando su caja, porque el contenido viaja a escala completa dentro del shell pequeño
    de la copia que entra).
13. **El seguidor del scroll tiene física, y solo él.** En una variante no-`center`, cuando el
    modal ya está asentado, cada movimiento del trigger escribe `left`/`top` en el diálogo. Eso
    se persigue con **un polo de primer orden** (`placementFollow`, default 0.18 s), nunca de
    golpe: la distancia se reparte y el modal acompaña al trigger en vez de teletransportarse
    detrás de él. Un polo **no puede sobrepasar**, y eso es requisito, no gusto: un modal que
    rebota alrededor de su trigger mientras se scrollea se lee como un error.
    `placementFollow: 0` es exactamente el comportamiento anterior (escritura directa en el
    mismo frame), y es el revert de un valor.
14. **El texto vuela con el reloj de la caja, no con el suyo.** El contenido compartido (el
    título, el icono) no tiene timeline propio: es una **función del estado vivo del shell**,
    pintada en el mismo `onChange` que ya pinta la caja, con el mismo `state.roundT`. Su
    destino se re-mide **cada frame** desde el box vivo del destino, no se congela al arrancar.
    Consecuencia medible: en un cierre normal, con arrastre o con scroll en pleno vuelo, el
    fantasma no se separa del rect del shell en **ningún** frame (`ghostPhysics: 'shell'`,
    default; `'timeline'` es la vuelta atrás de un valor).

## Por qué cada pieza (mecanismos)

- **Fantasmas anclados al destino** (`makeGhost`, `measureAscents`, `flyGhosts`): el
  fantasma se construye con las métricas del DESTINO y es la matriz la que viaja
  (`startScale = 1/scale`, escala uniforme por font-size), arrancando colgado de la
  baseline del origin y aterrizando en escala 1, donde el fantasma ES el render nativo del
  destino. Las ascensiones se miden en un host propio y oculto (`apr-ghost-metrics`) con
  gemelos + sonda inline-block: nunca entra un nodo de medición en el host de vuelo.
- **`hideOrigin(origin, { clickable: true })`** / **`hideOriginForClose`**: el origen se
  oculta a la vista (`opacity: 0`) pero conserva `pointer-events`, así que sigue siendo el
  sitio donde el usuario pica. Es la mitad de la regla 4. `hideOriginForClose` **delegaba en
  una copia** del cuerpo de `hideOrigin` (sin su registro): se unificó, y `morph.js` ahora
  reexporta el par de `gsap-morph.js` en vez de duplicarlo.
- **Propiedad de opacidad con recuento** (`opacityClaims`, `claimOpacity`/`releaseOpacity`):
  `WeakMap` por elemento con `{ count, natural }`. El primero en reclamar guarda el valor
  natural (el que no escribió ninguna transición) y el último en soltar lo devuelve. Es la
  regla 10, y `createVisibilityController.show`/`clear` son el mismo camino: **soltar es
  restaurar**, nunca "olvidar sin soltar".
- **`shellBaseRect` en el cierre**: el destino se mide contra la base del shell (su rect con
  `transform: none`), no contra `shellRect` (que ya lleva el translate vivo de la apertura
  dentro), y el movimiento **arranca** en ese translate vivo (`state.x/y`). El
  `position/left/top: 0` que pone el cierre caen en el padding box del diálogo, que es donde
  el shell está en flujo: la base no se mueve con esas escrituras. Es la regla 8 **completa**:
  continuar desde la geometría viva no basta si el destino se mide desde ahí.
- **`transition` del origin guardado** (`originTransitions`): `restoreOrigin` solo escribe
  `transition: none` si tiene algo que suprimir, y con un reflow por medio devuelve el valor
  anterior antes de que el navegador junte las dos escrituras. Sin el registro, la segunda
  restauración (el host suelta el origin cuando el cierre termina, ~200 ms después del
  handoff) escribía `none` y ahí se quedaba: el trigger perdía sus transiciones CSS.
- **Reconciliación del lock** (`lock.held()` en `sync()`): el lock se pide y se suelta por
  bordes, así que un borde perdido dejaría la página `inert` para siempre. `sync()` suelta
  el lock si no queda ningún nodo vivo, y solo si está tomado (una `release()` a secas
  reescribiría el `overflow` del body con lo que capturó al adquirir). **Es una red, no el
  arreglo de un fallo medido**: no se ha reproducido un borde perdido.
- **`contentOwner` + `snapshot`** (host): el nodo de contenido vivo tiene dueño explícito
  (`contentOwner`: nodo -> id del modal que lo tiene). Al abrir, cada modal guarda un
  `snapshot` del contenido **despojado de `opacity`/`filter`/`transform`/`transition`
  inline** (si no, la copia puede nacer invisible o desplazada) y el release se hace al
  **empezar el cierre del dueño** (`releaseContent`, en `leave()`), no en el `enter` del
  nuevo: así `gsapMorphToOrigin` mide el contenido VIEJO y el vuelo de salida dibuja el
  texto que le toca. `takeContent(item)` queda como red para "otro modal tiene el nodo vivo
  y aún no cierra", y en ese caso copia **el snapshot del dueño**, nunca el nodo vivo ya
  re-renderizado por Vue.
- **`abandonContent()`** (motor): `contentController.detach()` (deja de escribir en los
  elementos) + `visibilityController.show()` (restaura; olvidar sin restaurar deja grabada
  la opacidad 0 y el siguiente modal la toma como su estado "visible") +
  `contentController.restore()`, que limpia `opacity`/`filter`/`transform`/`transition`
  inline **ignorando `detached`**: el detach deja de escribir a propósito, así que la
  limpieza tiene que ir por fuera de esa guardia.
- **`settle({ keepGeometry: true })`** (host al cerrar) -> `keepFrozen`: el cierre que
  releva una apertura no suelta el slot congelado, para que `freezeSlot` mida la geometría
  viva. Importa que el `clearFrozen` vaya **antes** del `hideShell` en el `cleanup`: entre
  las propiedades que suelta está `display`, así que al revés el `hideShell` queda en nada.
- **El DESTINO del diálogo no lo escribe el motor, lo escribe `layoutSlot`** (`position` +
  `left` + `top` inline en `.apr-dialog`, solo en las variantes que no son `center`). El
  `clearFrozen` de la apertura las borra igual, y con ellas fuera el diálogo cae al
  `flex-start` de `.apr-item`, que es la esquina **(0,0) del viewport**: un frame pintado en
  la esquina al asentar, y el `trackOrigin` del host lo devuelve a su sitio en el rAF
  siguiente. Por eso la apertura las guarda en `slotOwnedByHost` y las devuelve dentro del
  mismo `if (!keepFrozen)` — mismo tick, así que el frame malo no llega a pintarse. El motor
  de **cierre** sí las escribe él (clava el diálogo mientras mide) y su `cleanup` tiene que
  seguir soltándolas: de ahí que la restauración viva solo en el camino de apertura. El
  `clearFrozen` de `morph.js` nunca las tocó, así que los modos `transform`/`travel`/`simple`
  no tenían este bug. Medido: 1 frame en (0,0) en las 10 variantes no-`center` y 0 en
  `center`, antes; 0 en las 12 después.
- **`slotFor` calcula y `layoutSlot` escribe** (`placement.js`): el cálculo de la posición (la
  rama, el flip arriba/abajo, el clamp, la esquina `inplace-xx`) vive en una función **pura**
  que no toca el DOM, y `layoutSlot` es el único que escribe (clases, `dataset.aprPlacement`,
  `position`, `left`/`top`). No es cosmética: es lo que permite al seguidor del scroll
  perseguir la **salida** del cálculo en vez de su entrada. **Suavizar el rect del trigger es
  peor que no suavizar nada**, porque `slotFor` es discontinuo respecto de ese rect (el flip es
  un escalón). Medido en `anchor` con un scroll de 250 px: recorrido real 11.8 px; suavizando
  la entrada, un salto de **186.98 px** hacia el lado contrario y 80 frames de vuelta (el rect
  suavizado decae por la zona donde el flip se apaga: `rect.top 138.99 + 56 + 8 = 202.99`,
  exacto); suavizando la salida, 1 px en el primer frame y 0 de sobrepaso. Lo discreto (la rama,
  el `dataset`) se aplica de inmediato — un flip no se interpola.
- **`roundT` es un escalar de contrato**, no un detalle interno: el progreso normalizado
  (0→1) del morph, del que cuelgan **los cuatro radios** (`paintShell`) y **el vuelo del
  texto**. Como es un canal que recorre 0→1, no puede llevar umbrales de asentamiento
  absolutos: `normalizedRest(state, targetState)` los deriva del recorrido de la caja
  (`0.4 / travel`) y `roundT` recibe **su propia instancia** del spring `size` (misma
  stiffness, mismos umbrales en su escala) en los dos motores. Medido: sin eso, los radios
  quedaban congelados **20 frames** en la apertura y **33** en el cierre, con la caja todavía
  volando. Es el mismo defecto en `gsap-morph.js` y en `morph.js`, y en el cierre hace falta
  `close: true` explícito: sin él, `roundT` recibe `sizeDamping` mientras `width`/`height`
  reciben `closeSizeDamping`, y el radio llega 13 frames antes. Además `paintShell` recibe el
  quinto argumento (`asPixels = isTransform`) **siempre**: sus dos primeros argumentos se
  calcularon con esa bandera, y omitirla multiplica el resultado por `minSide` (medido: el
  radio saltaba a `1568px` = 28 × 56 en el handoff del cierre de `transform`).

  **Y no se re-apunta con el scroll.** `retarget` re-apunta `x`/`y` (que sí cambian de destino
  cuando el trigger se mueve) pero **no** `roundT`: su destino no cambia con el scroll, así que
  re-animarlo en cada frame de scroll le pondría la velocidad a 0 y **congelaría los radios y
  el texto en pleno vuelo** — justo el artefacto que se estaba quitando. El fantasma se
  re-apunta por su lado (`retarget(nextToBoxes)` + el polo de apuntado).
- **El host de vuelo vive DENTRO del `.apr-item` del propio modal** (`makeFlightHost(dialogEl.parentElement)`),
  no en `document.body`. El `.apr-item` tiene `isolation: isolate`, así que el
  `z-index: 999999` del fantasma queda confinado a su contexto de apilado: el item viejo va
  antes en el DOM que el nuevo, y su vuelo de salida termina **detrás** del modal que entra
  (que es justo el objetivo). De regalo, un cierre que acabe por el safety del host se lleva
  el host de fantasmas por delante con el `itemEl.remove()`, en vez de dejarlo huérfano.
- **Handoff del cierre con dos puertas**: el aterrizaje (pintar el shell sobre el origin y
  desvanecer) se dispara con `transitionend` **y** con un
  `setTimeout(handoffDuration * 1000 + 20)`, por un único `finishHandoff()` idempotente
  (`handoffStarted`/`handoffDone`). Un `transitionend` que no llega —transición coalescida,
  pestaña oculta, vuelta de estilo interrumpida— no puede volver a dejar el cierre a medias.
  El safety del motor sigue detrás como último recurso.
- **El origin se destapa ANTES del fundido, no después** (`canRevealOrigin` en `tryFinish`).
  El shell aterriza clavado a la geometría del trigger (mismo rect y mismo radio, fondo ya
  negro como el trigger), así que el fundido de `closeHandoffDuration` solo es invisible si el
  trigger está debajo: negro sobre negro. Con el trigger oculto durante el fundido, en su
  lugar queda el azul de la página y el shell **se ve**. Medido por frame a 60 fps con el
  trigger oculto: **185 ms** a la vista, el shell en `145,104 278x56 bg=rgb(0,0,0)` bajando de
  `op=1.00` a `op=0.10`; en su pico (`op=0.36`) el píxel compuesto sobre la página es
  `rgb(0,0,116)` sobre `rgb(0,0,176)` — el mismo número medido píxel a píxel en la captura del
  dueño. En clic rápido y repetitivo esa ventana está siempre encendida. Ese era el residuo.
  Arreglado: el origin se destapa en el aterrizaje (fundido negro sobre negro, invisible).
  Medido en un cierre limpio: `3048 TRIGGER op=""` en el mismo frame en que el shell aterriza,
  y `3248 disp=none`; 200 ms de negro sobre negro. Y si el origin **no** se puede destapar
  porque otro modal vivo lo tiene tomado (`shouldRestoreOrigin()` falso), no hay relevo que
  hacer: el fundido se salta entero y el shell se apaga en el mismo frame, así que no queda
  nada pintado encima. Medido en ráfaga: `framesCriticos: 0`.
- **`dispose()` en el cierre + safety acotado del host**: el safety del host ya no está
  desactivado para gsap (`closeMaxDuration ?? 480 + handoff + margen`, antes ~27 h). Y como
  `node.morph` se anula en `leave()`, el cierre guarda su propio `closeMorph` para que un
  `finish()` disparado por el safety pueda desmontar el motor (`dispose()`), que si no deja
  el vuelo colgado.
- **`releaseOrigin(element, exceptNode)` / `originInUse()` / `shouldRestoreOrigin`**: el
  origin solo se devuelve a la vista si ningún otro nodo vivo lo usa como origin o como
  closeTarget. El motor recibe `shouldRestoreOrigin` porque también destapa el origin por
  su cuenta al aterrizar.
- **Bloqueo incondicional**: `lock.acquire` se llama siempre, el overlay siempre captura y
  el diálogo siempre es `aria-modal="true"`. La prop `blocking` y su rama en `host.js` se
  retiraron (ver "Lo que NO hay que volver a hacer").
- **`teardownNode(item, node)`**: el teardown terminal (motor, tracking, gesto, observers,
  contenido, `itemEl.remove()`, `store.remove`, `releaseOrigin`, `restack`, `onRemoved`) vive
  en un solo sitio y lo usan **el cierre normal y la red de `sync()`**. Antes era el `finish()`
  local de `leave()`, así que el único camino que garantiza "no queda un item cubriendo la
  página" solo existía para el cierre — y una apertura rota no tiene cierre.
- **Red de dos niveles contra un ciclo de vida que lanza**: `sync()` envuelve cada paso
  (`enter`/`refresh`/`leave`) y, si lanza, **retira el modal entero** en vez de dejarlo a
  medias; dentro de `enter`, un `try` alrededor del motor de apertura lo cierra con la
  animación normal (mensaje de error propio). El error no se traga: sigue subiendo al
  llamante y sale por consola con su stack. Medido inyectando el fallo en `canMorphFrom` (lo
  primero que mide el origin, antes que el motor): sin red, el item se quedaba en el DOM con
  el modal visible pero sin gesto de cierre y con su overlay `opacity: 0` +
  `pointer-events: auto` tapando la página entera; con red, `n: 0 · inert: 0` a los 150 ms,
  el trigger se destapa y la página sigue abriendo y cerrando modales.

- **Plan de hileras** (`metricsKey` + `snapRows`): las cajas de palabra que produce
  `measureWords` se agrupan por clase de métricas (`fontFamily|fontSize|fontWeight|fontStyle|
  fontStretch|letterSpacing`) y dentro de cada clase se pega `box.top` a la fila más cercana
  con tolerancia `max(1, altura * 0.5)`. **Por clase, no todo junto**: dos palabras de
  tamaños distintos en la misma baseline no están en filas distintas, y mezclarlas las
  desalinearía. Se aplica a las DOS mediciones (`measureWords(fromEl)` y
  `measureWords(toEl)`), así que la regla 11 pasa a ser una invariante del plan en vez de un
  efecto de cómo cayó la medición: medido en `#/gsap-morph` (435 px), el pill dispara con sus
  tres palabras en `top: 904` (una hilera). Destino de una hilera → el vuelo va en una hilera
  todo el rato (`596/596/596 → 363/363/363 → 249/249/249`); destino de dos (`213` y `260`) →
  termina apilado (`215/215/261` y el icono entre las dos, en `238`). Error de aterrizaje
  0-2 px en los tres casos (los 2 px son medio interlineado). Origen apilado a propósito
  (`max-width: 80px` en el texto del trigger: `903/926/948`) con destino de una hilera: en
  vuelo `596/608/620 → 363/367/371 → 249/249/249`, o sea se corrige.
- **`sameModal` + `vanishNode` + `vanish`** (el mismo modal reabriéndose encima): el host
  detecta la identidad en el `enter` del nuevo — por `origin` (mismo trigger), y si no lo hay
  por `content`/`title`/`variant`/`kind`, porque `Modal.vue` comparte un único nodo de
  contenido entre aperturas — y apaga la copia anterior **antes de montar nada**, para que no
  compitan por el mismo sitio en la pantalla ni un frame. `vanish` mata el vuelo de fantasmas
  en el mismo tick, tira el `flightHost` y apaga el shell y el cuerpo **en el mismo frame**
  (`transition: none; opacity: 0`) sin `restoreOriginElement`: el origin de este cierre es el
  trigger que el modal nuevo está usando ahora mismo, y destaparlo aquí lo encendería debajo
  de su propio vuelo de salida (del destape se encarga el teardown, con `originInUse`).
  Medido: `14 op=0.64 translate(1.11644px, 14.295px)` a +80 ms junto al nuevo
  `15 op=1.00 translate(32.2434px, 412.851px)`; la copia está quieta en `1.1, 14.3` toda su
  vida, se va a los ~190 ms y la ráfaga de 8 picadas deja `items: 1 · hosts: 0`.

  El `opacity: 0` es **sin transición** desde el arreglo del modal doblado (ver regla 12): con
  el fundido de 0.14 s, en el frame en que el nuevo entra la copia vieja seguía a `opacity 1`
  con el shell ya grande (`374x182`, fondo negro) y su diálogo a tamaño completo
  (`68,235 433x258`), y las dos superficies se veían montadas. El desmonte sigue en diferido
  un tick (`VANISH_TEARDOWN_DELAY = 20`): no puede ser síncrono porque `vanishSameModal` corre
  al principio de `enter()`, dentro del bucle de `sync()` sobre `nodes`, y `cleanup` →
  `teardownNode` muta ese mismo mapa.
- **`vanished`** (bandera del cierre): `motion.stop()` saca los canales del bucle, pero
  cualquier `animate()` posterior los vuelve a meter — `setTarget` de un `spring` pone
  `active = true` aunque el canal esté parado, y `animate` lo añade otra vez. El tracker del
  origin (`trackOrigin`) dispara justo al reabrir el mismo modal (el modal nuevo esconde el
  trigger) y su `retarget(node.closeTarget)` llegaba DESPUÉS del apagón: la copia invisible
  seguía pintándose camino del trigger los ~160 ms que le quedaban (`1.2, 15.9 → 12.5, 142 →
  23, 260 → 32, 370 → 41, 463 → 47.7, 537`). `vanished` cierra `retarget`, `settle` y
  `abort`, que son los caminos públicos que podían resucitarla o destaparla. No puede ser
  `settled` (que es justo la guardia de `cleanup`, y el apagón lo llama en diferido). En
  `morph.js` la misma idea ya estaba: su `vanish` pone `settled = true` porque allí el
  desmonte no pasa por `cleanup`.
- **Lo que NO se toca al apagar: los modales distintos.** El relevo pill → card sigue con sus
  dos vuelos y sus dos juegos de fantasmas (`Launch,Project,Ciervo,🚀` y
  `Creative,Mode,🎨`), cada shell con SU contenido, el que se va por detrás. `sameModal` exige
  identidad; sin ella no hay apagón.

## Lo que NO hay que volver a hacer (y por qué)

- **Reciclar el elemento modal** (cancelar el cierre y reabrir el MISMO modal:
  `store.reopen` + `host.reenter` + `morph.reverse`). Rechazado por el dueño: compartir el
  modal y combinar transiciones no es la solución. Se eliminó por completo.
- **Compartir un nodo de contenido entre dos modales** (lo que hacía el wrapper al pasar
  el mismo div a cada open): el viejo se queda sin contenido, el nuevo hereda las
  escrituras de la transición vieja (título/icono en `opacity: 0`) y los dos vuelos
  dibujan el mismo texto.
- **Matar el vuelo de la apertura al relevarla con un cierre** (settle sin
  `keepGeometry`): el shell salta al tamaño completo y el texto da un pop.
- **Destapar el origin sin guardia**: en una ráfaga el trigger del modal nuevo queda
  visible debajo.
- **Cerrar el handoff solo con `transitionend`**: si el evento no llega, `cleanup()` no
  corre nunca y el modal, su item y su host de fantasmas se quedan ahí para siempre. Sin
  escapatoria por diseño: el `safetyTimer` del motor entra por el MISMO handoff, y el safety
  del host estaba desactivado para gsap (~27 h). Siempre con respaldo de tiempo.
- **Colgar el host de fantasmas de `document.body`**: su `z-index: 999999` pasa por encima
  de todos los modales (`.apr-layer` es 2300), así que el cierre del viejo se pintaba sobre
  el nuevo; y como el host no era hijo del item, `itemEl.remove()` no se lo llevaba.
- **Modo no bloqueante (`blocking: false`)**: ponía `pointer-events: none` al overlay, y su
  propio listener de clic no podía dispararse nunca — el modal se quedaba sin forma de
  cerrarse con el ratón. Además un fondo sin bloquear invita a abrir un modal que el blur no
  deja ver.
- **`takeContent()` copiando el nodo vivo**: `Modal.vue` hace `await nextTick()` antes de
  abrir, así que para cuando el modal nuevo copiaba el div, Vue ya lo había re-renderizado
  con el contenido NUEVO: los dos shells mostraban el mismo texto.
- **Banderas que se escriben y no se leen** (`preserveFrozen`): la regla 8 parecía
  implementada y no lo estaba, el cierre saltaba al tamaño completo. Si una bandera existe,
  alguien tiene que leerla.
- **Dar por muerta una transición al llamar `motion.stop()`**: `stop()` cumple (saca los
  canales del bucle y los desactiva), pero no es una puerta cerrada: el siguiente
  `animate()` sobre ese mismo motion vuelve a meterlos (`setTarget` de un `spring` pone
  `active = true` aunque el canal esté parado, y `animate` lo añade al bucle). Por eso el
  apagón lleva bandera propia y guardias en los métodos públicos; con el `stop()` solo,
  medido, la copia apagada seguía avanzando hacia el trigger.
- **Guardar la opacidad anterior en el controlador de visibilidad** (capturarla al
  construirse y devolverla al soltar): el segundo vuelo lee el `0` que escribió el primero y
  al soltar lo deja en `0`. Peor: escribir `0` sobre `0` no cambia el atributo, así que la
  fuga **no se ve** en un `MutationObserver` y se perpetúa — cada transición siguiente
  vuelve a capturar `0`. Medido: tras una ráfaga, el trigger visible y su icono y su texto
  clavados en `opacity: 0` para siempre, y el mismo `show()` fuera de orden (escribiendo `''`
  mientras otro vuelo sigue en el aire) es el texto duplicado sobre el modal abierto.
- **Medir el destino del cierre contra `shellRect`** (el rect CON el translate vivo): el
  cierre arranca desde `translate(0, 0)`, así que el aterrizaje se quedaba corto justo por el
  translate que tenía el shell al congelarse — 0 px si la apertura había asentado, ~19 px si
  se interrumpía a mitad, y de ahí el salto al destapar el origin de verdad. Medido: con
  `placement: bottom` y cierre a 150 ms, el shell aterrizaba en `51.9, 323.1` contra un
  origin en `70.9, 308.2`.
- **Escribir `transition: none` en el origin sin guardar el anterior**: al reposo el trigger
  quedaba con `transition: none` inline y perdía sus transiciones CSS para siempre. Se ve en
  la traza: con 0 items y 0 vuelos vivos, la última escritura del pill es un `'' ->
  'transition: none;'` de la segunda restauración, la que ya no tenía nada que devolver.
- **Creerle a un número de píxeles medido con recorte** (ver trampas).
- **`export { a, b } from './x.js'` para un par que el propio módulo además LLAMA**: eso
  re-exporta **sin crear binding local**. Al unificar `hideOrigin`/`restoreOrigin` en
  `gsap-morph.js`, los tres call sites de `morph.js` (`hideOrigin(origin)` al abrir,
  `restoreOrigin` en los dos aterrizajes) quedaron como identificadores sin definir:
  `ReferenceError: hideOrigin is not defined` lanzado justo **después de pintar el frame cero**
  del morph. Medido en `#/modal` (todos los modos menos `gsap` pasan por `morph.js`): el modal
  nacía congelado en `137.4x32 @ translate(268.5, -115.6)` con `transition: none`, idéntico a
  los 150 ms y a los 1150; el clic fuera no llegaba a nada (el gesto se engancha al final de
  `enter`) y el `elementsFromPoint` del centro devolvía `apr-dialog`/`apr-overlay` por encima
  del BODY. La página entera dejaba de responder y el modal no se podía ni cerrar: **el ratón
  muerto**. De propina el error saltaba a `index.js`, donde `open()` declara `const promise`
  después de `store.open()`, así que el segundo error de la consola era
  `Cannot access 'promise' before initialization` en `Modal.vue`. Cuando el módulo usa lo que
  re-exporta: `import` + `export { … }`, nunca `export … from` a secas.
- **Fiarse de `preview_screenshot` o de rAF en el panel de preview**: con el panel oculto rAF
  da 0 frames (el vuelo se congela y lo cierra el safety) y la captura devuelve un frame
  viejo. El instrumento que sobrevive es `MutationObserver` (microtareas, no se throttlean) +
  `elementFromPoint` + leer los `style` inline.
- **Navegar con `location.href` al mismo hash creyendo que recarga**: no recarga nada. Un
  arnés que "recargaba" así medía el estado muerto de la corrida anterior. La recarga real es
  `location.reload()`, y además **destruye el contexto JS**: un arnés que guarda su log en
  `window` y luego recarga se borra a sí mismo (el log tiene que ir antes, o en otra llamada).

## Cómo verificarlo

**Arnés**: requiere Chrome con `--remote-debugging-port=9222` y vite dev en
`http://127.0.0.1:5173` (no `localhost`: Vite 6 sobre Node 26 escucha **solo** en `::1` y
Chrome no prueba `::1` para `localhost`, así que da `ERR_CONNECTION_REFUSED`; levantar con
`npm run dev -- --host 127.0.0.1`).

```powershell
node .reasonix/harness/wake.mjs front          # despierta el rAF (obligatorio, ver trampas)
node .reasonix/harness/rapidfire.mjs           # picadas reales en ráfaga
node .reasonix/harness/lifecycle.mjs ".trigger-card"
node .reasonix/harness/handoff.mjs ".trigger-card"
node .reasonix/harness/peek.mjs ".trigger-card" open
node .reasonix/harness/swapdiff.mjs ".trigger-card" open text
node .reasonix/harness/ghostsweep.mjs                          # 12 placements: el fantasma contra el shell
node .reasonix/harness/dragproof.mjs anchor 120 10 9 prueba     # la restriccion dura: arrastre vs pole
node .reasonix/harness/ghostdrag.mjs                           # texto contra caja, con arrastre lento y fling
node .reasonix/harness/followtrace.mjs anchor 250              # el polo del scroll, frame a frame
node .reasonix/harness/roundtrace.mjs anchor                   # radios contra caja (modo gsap)
node .reasonix/harness/roundtrace.mjs anchor transform         # lo mismo por morph.js
powershell -File .reasonix/probe/bbox.ps1 -A <pngA> -B <pngB>
node .reasonix/harness/wake.mjs reload         # dejar la pestaña limpia al terminar
```

Qué tiene que dar:

- `rapidfire`: 5 picadas al mismo trigger cada 120 ms -> 5 modales, cada uno con su vuelo;
  en cada estado asentado `items=1 hosts=0 ocultos=0 inert=0 body libre`. `elementFromPoint`
  confirma que hay un trigger (o el modal, donde lo tapa) bajo el cursor.
- `lifecycle`: A (cerrar a 150 ms de la apertura) termina cerrado; B (reabrir a 200 ms del
  cierre) termina abierto y sano; C (ráfaga de 4) y D (cerrar a 40 ms) terminan cerrados;
  en los cuatro, 0 hosts huérfanos y 0 contenido sin restaurar.
- `handoff`: el shell continúa desde la geometría viva (p.ej. 425x318 -> 438x306 ->
  558x195) sin saltar al tamaño completo (372x367).
- `peek`: `dx=dy=dh=dbase=0` en las 6 celdas (3 triggers x apertura/cierre); único residuo
  tolerable `dw = -0.013 px` (redondeo de 1/64 de Chrome).
- `swapdiff`: la captura del fantasma congelado contra la del destino real, sin diferencias
  (en texto puede quedar AA de contornos, repartido por la línea, sin salto).

**Panel de preview** (cuando el puerto 9222 no responde). `preview_eval` sobre
`http://localhost:5173/#/gsap-morph` — hash-routing: sin el `#/` carga otra página. Sirve para
todo lo que sea leer el DOM, que es donde están las medidas que deciden. Los 9 escenarios y su
criterio, medidos así:

1. **Clic fuera, 3 triggers**: `elementFromPoint(40,40)` con el modal abierto devuelve
   `apr-overlay`, y la picada lo cierra.
2. **Fuga**: abrir -> cerrar -> en reposo `items=0 hosts=0`, trigger con su opacidad, `inert=0`,
   `body.style.overflow=''`.
3. **Contenido**: abrir el pill (🚀), cerrar y abrir la card (🎨) con separación real entre
   picadas; el shell que se cierra sigue diciendo 🚀 y solo el nuevo dice 🎨.
4. **Capa**: en pleno relevo, `elementsFromPoint(centro del diálogo nuevo)` — forzando antes
   `pointer-events: auto` en el item que se cierra, que si no el hit-test no lo ve — tiene que
   listar **todas** las piezas del item nuevo antes de la primera del viejo
   (`i8:dialog, i8:overlay, i7:<GHOST-HOST>, i7:dialog...`).
5. **Geometría viva**: cerrar a ~150 ms de la apertura; la lectura **síncrona** del `width`
   inline del diálogo tiene que dar la geometría viva (p.ej. `432.55px`), no el tamaño natural.
6. **Ráfaga**: 5 picadas al mismo trigger cada 120 ms -> en reposo `items=1 hosts=0`.
7. **Doble clic de memoria muscular**: trigger -> fuera -> trigger, con ~100 ms entre picadas
   (o sea, en tareas distintas: si las tres van en el mismo tick, Vue ve `isModalOpen`
   `true->false->true` y **no dispara el watcher**, y el segundo open no ocurre).
8. **Otros modos**: `travel` / `transform` / `simple` abren y cierran con `hosts=0` y sin lock.
   El cierre de estos modos tarda más que el de gsap: no dar por atascado lo que solo es lento.
9. **`/#/modal`** (el otro consumidor): abre, cierra fuera y con el botón; `items` vuelve a 0.
   Ahí vive el único ejercicio de `store.update` -> `refresh()` ("Actualizar Descripción").
   Ojo: ahí el botón **no** cierra y reabre, así que no hay apagón que medir en esta ruta (el
   mismo item sigue con su `data-apr-id` y sin `transform` inline tras la segunda picada).
10. **Hileras (regla 11)**, en `gsap`: medir las cajas de palabra con `Range` sobre los nodos
    de texto (el mismo instrumento que usa `measureWords`) y contar filas agrupando `top` con
    tolerancia ~4 px. Tres casos: (a) tal cual, el pill dispara en una hilera y el modal
    asienta en dos → en vuelo `596/596/596 -> 363/363/363 -> 249/249/249` y destino `213` y
    `260`, aterrizaje apilado `215/215/261`; (b) `.modal-title{font-size:1rem !important}` →
    destino de **una** hilera y el vuelo en una hilera en TODA la muestra (`249` contra `247`);
    (c) además `.trigger-pill .text{max-width:80px !important}` → origen apilado
    (`903/926/948`) y destino de una hilera: en vuelo `596/608/620 -> 363/367/371 ->
    249/249/249`. Error de aterrizaje 0-2 px en los tres. Quitar el `<style>` inyectado al
    terminar: si sobrevive a la navegación, contamina `#/modal`.
11. **Mismo modal reabriéndose (regla 12)**: picar el pill, esperar ~320 ms (en pleno vuelo:
    es el caso que además ejercita el `retarget` del tracker) y volver a picar. A +80 ms tiene
    que haber dos items: el viejo con su opacidad bajando y su `transform` **clavado** donde
    estaba, el nuevo entrando (`14 op=0.64 translate(1.11644px, 14.295px)` junto a
    `15 op=1.00 translate(32.2434px, 412.851px)`); a los ~190 ms el viejo ya no está, y en
    reposo `items=1 hosts=0`. Repetir en los 4 modos (`transform`/`travel`/`simple` pasan por
    `morph.js`, cuyo `vanish` se apoya en `settled`).
12. **El polo del scroll y el texto dentro de la caja (reglas 13 y 14)**, con los dos
    instrumentos que existen para eso. `followtrace.mjs <placement> <px>` abre, espera a que el
    modal asiente, scrollea y muestra el `top` del diálogo **junto a sus tres antecedentes**
    (`scrollY`, el rect vivo del trigger, y la rama firmada en `dataset.aprPlacement`): sin
    separar esas señales, un salto no se puede atribuir ni al scroll ni al motor. Criterio:
    sobrepaso 0, retrocesos 0 y el paso máximo = `1 - exp(-16/180)` del recorrido (≈8.5%),
    o sea el polo y no un escalón. Barrido de referencia: `anchor` 11.8 px repartidos,
    `inplace-t` −189.8 px, `inplace` −96.45 px, `inplace-br` −3.11 px, `bottom` 0 px — todos
    con paso máximo proporcional y sin sobrepaso. `ghostsweep.mjs` mide, por frame, cuánto
    sobresale el fantasma del rect del shell en los 12 placements y con scroll en pleno vuelo;
    criterio: **0 frames con escape > 0** en los 20 casos (con la física de timeline eran 8 de
    238 frames y el fantasma terminaba 211 px fuera). `ghostdrag.mjs` mide además lo que el
    dueño describe literalmente —`u_texto` contra `u_caja`, el reparto del recorrido— en
    arrastre lento y con fling: desfase máximo 0.041 y **0 frames separados**, contra 0.116 y 8
    frames con el timeline (el texto llegaba en el frame 50 y la caja en el 60).
13. **La restricción dura (regla 13): el arrastre y los demás springs no se tocan**, y eso se
    comprueba con `dragproof.mjs <placement> <px> <pasos> <framesEntrePasos> <etiqueta>`: un
    arrastre sintético con la serie de `getComputedStyle(dialog).transform` frame a frame, en
    dos corridas (`placementFollow: 0.18` y `0`). Criterio: la serie **idéntica**, y el
    seguidor del scroll sin escribir `top` ni una vez durante el arrastre (medido: `top` clavado
    en `16px`). Resultado: arrastre lento y fling, 200 frames cada uno, `y` y la cadena cruda
    del transform idénticas; los springs de caja, apertura (30 frames) y cierre (44) idénticos.
    El gesto se dispara **dentro de la página en un frame fijo del reloj del shim** (un plan
    `{f, e, x, y}`): disparado desde Node con `sleep`, cada corrida lo deja caer en un frame
    distinto y las dos series son la misma física en fases distintas.

## Trampas del instrumento (documentadas en `.reasonix/harness/README.txt`)

1. **rAF throttleado**: con la ventana oculta Chrome da 0 frames/500 ms, el timeline de
   GSAP no avanza, el fantasma se queda en el arranque y el cierre lo termina el
   `safetyTimer` (un `setTimeout`, no depende de rAF). `wake.mjs` lo mide y `wake.mjs front`
   lo despierta con `Page.bringToFront` (persiste).
2. **Recorte del capturador**: `Page.captureScreenshot` con clip en coordenadas de página
   (+ `captureBeyondViewport`) pinta el contenido `position: fixed` en su sitio de viewport
   mientras el recorte está en coordenadas de documento. Si lo comparado no comparte
   anclaje (cierre: fantasma `fixed` contra un trigger in-flow) aparecen offsets de hasta
   27 px que no existen en pantalla. El único instrumento de píxeles válido ahí es
   `swapdiff.mjs` (viewport completo).
3. Los scripts **mutan la página** (parchean `Element.prototype.remove`, tocan
   visibility/opacity): recargar al terminar (`wake.mjs reload`).
4. Al picar por selector, elegir el diálogo **más nuevo** (`Array.from(...).pop()`): el
   modal viejo puede llevar una copia sin listeners, y el staging del wrapper está oculto.
5. **Panel de preview con la ventana oculta**: `requestAnimationFrame` da **0 frames** (un
   grabador con rAF recoge 0 muestras) y los `setTimeout` se van estrangulando hasta ~1/min
   (*intensive throttling*). Consecuencias: (a) **los píxeles no son instrumento** — el
   screenshot devuelve el último frame compuesto, que puede ser de hace un segundo y no
   corresponder a nada real; (b) las esperas largas dentro de un solo `preview_eval` no
   sirven para medir tiempos, sí para leer estados finales. Lo que **sí** funciona:
   microtareas (`await` de promesas encadenadas: Vue hace su flush y `nextTick` resuelve sin
   timers), `MutationObserver` (su callback es microtarea, no se estrangula) para fechar
   apariciones y desapariciones de `.apr-item`/`.apr-ghost-flight`, y `elementFromPoint` /
   `elementsFromPoint` para el orden de pintado.
6. **En Chrome `style.top` NO es interceptable**: `CSSStyleDeclaration` resuelve `top` por el
   mecanismo de **propiedades nombradas** del CSSOM, no con un accesor en el prototipo, así que
   buscarlo en `CSSStyleDeclaration.prototype` (o subiendo por su cadena) devuelve `undefined`,
   la guarda se lo traga **en silencio** y el forense registra cero escrituras **con el
   instrumento aparentemente funcionando** (medido: `sin dueño · escrituras de top en total:
   0`). Para saber quién movió una caja hay que firmar la rama desde fuera
   (`dataset.aprPlacement`) y registrar la **entrada** (el rect del trigger), no la escritura.
7. **Todo `start()` necesita guarda de generación**: el shim de reloj deja
   `cancelAnimationFrame` en no-op a propósito (el reloj es el único que manda), así que un
   recolector que llame a `start()` dos veces —apertura y cierre— deja el ticker viejo vivo y
   duplica cada frame. Medido: el cierre reportaba **86 frames** donde había 43 (crecimiento
   63/126/192/252). Sin la guarda, todos los índices del cierre están al doble.
8. **Una fila sin radio no es una muestra de radio**: al desmontar, el shell pasa un instante
   por `borderRadius: ''`. Leído como cambio, inventa un último frame de vuelo que no existe
   (medido: un "cambio" en el frame 194 con el radio parado desde el 28). Filtrar por radio
   legible, y cuando algo cambie, guardar **qué** cambió: el `28px -> 1568px` del handoff no se
   distingue de una animación sin los valores en crudo.
9. **`lifecycle.mjs` no usa el shim de reloj** (medido: `CLOCK_SHIM` aparece 0 veces), así que
   sus muestras a tiempo fijo caen del lado que quieran en los bordes: el estado a `t+0.4s` del
   escenario A difiere entre corridas con el **mismo** código. A/B contra el archivo prístino
   dio idéntico (0.04/0.17/0.01 contra 0.010/0.0098/0.100) ⇒ es ruido de borde, no regresión.
   **No todo lo que cambia entre dos corridas es un cambio de código.**
10. **`probe4.mjs` escribe a `%TEMP%/reasonix-probe/`**: si el directorio no existe muere con
    `ENOENT` **después** de haber medido. Crearlo antes de correrlo.
11. **Comillas invertidas dentro de un template literal rompen el archivo .mjs entero** (el
    script deja de parsear y el error señala cualquier otra línea). Van 5 veces en este arnés:
    al documentar dentro de un `RECORDER` hay que escribirlas como palabra, no como símbolo.

## Decisiones abiertas

- En una ráfaga desde el MISMO trigger con **modales distintos**, se ven dos vuelos de texto a
  la vez (el del modal viejo llegando al trigger y el del nuevo saliendo de él). Son elementos
  distintos, con su propio contenido, y el dueño lo dio por bueno: es el relevo que quiere. El
  caso que sí se corrigió (15/09) es el del MISMO modal, que se apaga (regla 12).
- El texto de un shared element con destino apilado **se apila llegando**, y el reparto entre
  filas sale del plan de hileras (regla 11): si algún día se quiere que el reparto sea
  palabra a palabra y no por fila, el sitio es `snapRows`.
- **Las tres perillas nuevas son puntos de partida, no verdades medidas.**
  `placementFollow: 0.18` (`host.js:37`, segundos; `0` = escritura directa, el revert exacto),
  `ghostPhysics: 'shell' | 'timeline'` y `ghostAimSmooth: 0.2` (`gsap-morph.js:74` y `:80`).
  Lo que está medido es que el resultado es monótono, sin sobrepaso y con el reparto esperado;
  **cuánto** se nota es cosa del ojo del dueño, y las tres se pueden mover sin tocar código.
- El polo de apuntado del fantasma (`ghostAimSmooth`) **vale exactamente 0 antes del primer
  reapuntado**, así que un vuelo que no se mueve no pasa por él: no hay camino "casi igual" que
  comparar. Si algún día se quiere reapuntar también en la apertura, el sitio es el mismo
  `retarget`, y hoy la apertura no lo expone.
- `src/components/Modal/` sigue **untracked** en git: no hay historial. El motor previo a
  la reescritura está copiado en `.reasonix/backup/gsap-morph.pre-dest-anchor.*.js`, y los de
  esta ronda en `.reasonix/backup/morph.pre-roundt-fix.*.js` y
  `.reasonix/backup/placement.pre-output-pole.*.js`.
