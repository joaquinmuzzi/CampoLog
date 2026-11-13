# CampoLog — Especificación (spec)

> **Fuente de verdad** del proyecto. Todo lo que hace el sistema está acá. Si algo no está en esta spec, no se
> programa: se pregunta (ver `preguntas-abiertas.md`). Solo el agente **analista** modifica este documento.
> Términos: ver `glosario.md`. Origen de cada regla: ver `decisiones.md`.

## 1. Objetivo

Que cada estudiante de Prácticas Profesionalizantes lleve su carpeta de campo al día, con una entrada por jornada
y evidencia de lo realizado, y que su docente pueda revisarla, pedir correcciones y validarla, con un calendario
que se calcula solo a partir de los días de práctica, feriados y recesos.

## 2. Usuarios y roles

| Rol | Puede |
|---|---|
| Administrador | Crear y editar comisiones, crear docentes, gestionar feriados y recesos de cualquier comisión, ver todo. No modifica entradas. |
| Docente | Ver sus comisiones y a sus estudiantes, cargar recesos de sus comisiones, validar u observar entradas, exportar carpetas de sus estudiantes. |
| Estudiante | Registrarse con código, ver su calendario, crear, editar, borrar y enviar sus entradas, ver su resumen y exportar su carpeta. |

## 3. Alcance

**Incluye:** autenticación con roles, comisiones con calendario, feriados y recesos, entradas con evidencias,
flujo de revisión (borrador, enviada, observada, validada), control de concurrencia, días pendientes, asistencia,
horas, exportación CSV, listados paginados con filtros, interfaz web adaptada al celular.

**No incluye:** correos o notificaciones push, subida de archivos, calificaciones, cambio de comisión de un
estudiante, recuperación de contraseña por correo.

## 4. Reglas de negocio

### Cuentas y acceso

- **RN1 — Administrador inicial.** Al arrancar el backend, si no existe ningún administrador, se crea uno con
  `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`. Si ya existe alguno, no se crea otro.
- **RN2 — Credenciales.** El email es único sin distinguir mayúsculas y se guarda en minúsculas. La contraseña tiene
  al menos 8 caracteres, al menos una letra y al menos un número, y se guarda con hash bcrypt (nunca en texto plano).
- **RN3 — Registro de estudiantes.** Un estudiante se registra solo con nombre, apellido (2 a 60 caracteres cada uno),
  email, contraseña y el código de inscripción de su comisión. Si el código no existe, el registro se rechaza.
  El estudiante queda en esa única comisión.
- **RN4 — Alta de docentes.** Solo el administrador crea docentes (nombre, apellido, email y contraseña inicial).
- **RN5 — Sesión.** Al iniciar sesión se entrega un token que vence a las 8 horas. Toda operación salvo registro e
  inicio de sesión requiere un token válido.
- **RN6 — Bloqueo por intentos.** Después de 5 intentos de inicio de sesión fallidos seguidos, la cuenta queda bloqueada
  15 minutos, aunque la contraseña siguiente sea correcta. Un inicio de sesión correcto pone el contador en cero.

### Comisiones y calendario

- **RN7 — Comisión.** Tiene nombre (3 a 80 caracteres), días de la semana de práctica (de 1 a 5 valores distintos entre
  1 = lunes y 5 = viernes), fecha de inicio, fecha de fin (posterior al inicio y como máximo 270 días después), horas
  por jornada (entero de 1 a 8) y un docente a cargo. Al crearla se genera un código de inscripción único de 6
  caracteres tomados de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`.
- **RN8 — Día de práctica.** Una fecha es día de práctica de una comisión si está entre la fecha de inicio y la de fin
  (ambas incluidas), su día de la semana está entre los días de práctica y no es un día no laborable para esa comisión.
- **RN9 — Días no laborables.** Un **feriado** vale para todas las comisiones; un **receso** vale para una sola. Los
  feriados nacionales 2026 vienen precargados. El administrador crea y borra feriados y recesos de cualquier comisión;
  el docente crea y borra recesos solo de sus comisiones. No puede haber dos días no laborables iguales (misma fecha y
  mismo alcance). El motivo tiene de 3 a 80 caracteres.
- **RN10 — Recesos y feriados no retroactivos.** Solo se crea o borra un día no laborable con fecha igual o posterior
  a hoy.
- **RN11 — Calendario fijo una vez iniciado.** Los días de práctica, las fechas y las horas por jornada de una comisión
  solo se modifican si hoy es anterior a su fecha de inicio. Nombre y docente se modifican siempre.

### Entradas

- **RN12 — Solo días de práctica.** Una entrada solo se crea para un día de práctica de la comisión del estudiante.
- **RN13 — Sin fechas futuras.** No se crea una entrada con fecha posterior a hoy.
- **RN14 — Plazo de carga.** Una entrada se crea como máximo 7 días corridos después de su fecha
  (si la fecha es el lunes 10, el último día para crearla es el lunes 17).
- **RN15 — Una por día.** Hay como máximo una entrada por estudiante y fecha. Si dos pedidos intentan crearla a la vez,
  uno la crea y el otro recibe un conflicto (409).
- **RN16 — Horas.** Las horas de una entrada van de 0,5 a las horas por jornada de la comisión, en múltiplos de 0,5.
- **RN17 — Textos.** Actividad obligatoria de 5 a 120 caracteres (sin espacios de más al principio o al final).
  Descripción opcional de hasta 2000. Hasta 5 etiquetas, cada una de 1 a 30 caracteres, sin repetir.
- **RN18 — Evidencias.** Hasta 5 por entrada. Cada una tiene tipo (`COMMIT`, `DOCUMENTO`, `TAREA`, `IMAGEN`, `OTRO`),
  título de 3 a 80 caracteres y una URL que empieza con `http://` o `https://` y tiene hasta 500 caracteres.
- **RN19 — Estados.** Una entrada nace en `BORRADOR`. Transiciones permitidas: `BORRADOR → ENVIADA`,
  `ENVIADA → VALIDADA`, `ENVIADA → OBSERVADA`, `OBSERVADA → ENVIADA`. `VALIDADA` es final. Cualquier otra transición
  se rechaza.
- **RN20 — Edición y borrado.** El estudiante edita sus entradas solo en `BORRADOR` u `OBSERVADA` y borra solo en
  `BORRADOR`. La fecha de una entrada no se cambia.
- **RN21 — Envío.** Para enviar, la entrada necesita al menos una evidencia. Un `BORRADOR` se envía dentro del plazo
  de carga (RN14). Una `OBSERVADA` se reenvía como máximo 7 días corridos después de la observación.
- **RN22 — Revisión.** Solo el docente a cargo de la comisión del estudiante valida u observa, y solo entradas
  `ENVIADA`. Observar exige un comentario de 10 a 500 caracteres; validar admite un comentario opcional de hasta 500.
- **RN23 — Versión.** Cada entrada tiene una versión que empieza en 1 y suma 1 con cada cambio (edición, envío,
  validación u observación). Todo cambio indica la versión que leyó quien lo hace; si no coincide con la actual,
  se rechaza con un conflicto (409) que informa la versión y el estado actuales.
- **RN24 — Privacidad.** El estudiante solo lee sus entradas; el docente, solo las de estudiantes de sus comisiones;
  el administrador lee todas pero no las modifica. Pedir una entrada ajena responde 404 (no revela que existe).

### Seguimiento

- **RN25 — Pendientes de carga.** Para el estudiante se listan los días transcurridos sin entrada cuyo plazo de carga
  no venció, con los días de plazo que les quedan (7 − días desde la fecha).
- **RN26 — Asistencia y riesgo.** Asistencia = días con entrada `VALIDADA` ÷ días transcurridos × 100, redondeado al
  entero más cercano; si no hay días transcurridos es 100. Un estudiante está **en riesgo** si su asistencia es menor
  a 75 y tiene al menos 4 días transcurridos.
- **RN27 — Horas.** Se informan las horas validadas (suma de horas de entradas `VALIDADA`) y las horas del calendario
  (días de práctica de toda la comisión × horas por jornada).
- **RN28 — Exportación.** El CSV incluye solo entradas `VALIDADA` ordenadas por fecha ascendente, con las columnas
  fecha (AAAA-MM-DD), actividad, horas, evidencias (URLs separadas por " | ") y comentario del docente. Se codifica en
  UTF-8 con BOM y separador `;` para que Excel lo abra bien. Lo descarga el estudiante (su carpeta) o su docente.
- **RN29 — Listados.** Las entradas se listan de a 10 por página, ordenadas por fecha descendente, con filtros
  opcionales por mes (`AAAA-MM`) y estado.

## 5. Historias de usuario

Formato de los criterios: **Dado** (contexto) **cuando** (acción) **entonces** (resultado) — [reglas que cumple].

### HU1 — Registrarme como estudiante
Como estudiante quiero crear mi cuenta con el código de mi comisión para empezar a cargar mi carpeta.
- Dado un código válido, cuando completo nombre, apellido, email y una contraseña válida, entonces se crea mi cuenta en esa comisión e inicio sesión. [RN2, RN3]
- Dado un código inexistente, cuando me registro, entonces veo "El código de inscripción no corresponde a ninguna comisión". [RN3]
- Dado un email ya usado (aunque cambien las mayúsculas), cuando me registro, entonces veo que el email ya está registrado. [RN2]
- Dada la contraseña "abcdefgh", cuando me registro, entonces se rechaza porque le falta un número. [RN2]

### HU2 — Iniciar sesión
Como usuario quiero iniciar sesión para usar el sistema según mi rol.
- Dados email y contraseña correctos, cuando inicio sesión, entonces recibo un token que vence a las 8 horas y entro a la pantalla de mi rol. [RN5]
- Dados 5 intentos fallidos seguidos, cuando intento de nuevo con la contraseña correcta antes de 15 minutos, entonces se rechaza indicando que la cuenta está bloqueada. [RN6]
- Dado que pasaron 15 minutos del bloqueo, cuando inicio sesión con la contraseña correcta, entonces entro y el contador vuelve a cero. [RN6]
- Dado que el sistema arranca sin administradores, cuando inicio sesión con el email y la contraseña iniciales, entonces entro como administrador. [RN1]

### HU3 — Gestionar comisiones
Como administrador quiero crear y editar comisiones para que cada grupo tenga su calendario.
- Dados datos válidos, cuando creo una comisión, entonces se guarda con un código de inscripción único de 6 caracteres. [RN7]
- Dada una fecha de fin 300 días después del inicio, cuando creo la comisión, entonces se rechaza. [RN7]
- Dada una comisión que ya empezó, cuando intento cambiar sus días de práctica, entonces se rechaza; cuando cambio el nombre, entonces se guarda. [RN11]

### HU4 — Crear docentes
Como administrador quiero crear cuentas de docentes para asignarlos a comisiones.
- Dados datos válidos, cuando creo un docente, entonces puede iniciar sesión con rol docente. [RN4, RN2]
- Dado un docente o estudiante, cuando intenta crear un docente, entonces recibe 403. [RN4]

### HU5 — Gestionar feriados
Como administrador quiero mantener la lista de feriados para que los calendarios sean correctos.
- Dado que el sistema está recién instalado, cuando veo los feriados, entonces están los feriados nacionales 2026. [RN9]
- Dada una fecha futura, cuando agrego un feriado, entonces deja de ser día de práctica en todas las comisiones. [RN8, RN9]
- Dada una fecha pasada, cuando intento agregar o borrar un feriado, entonces se rechaza. [RN10]

### HU6 — Cargar recesos de mi comisión
Como docente quiero cargar recesos de mi comisión para que no cuenten como días de práctica.
- Dada una fecha futura, cuando cargo un receso en mi comisión, entonces ese día deja de ser de práctica solo para ella. [RN8, RN9]
- Dada una comisión que no es mía, cuando intento cargar un receso, entonces recibo 403. [RN9]
- Dado un receso ya cargado para esa fecha, cuando lo cargo de nuevo, entonces recibo un conflicto. [RN9]

### HU7 — Ver mi calendario
Como estudiante quiero ver mi calendario del mes para saber qué días tengo que cargar.
- Dado un mes, cuando abro el calendario, entonces cada día de práctica muestra su estado (pendiente, sin registro, borrador, enviada, observada o validada) y los feriados y recesos con su motivo. [RN8, RN14, RN25]
- Dado un día transcurrido sin entrada dentro del plazo, cuando veo mi inicio, entonces aparece como pendiente con los días que le quedan. [RN25]

### HU8 — Registrar una jornada
Como estudiante quiero registrar lo que hice en una jornada para armar mi carpeta.
- Dado un día de práctica transcurrido en plazo, cuando creo una entrada válida, entonces queda en `BORRADOR` con versión 1. [RN12, RN14, RN16, RN17, RN19]
- Dado un sábado o un feriado, cuando intento crear la entrada, entonces se rechaza porque no es día de práctica. [RN12]
- Dada una fecha de mañana, cuando intento crear la entrada, entonces se rechaza. [RN13]
- Dada una fecha de hace 8 días, cuando intento crear la entrada, entonces se rechaza por plazo vencido. [RN14]
- Dadas 2,3 horas o más horas que la jornada, cuando guardo, entonces se rechaza. [RN16]
- Dada una entrada existente para esa fecha, cuando creo otra (o dos pedidos llegan a la vez), entonces recibo un conflicto. [RN15]
- Dada una evidencia con URL "ftp://x", cuando guardo, entonces se rechaza. [RN18]

### HU9 — Editar o borrar una entrada
Como estudiante quiero corregir o borrar mis entradas mientras no estén cerradas.
- Dada una entrada en `BORRADOR`, cuando la edito con la versión actual, entonces se guarda y la versión aumenta en 1. [RN20, RN23]
- Dada una entrada `ENVIADA` o `VALIDADA`, cuando intento editarla, entonces se rechaza. [RN20]
- Dada una entrada `OBSERVADA`, cuando intento borrarla, entonces se rechaza; cuando la edito, entonces se guarda. [RN20]
- Dado que el docente la modificó después de que la abrí, cuando guardo, entonces recibo un conflicto con la versión y el estado actuales. [RN23]

### HU10 — Enviar a revisión
Como estudiante quiero enviar una entrada a mi docente para que la valide.
- Dado un `BORRADOR` con al menos una evidencia y en plazo, cuando lo envío, entonces pasa a `ENVIADA`. [RN19, RN21]
- Dado un `BORRADOR` sin evidencias, cuando lo envío, entonces se rechaza. [RN21]
- Dada una `OBSERVADA` hace 3 días, cuando la reenvío, entonces pasa a `ENVIADA`; si la observación fue hace 8 días, entonces se rechaza. [RN21]

### HU11 — Revisar entradas
Como docente quiero validar u observar las entradas enviadas por mis estudiantes.
- Dada una entrada `ENVIADA` de mi comisión, cuando la valido, entonces pasa a `VALIDADA` y ya nadie la modifica. [RN19, RN22]
- Dada una entrada `ENVIADA`, cuando la observo con un comentario de 5 caracteres, entonces se rechaza; con 10 o más, pasa a `OBSERVADA` con mi comentario. [RN22]
- Dada una entrada en `BORRADOR`, cuando intento validarla, entonces se rechaza. [RN19, RN22]
- Dada una entrada de otra comisión, cuando intento validarla, entonces recibo 404. [RN22, RN24]
- Dado que el estudiante la editó después de que la abrí, cuando la valido, entonces recibo un conflicto. [RN23]

### HU12 — Ver mi resumen
Como estudiante quiero ver mi asistencia y mis horas para saber cómo voy.
- Dados 10 días transcurridos con 7 validados, cuando veo mi resumen, entonces la asistencia es 70 % y figuro en riesgo. [RN26]
- Dados 3 días transcurridos con 1 validado, cuando veo mi resumen, entonces la asistencia es 33 % pero no figuro en riesgo. [RN26]
- Dadas entradas validadas de 3 y 2,5 horas, cuando veo mi resumen, entonces las horas validadas son 5,5 sobre las horas del calendario. [RN27]

### HU13 — Seguir a mis estudiantes
Como docente quiero ver a los estudiantes de mis comisiones con su situación para actuar a tiempo.
- Dada mi comisión, cuando abro la lista, entonces veo cada estudiante con asistencia, horas validadas, entradas enviadas por revisar y marca de riesgo. [RN24, RN26, RN27]
- Dada una comisión que no es mía, cuando intento verla, entonces recibo 404. [RN24]

### HU14 — Listar mis entradas
Como estudiante quiero ver mis entradas filtradas para encontrarlas rápido.
- Dadas 12 entradas, cuando abro la lista, entonces veo 10 de la más nueva a la más vieja y una segunda página con 2. [RN29]
- Dado el filtro mes 2026-09 y estado `OBSERVADA`, cuando abro la lista, entonces solo veo las observadas de septiembre. [RN29]

### HU15 — Exportar la carpeta
Como estudiante o docente quiero descargar la carpeta validada para entregarla.
- Dadas entradas validadas y otras en borrador, cuando exporto, entonces el CSV tiene solo las validadas, ordenadas por fecha, con `;` como separador y BOM. [RN28]
- Dado un docente de otra comisión, cuando intenta exportar mi carpeta, entonces recibe 404. [RN24, RN28]

## 6. Casos borde

| Caso | Comportamiento |
|---|---|
| Un feriado cae en un día de práctica que el estudiante ya registró | No puede pasar: los feriados y recesos no son retroactivos (RN10). |
| La comisión empieza un sábado | El primer día de práctica es el primer día hábil de la semana que corresponda; el sábado nunca es día de práctica (RN7, RN8). |
| El día 7 del plazo cae en feriado | El plazo es de días corridos: vence igual (RN14). |
| Medianoche en Argentina vs UTC | "Hoy" siempre se calcula en America/Argentina/Buenos_Aires (glosario). Las fechas de entradas se guardan como fecha sin hora. |
| Doble clic en "Guardar" al crear | El segundo pedido recibe un conflicto por RN15; la interfaz muestra la entrada ya creada. |
| El docente observa y el estudiante nunca corrige | La entrada queda `OBSERVADA`; vencido el plazo de corrección ya no se puede reenviar (RN21) y no suma asistencia. |
| Un estudiante pide `/api/entradas/{id}` de otro | Responde 404 (RN24). |
| La comisión todavía no empezó | Días transcurridos = 0, asistencia 100 %, sin riesgo, sin pendientes (RN25, RN26). |
| Se agrega un feriado futuro | Las horas del calendario y los días de práctica se recalculan (RN8, RN27). |

## 7. Pendientes

Ninguno. Todas las preguntas del análisis están resueltas en `decisiones.md` y registradas en
`preguntas-abiertas.md`.
