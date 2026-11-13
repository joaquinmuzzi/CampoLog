# CampoLog — Informe del proyecto final

**Generación T · Bootcamp IA-First · Módulo 5**
Grupo: Kevin Yavi, Felipe Salinas, Juan Hracek, Santino Portaluppi y Joaquín Muzzi.

| | |
|---|---|
| Aplicación publicada | https://frontend-production-32dc3f68.up.railway.app |
| API publicada | https://backend-production-535121a0.up.railway.app/api/salud |
| Repositorio | https://github.com/joaquinmuzzi/CampoLog |
| Cuentas de prueba | Ver el [README](../README.md#probar-la-aplicación-publicada) (contraseña `demo1234`) |

---

## 1. El problema y por qué no es un ABM

En las escuelas técnicas, cada estudiante de 6.° año lleva una **carpeta de campo** de sus Prácticas
Profesionalizantes. Hoy se arma a mano: se completa a último momento, sin pruebas de lo hecho, y el docente no tiene
cómo revisar jornada por jornada ni saber quién está en riesgo. CampoLog la digitaliza para tres roles: estudiante,
docente y administración.

Lo que se evalúa en el proyecto son las **reglas de negocio**. Estas son las que le dan complejidad real (todas
están numeradas en [`spec.md`](spec.md)):

| Regla | Qué la hace difícil |
|---|---|
| **RN8** Día de práctica | El sistema calcula el calendario de cada comisión: días de la semana elegidos, entre dos fechas, menos los feriados nacionales y los recesos de esa comisión. |
| **RN12–RN14** Solo días de práctica, sin fechas futuras, hasta 7 días después | Todo depende de "hoy" en la zona horaria de Argentina, no del reloj del servidor (que está en UTC). |
| **RN15** Una entrada por día | Si dos pedidos llegan a la vez, la base de datos decide uno solo (restricción única); el otro recibe `409` con el id de la entrada que ya existe. |
| **RN19–RN21** Estados y plazos | Borrador → Enviada → Validada u Observada → (corrección) → Enviada. Para enviar hace falta evidencia y hay plazo de 7 días para enviar y para corregir. |
| **RN22** Revisión | Solo el docente a cargo; observar exige un comentario de 10 a 500 caracteres. |
| **RN23** Versión | Control optimista: cada cambio suma 1 a la versión. Si dos personas cambian la misma entrada con la misma versión, gana una sola y la otra recibe `409` con el estado actual. |
| **RN24** Privacidad | Lo ajeno responde `404` (no `403`), para no revelar que existe. |
| **RN26** Asistencia y riesgo | Días validados sobre días transcurridos; en riesgo por debajo del 75 % y solo con 4 días transcurridos o más. |
| **RN11** Calendario fijo | Una comisión que ya empezó no puede cambiar sus días, fechas ni horas (cambiaría la asistencia de todos). |

Cada regla salió de una pregunta concreta y su decisión quedó registrada en [`decisiones.md`](decisiones.md)
(D1–D38), pensando la mejor solución y no lo primero que se ocurría (por ejemplo, D35: el umbral de 4 días para el
riesgo evita que un estudiante aparezca "en riesgo" con un solo día pendiente al comienzo).

## 2. Proceso seguido

Se reprodujo el proceso visto con ReservaClub, con un documento por etapa:

1. [`idea.md`](idea.md): la idea pasada en limpio, sin huecos.
2. [`decisiones.md`](decisiones.md), [`glosario.md`](glosario.md) y [`preguntas-abiertas.md`](preguntas-abiertas.md)
   (P1–P11, todas respondidas e incorporadas).
3. [`spec.md`](spec.md): objetivo, roles, alcance, **RN1–RN29** con números concretos, **HU1–HU15** con criterios
   "dado, cuando, entonces" que citan su regla, casos borde y la sección de pendientes vacía.
4. [`AGENTS.md`](../AGENTS.md) (el reglamento de la obra) y las reglas de **6 agentes** en
   [`.cursor/rules/`](../.cursor/rules): analista, arquitecto, backend, frontend, tester y revisor.
5. [`plan.md`](plan.md): el plan técnico (resumido en la sección 3).
6. [`tasks.md`](tasks.md): **34 tareas** chicas, ordenadas por dependencias, todas marcadas `[x]`.
7. **Ciclo de cada tarea** (AGENTS.md, sección 6): el tester escribe los tests → el desarrollador implementa sin
   tocarlos → el revisor controla contra la spec → **commit `Tnn: título`** → se marca la tarea. Un script de
   control corre el typecheck, todos los tests del backend y del frontend y el build antes de cada commit, y lo
   bloquea si algo falla.

El historial de Git tiene un commit por tarea (T01 a T34), precedidos por los commits de la documentación.

## 3. Plan técnico (resumen de [`plan.md`](plan.md))

### Arquitectura

```
Navegador (React)  ──HTTPS/JSON──▶  API REST (Express)  ──SQL──▶  PostgreSQL
   frontend/                          backend/                    Railway
```

Backend en capas: `rutas → controladores → servicios → repositorios`, con las reglas puras en `dominio/`
(calendario, plazos, estados, validaciones, seguimiento, CSV): funciones sin base de datos ni HTTP, fáciles de testear.

- **Reloj inyectado**: "hoy" sale de un componente `Reloj` (`RelojArgentina` en producción, `RelojFijo` en los
  tests). Así los tests de plazos no dependen del día en que se corren.
- **Repositorios con interfaz** y dos implementaciones (memoria y PostgreSQL). Los mismos tests de contrato corren
  contra las dos.
- **Inyección de dependencias**: `crearApp({ repos, reloj, config })` arma la app; en producción con PostgreSQL y en
  los tests con memoria.

### Base de datos y justificación

**PostgreSQL**, porque RN15 y RN23 necesitan garantías de la base: con dos pedidos simultáneos, la restricción
`UNIQUE (estudiante_id, fecha)` y el `UPDATE … WHERE version = $n` deciden uno solo. Además tiene `DATE` sin hora y
arreglos, y Railway la ofrece administrada.

```
usuarios (id, nombre, apellido, email UNIQUE, password_hash, rol, comision_id, intentos_fallidos, bloqueado_hasta)
comisiones (id, nombre, dias_semana INT[], fecha_inicio, fecha_fin, horas_jornada, codigo_inscripcion UNIQUE, docente_id)
dias_no_laborables (id, fecha, motivo, tipo FERIADO|RECESO, comision_id NULL)   UNIQUE (fecha, alcance)
entradas (id, estudiante_id, comision_id, fecha, actividad, descripcion, horas, etiquetas TEXT[], estado, version, …)
          UNIQUE (estudiante_id, fecha)
evidencias (id, entrada_id, tipo, titulo, url, orden)
comentarios (id, entrada_id, autor_id, tipo OBSERVACION|VALIDACION, texto, creado_en)
```

Las migraciones son SQL propio (`backend/src/db/migraciones/`), se aplican al arrancar y quedan registradas.

### API

| Método y ruta | Rol | RN |
|---|---|---|
| `POST /auth/registro` · `POST /auth/login` · `GET /auth/yo` | — / todos | RN2, RN3, RN5, RN6 |
| `GET/POST /comisiones` · `GET/PATCH /comisiones/:id` · `GET /comisiones/:id/estudiantes` | admin, docente | RN7, RN11, RN24, RN26 |
| `GET/POST /docentes` | admin | RN4 |
| `GET/POST/DELETE /dias-no-laborables` | según tipo | RN9, RN10 |
| `GET /mi/calendario` · `GET /mi/resumen` · `GET /mi/exportacion` | estudiante | RN8, RN25–RN28 |
| `GET/POST /entradas` · `GET/PATCH/DELETE /entradas/:id` · `POST /entradas/:id/enviar` | estudiante | RN12–RN21, RN23, RN29 |
| `POST /entradas/:id/validar` · `POST /entradas/:id/observar` | docente | RN19, RN22, RN23 |
| `GET /estudiantes/:id/entradas` · `/resumen` · `/exportacion` | admin, docente | RN24–RN29 |

Errores siempre con la forma `{ "error": "mensaje en español", "detalle"?: {...} }` y códigos 400, 401, 403, 404,
409 y 423. La tabla completa y la ubicación de cada regla en el código ("dónde vive cada regla") están en
[`plan.md`](plan.md), secciones 3 y 4.

### Decisiones técnicas

DT1 repositorios con interfaz y memoria para tests · DT2 Zod para validar · DT3 `bcryptjs` y `jsonwebtoken` (sin
compilación nativa) · DT4 CSV a mano · DT5 fechas como texto `AAAA-MM-DD` en todo el sistema · DT6 migraciones SQL
propias · DT7 frontend servido con `serve` · DT8 un servicio de Railway por carpeta, todo configurado por variables
de entorno y CORS solo para `FRONTEND_URL` · DT9 datos de demostración opcionales (`SEMBRAR_DEMO`).

## 4. Orden de las tareas y por qué

La regla fue: **primero lo que todo lo demás necesita, y enseguida la parte más difícil**. Las tareas se ordenaron
por dependencias, no por número de historia de usuario.

| Etapa | Tareas | Por qué en este lugar |
|---|---|---|
| 1. Base | T01–T05 | Todo depende de esto. El **reloj de Argentina** (T02) va antes que cualquier regla porque los plazos (RN12–RN14, RN21) dependen de "hoy" y un error de zona horaria corre las fechas un día. El **esquema de la base** (T04) se diseñó temprano porque las dos reglas más delicadas (RN15 y RN23) se garantizan con restricciones de la base. Los repositorios con interfaz (T05) permiten testear todo sin base. |
| 2. Cuentas y acceso | T06–T09 | Cada endpoint posterior necesita sesión y rol. El administrador inicial (T07) tiene que existir para poder crear docentes (T09), y los docentes para crear comisiones. |
| 3. Comisiones y calendario | T10–T13 | El **dominio del calendario** (T10, RN8) va antes que las comisiones y que las entradas: RN12 ("solo días de práctica") no se puede programar sin él. Los feriados y recesos (T13) completan el cálculo. |
| 4. Entradas (lo más complejo) | T14–T20 | Es el corazón del sistema y la parte más difícil, así que se hizo apenas estuvieron sus dependencias. Primero las reglas puras (T14 validaciones, T15 plazos y estados), que se testean sin base; después el repositorio con **versión** (T16), y recién ahí crear con **concurrencia** (T17), editar y borrar (T18), enviar (T19) y revisar (T20). |
| 5. Seguimiento | T21–T24 | Pendientes, asistencia, riesgo, horas y CSV se calculan sobre el calendario y las entradas: no pueden ir antes. |
| Contrato con PostgreSQL | T25 | Antes de construir pantallas sobre la API, se confirmó contra una base PostgreSQL real que las garantías de RN15 y RN23 funcionan (5 creaciones simultáneas → 1 entrada; 3 cambios con la misma versión → gana 1). |
| 6. Frontend | T26–T31 | Con la API estable y probada. El orden sigue el flujo de los datos: el **estudiante** carga (T27–T29), el **docente** revisa lo cargado (T30) y la **administración** configura (T31). |
| 7. Publicación y cierre | T32–T34 | CORS y variables (T32), publicación y prueba en internet (T33), README e informe (T34). |

## 5. Pruebas

### 5.1 Tests automáticos del backend — 195 tests

Corrida completa con los tests de contrato contra PostgreSQL de Railway:
[`pruebas/tests-backend-postgres.txt`](pruebas/tests-backend-postgres.txt) → **24 archivos, 195 tests, todos pasan**.
Sin `TEST_DATABASE_URL` corren 176 (los 19 de PostgreSQL se saltean).

| Archivo de test | Tests | Qué prueba |
|---|---|---|
| `salud`, `errores`, `fechas`, `migraciones` | 17 | Base: salud, forma de los errores, fechas en Argentina, migraciones que no se repiten |
| `repositorios` (contrato) | 36 | Mismas pruebas contra memoria y PostgreSQL, incluida la concurrencia de RN15 y RN23 |
| `login`, `autenticacion`, `adminInicial`, `registro`, `docentes` | 27 | RN1–RN6: credenciales, bloqueo a los 5 intentos (423), token de 8 h, roles, registro con código |
| `calendario`, `comisiones`, `diasNoLaborables` | 23 | RN7–RN11: días de práctica, duración máxima, código, feriados y recesos no retroactivos, calendario fijo |
| `validacionEntrada`, `estadosYPlazos` | 33 | RN14, RN16–RN21: horas, textos, evidencias, transiciones y plazos |
| `crearEntrada`, `editarEntradas`, `enviarEntrada`, `revision` | 31 | RN12–RN24 de punta a punta por HTTP: duplicados, versión, privacidad (404), envío y revisión |
| `seguimiento`, `miCarpeta`, `vistaDocente`, `exportacion` | 22 | RN25–RN29: pendientes, asistencia, riesgo, horas, CSV con BOM y `;` |
| `despliegue` | 6 | T32: CORS (origen del frontend sí, otro no) y variables de entorno obligatorias |

### 5.2 Tests automáticos del frontend — 16 tests

[`pruebas/tests-frontend.txt`](pruebas/tests-frontend.txt): cliente de la API (token, errores, sesión vencida),
calendario del mes, formulario de entrada (días pendientes, horas de a media, aviso del 409 con link a la entrada
existente, recarga ante conflicto de versión), revisión docente (comentario obligatorio para observar, conflicto
al validar), tabla de estudiantes en riesgo y formulario de comisión (RN7 y bloqueo de RN11).

### 5.3 Prueba de la API de punta a punta — 45 verificaciones

El script [`backend/scripts/probar-api.mjs`](../backend/scripts/probar-api.mjs) recorre el flujo completo con pedidos
reales y verifica el código de respuesta de cada regla. Se corrió contra el **build de producción** del backend
conectado a **PostgreSQL de Railway** (en un esquema aislado):
[`pruebas/prueba-api-postgres.txt`](pruebas/prueba-api-postgres.txt) → **45 correctas, 0 con error**.

Incluye, entre otras: login del administrador inicial (RN1); comisión de más de 270 días → 400 (RN7); cambiar las
horas de una comisión iniciada → 400 (RN11); docente que intenta cargar un feriado → 403 (RN9); registro con código
inexistente → 400 (RN3); bloqueo tras 5 intentos → 423 (RN6); fecha futura y sábado → 400 (RN12, RN13); entrada
repetida → 409 con `detalle.id` (RN15); **5 pedidos simultáneos para el mismo día → se crea 1 sola**; otro
estudiante abre la entrada → 404 (RN24); enviar sin evidencias → 400 (RN21); editar con versión vieja → 409 (RN23);
observar sin comentario → 400 (RN22); **dos validaciones simultáneas → una 200 y otra 409**; CSV de la carpeta (RN28).

### 5.4 Colección de Postman

[`pruebas/CampoLog.postman_collection.json`](pruebas/CampoLog.postman_collection.json): 16 pedidos contra el backend
publicado, en orden (login de estudiante y docente, resumen, calendario, crear entrada, duplicado, enviar, observar
sin comentario, validar, versión vieja, CSV y permisos), cada uno con su test. Los logins guardan el token y "Crear
entrada" guarda el id y la versión para los pedidos siguientes.

### 5.5 Pruebas manuales en el navegador

Cada pantalla se probó en el navegador antes de su commit, con los datos de demostración:

| Tarea | Qué se probó | Resultado |
|---|---|---|
| T27 | Registro con código inválido y válido; login | Mensajes claros; redirige al inicio de cada rol |
| T28 | Inicio con pendientes y alerta de riesgo; calendario con colores por estado y leyenda | Correcto (se corrigió la mayúscula del mes y el estilo de "pendiente") |
| T29 | Crear y enviar una jornada; repetir el mismo día; conflicto de versión; editar; borrar; filtros; paginación; CSV | El 409 muestra "Abrir la entrada de ese día"; el conflicto avisa y recarga la versión actual |
| T30 | Comisiones del docente; estudiantes en riesgo; carpeta filtrada por "Enviada"; observar sin comentario y con comentario; validar; conflicto; agregar y quitar un receso | Correcto (se agregó un límite de año en las fechas al detectar que el campo aceptaba años de 6 cifras) |
| T31 | Crear comisión de más de 270 días (error) y válida (muestra el código); editar una comisión iniciada (calendario bloqueado) y una futura; docente con email repetido (409); feriado repetido (409); agregar y quitar feriado | Correcto |

### 5.6 Verificación de la publicación

[`pruebas/publicacion-railway.txt`](pruebas/publicacion-railway.txt): log de arranque en Railway (migraciones,
administrador inicial y datos de demostración), `/api/salud` responde `{"estado":"ok"}`, el preflight de CORS desde
el frontend recibe `Access-Control-Allow-Origin` y un origen ajeno no, un pedido sin token responde 401, las rutas
del frontend se sirven como SPA y el frontend compilado apunta al backend publicado.

### 5.7 Problemas encontrados y cómo se resolvieron

- **T19 se commiteó con 2 tests fallando**: al adelantar el reloj en el test, el token de 8 h vencía (401) y el
  filtro de la salida ocultaba el código de error. Se corrigió el test, se rehizo el commit y desde ahí un script de
  control bloquea cualquier commit si falla un test, el typecheck o el build.
- **Tests contra PostgreSQL lentos** (la base está en la nube): se subió el tiempo máximo por test a 60 s.
- **Test ambiguo del calendario** al agregar "Observada" a la leyenda: ahora busca el texto dentro de la celda del día.
- **Campo de fecha que aceptaba años de 6 cifras**: se agregó un máximo en los campos de fecha.

## 6. Seguridad y secretos

- Ningún secreto en el repositorio: `.env` está en el `.gitignore`; hay `.env.example` sin valores reales.
- En Railway, `DATABASE_URL` es una referencia a la base (no se escribe la cadena de conexión) y `JWT_SECRET` y la
  contraseña del administrador se cargaron como variables del servicio.
- CORS solo permite `FRONTEND_URL`. Contraseñas con bcrypt, tokens JWT de 8 horas, bloqueo por intentos (RN6) y
  respuesta 404 para lo ajeno (RN24).
