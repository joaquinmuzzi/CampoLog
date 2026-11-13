# CampoLog — Tareas

> Escrito por el agente **arquitecto** a partir de `spec.md` y `plan.md`. Tareas chicas, ordenadas por
> **dependencias** (no por número de HU). Cada tarea se hace con el ciclo de `AGENTS.md`: tester → dev → revisor →
> commit `T<nn>: <título>` → se marca `[x]`. **Terminada = pasan sus tests y todos los anteriores.**

## Tabla de control

| Tarea | Título | Agente | Estado |
|---|---|---|---|
| T01 | Proyecto backend, framework de tests y `/api/salud` | backend | [x] |
| T02 | Reloj de Argentina y utilidades de fechas | backend | [x] |
| T03 | Errores de negocio y middleware de errores | backend | [x] |
| T04 | Esquema de base de datos, migraciones y conexión | backend | [x] |
| T05 | Repositorios en memoria y PostgreSQL de usuarios y comisiones | backend | [x] |
| T06 | Contraseñas, tokens y login con bloqueo | backend | [x] |
| T07 | Administrador inicial al arrancar | backend | [x] |
| T08 | Middleware de autenticación y roles | backend | [x] |
| T09 | Alta y listado de docentes | backend | [x] |
| T10 | Dominio: calendario de días de práctica | backend | [x] |
| T11 | Comisiones: crear, editar y código de inscripción | backend | [x] |
| T12 | Registro de estudiantes con código | backend | [x] |
| T13 | Días no laborables y feriados 2026 | backend | [x] |
| T14 | Dominio: validación de datos de una entrada | backend | [x] |
| T15 | Dominio: plazos y transiciones de estado | backend | [x] |
| T16 | Repositorios de entradas (memoria y PostgreSQL) con versión | backend | [x] |
| T17 | Crear entrada (con concurrencia) | backend | [x] |
| T18 | Leer, listar, editar y borrar entradas | backend | [x] |
| T19 | Enviar entrada a revisión | backend | [x] |
| T20 | Validar y observar entradas | backend | [x] |
| T21 | Dominio: pendientes, asistencia, riesgo y horas | backend | [x] |
| T22 | Calendario mensual y resumen del estudiante | backend | [ ] |
| T23 | Estudiantes de una comisión y vista del docente | backend | [ ] |
| T24 | Exportación CSV | backend | [ ] |
| T25 | Tests de contrato contra PostgreSQL | tester | [ ] |
| T26 | Proyecto frontend, cliente de API, sesión y rutas por rol | frontend | [ ] |
| T27 | Pantallas de login y registro | frontend | [ ] |
| T28 | Inicio del estudiante y calendario | frontend | [ ] |
| T29 | Lista de entradas y formulario de entrada | frontend | [ ] |
| T30 | Pantallas del docente | frontend | [ ] |
| T31 | Pantallas del administrador | frontend | [ ] |
| T32 | Configuración de despliegue (CORS, variables, Railway) | arquitecto | [ ] |
| T33 | Publicación en Railway y prueba en internet | arquitecto | [ ] |
| T34 | README final e informe con las pruebas | analista | [ ] |

## Etapa 1 — Base

### T01 — Proyecto backend, framework de tests y `/api/salud`
- **Agente:** backend · **RN/HU:** — · **Depende de:** —
- **Qué hacer:** crear `backend/` con TypeScript, Express y Vitest; estructura de carpetas del plan;
  `crearApp()` con `GET /api/salud`.
- **Terminado:** `npm test` corre y pasa el test de `/api/salud` (responde 200 `{ estado: "ok" }`).

### T02 — Reloj de Argentina y utilidades de fechas
- **Agente:** backend · **RN/HU:** glosario "Hoy" · **Depende de:** T01
- **Qué hacer:** interfaz `Reloj` con `RelojArgentina` y `RelojFijo`; funciones puras `sumarDias`,
  `diferenciaEnDias`, `diaDeSemana` (1 = lunes), `esFechaValida`, `mesDe`.
- **Terminado:** pasan los tests de fechas, incluido que a las 23:30 de Argentina (02:30 UTC) "hoy" sigue siendo el
  día de Argentina.

### T03 — Errores de negocio y middleware de errores
- **Agente:** backend · **RN/HU:** — · **Depende de:** T01
- **Qué hacer:** clase `ErrorNegocio(status, mensaje, detalle?)`; middleware que responde `{ error }` y nunca expone
  errores internos (500 con mensaje genérico); traducción de errores de `zod` a 400.
- **Terminado:** pasan los tests de 400, 404 y 500 sin filtrar el mensaje interno.

### T04 — Esquema de base de datos, migraciones y conexión
- **Agente:** backend · **RN/HU:** RN15 (índice único), RN23 (versión) · **Depende de:** T01
- **Qué hacer:** `001_inicial.sql` con las tablas del plan; ejecutor de migraciones con tabla `migraciones`;
  pool de `pg` que devuelve `DATE` como texto; `DATABASE_URL` solo desde el entorno.
- **Terminado:** test del ejecutor de migraciones (ordena y no repite archivos) pasa; el SQL se aplica sin errores
  contra PostgreSQL cuando hay `TEST_DATABASE_URL`.

### T05 — Repositorios en memoria y PostgreSQL de usuarios y comisiones
- **Agente:** backend · **RN/HU:** RN2 (email único) · **Depende de:** T04
- **Qué hacer:** interfaces `RepoUsuarios` y `RepoComisiones`; implementaciones `memoria/` y `pg/`; tests de contrato
  compartidos.
- **Terminado:** los tests de contrato pasan en memoria (y en PostgreSQL con `TEST_DATABASE_URL`).

## Etapa 2 — Cuentas y acceso

### T06 — Contraseñas, tokens y login con bloqueo
- **Agente:** backend · **RN/HU:** RN2, RN5, RN6 · HU2 · **Depende de:** T02, T03, T05
- **Qué hacer:** validación de contraseña; hash bcrypt; JWT de 8 h; `POST /api/auth/login` con contador de intentos
  y bloqueo de 15 minutos (`dominio/bloqueo.ts`).
- **Terminado:** pasan los tests: login correcto; 5 fallos bloquean; el 6.º intento correcto antes de 15 min da 423;
  a los 15 min entra y el contador vuelve a 0; el token vence a las 8 h.

### T07 — Administrador inicial al arrancar
- **Agente:** backend · **RN/HU:** RN1 · HU2 · **Depende de:** T06
- **Qué hacer:** `asegurarAdminInicial()` con `INITIAL_ADMIN_EMAIL` / `INITIAL_ADMIN_PASSWORD`.
- **Terminado:** test: sin admins lo crea; con un admin existente no crea otro.

### T08 — Middleware de autenticación y roles
- **Agente:** backend · **RN/HU:** RN5 · **Depende de:** T06
- **Qué hacer:** `autenticar` (401 sin token o vencido) y `requerirRol(...roles)` (403); `GET /api/auth/yo`.
- **Terminado:** pasan los tests de 401, 403 y `/auth/yo`.

### T09 — Alta y listado de docentes
- **Agente:** backend · **RN/HU:** RN2, RN4 · HU4 · **Depende de:** T08
- **Qué hacer:** `POST /api/docentes` y `GET /api/docentes` solo para admin.
- **Terminado:** test: el admin crea un docente que después inicia sesión; un docente o estudiante recibe 403.

## Etapa 3 — Comisiones y calendario

### T10 — Dominio: calendario de días de práctica
- **Agente:** backend · **RN/HU:** RN8 · HU7 · **Depende de:** T02
- **Qué hacer:** `esDiaDePractica(comision, fecha, noLaborables)` y `diasDePractica(comision, noLaborables, hasta?)`.
- **Terminado:** pasan los tests: días fuera de rango, fines de semana, días que no son de la comisión, feriados,
  recesos de otra comisión (no afectan) y bordes de inicio y fin incluidos.

### T11 — Comisiones: crear, editar y código de inscripción
- **Agente:** backend · **RN/HU:** RN7, RN11 · HU3 · **Depende de:** T08, T10
- **Qué hacer:** validación de comisión; generador de código; `POST`, `GET`, `PATCH /api/comisiones`.
- **Terminado:** pasan los tests: código de 6 caracteres del alfabeto permitido y único; 270 días ok y 271 no;
  editar días de una comisión iniciada da 400 y editar el nombre funciona; el docente solo ve las suyas.

### T12 — Registro de estudiantes con código
- **Agente:** backend · **RN/HU:** RN2, RN3 · HU1 · **Depende de:** T11
- **Qué hacer:** `POST /api/auth/registro`.
- **Terminado:** pasan los tests: registro válido (devuelve token), código inexistente, email repetido con otras
  mayúsculas, contraseña sin número.

### T13 — Días no laborables y feriados 2026
- **Agente:** backend · **RN/HU:** RN9, RN10 · HU5, HU6 · **Depende de:** T11
- **Qué hacer:** semilla de feriados nacionales 2026; `GET/POST/DELETE /api/dias-no-laborables` con permisos por rol.
- **Terminado:** pasan los tests: feriados precargados; fecha pasada rechazada; docente solo recesos de su comisión;
  duplicado da 409.

## Etapa 4 — Entradas (lo más complejo)

### T14 — Dominio: validación de datos de una entrada
- **Agente:** backend · **RN/HU:** RN16, RN17, RN18 · HU8 · **Depende de:** T03
- **Qué hacer:** `validarDatosEntrada(datos, horasJornada)`.
- **Terminado:** pasan los tests de bordes: 0,5 y la jornada ok; 0, 2,3 y jornada + 0,5 no; 5 y 120 caracteres ok,
  4 y 121 no; 6 evidencias no; URL `ftp://` no; etiquetas repetidas no.

### T15 — Dominio: plazos y transiciones de estado
- **Agente:** backend · **RN/HU:** RN13, RN14, RN19, RN20, RN21 · HU8–HU10 · **Depende de:** T02
- **Qué hacer:** `puedeTransicionar`, `puedeEditar`, `puedeBorrar`, `dentroDePlazoDeCarga`, `dentroDePlazoDeCorreccion`.
- **Terminado:** pasan los tests de la tabla de transiciones completa y de los bordes de 7 días.

### T16 — Repositorios de entradas (memoria y PostgreSQL) con versión
- **Agente:** backend · **RN/HU:** RN15, RN23, RN29 · **Depende de:** T05
- **Qué hacer:** `RepoEntradas` con crear (detecta duplicado), obtener, listar paginado con filtros,
  `actualizarConVersion` (incluye evidencias y comentarios) y borrar con versión.
- **Terminado:** tests de contrato: duplicado → `EntradaDuplicada`; versión vieja → `VersionDesactualizada`;
  paginado de 10 por fecha descendente.

### T17 — Crear entrada (con concurrencia)
- **Agente:** backend · **RN/HU:** RN12–RN18 · HU8 · **Depende de:** T13, T14, T15, T16
- **Qué hacer:** `POST /api/entradas`.
- **Terminado:** pasan los tests de HU8, incluido que dos pedidos simultáneos para la misma fecha dejan una sola
  entrada y uno de ellos recibe 409.

### T18 — Leer, listar, editar y borrar entradas
- **Agente:** backend · **RN/HU:** RN20, RN23, RN24, RN29 · HU9, HU14 · **Depende de:** T17
- **Qué hacer:** `GET /api/entradas`, `GET/PATCH/DELETE /api/entradas/:id`, `servicios/accesoServicio.ts`.
- **Terminado:** pasan los tests de HU9 y HU14 y que una entrada ajena da 404.

### T19 — Enviar entrada a revisión
- **Agente:** backend · **RN/HU:** RN19, RN21, RN23 · HU10 · **Depende de:** T18
- **Qué hacer:** `POST /api/entradas/:id/enviar`.
- **Terminado:** pasan los tests de HU10 (sin evidencia, plazo de carga, plazo de corrección de 7 días).

### T20 — Validar y observar entradas
- **Agente:** backend · **RN/HU:** RN19, RN22, RN23, RN24 · HU11 · **Depende de:** T19
- **Qué hacer:** `POST /api/entradas/:id/validar` y `/observar`.
- **Terminado:** pasan los tests de HU11, incluido el conflicto cuando el estudiante editó después.

## Etapa 5 — Seguimiento y exportación

### T21 — Dominio: pendientes, asistencia, riesgo y horas
- **Agente:** backend · **RN/HU:** RN25, RN26, RN27 · HU7, HU12 · **Depende de:** T10
- **Qué hacer:** `calcularResumen(comision, noLaborables, entradas, hoy)` y `estadoDelDia(...)`.
- **Terminado:** pasan los tests de HU12 (70 % en riesgo, 33 % con 3 días sin riesgo, 5,5 horas) y de comisión no
  iniciada.

### T22 — Calendario mensual y resumen del estudiante
- **Agente:** backend · **RN/HU:** RN8, RN25–RN27 · HU7, HU12 · **Depende de:** T20, T21
- **Qué hacer:** `GET /api/mi/calendario?mes=` y `GET /api/mi/resumen`.
- **Terminado:** pasan los tests de HU7 y HU12 por la API.

### T23 — Estudiantes de una comisión y vista del docente
- **Agente:** backend · **RN/HU:** RN24, RN26, RN27 · HU13 · **Depende de:** T22
- **Qué hacer:** `GET /api/comisiones/:id/estudiantes`, `GET /api/estudiantes/:id/entradas` y `/resumen`.
- **Terminado:** pasan los tests de HU13 (incluye 404 para comisión ajena).

### T24 — Exportación CSV
- **Agente:** backend · **RN/HU:** RN28 · HU15 · **Depende de:** T23
- **Qué hacer:** `dominio/csv.ts`; `GET /api/mi/exportacion` y `GET /api/estudiantes/:id/exportacion`.
- **Terminado:** pasan los tests de HU15: solo validadas, orden ascendente, `;`, BOM y escape de comillas.

### T25 — Tests de contrato contra PostgreSQL
- **Agente:** tester · **RN/HU:** RN15, RN23 · **Depende de:** T16
- **Qué hacer:** correr la suite de contrato de repositorios contra una base PostgreSQL real
  (`TEST_DATABASE_URL`), incluida la concurrencia de RN15 con pedidos en paralelo.
- **Terminado:** la suite pasa contra PostgreSQL; el resultado queda registrado en el informe.

## Etapa 6 — Frontend

### T26 — Proyecto frontend, cliente de API, sesión y rutas por rol
- **Agente:** frontend · **Depende de:** T22
- **Qué hacer:** Vite + React + TS + React Router; `api/cliente.ts`; contexto de sesión; rutas protegidas por rol;
  diseño base adaptable al celular.
- **Terminado:** pasan los tests del cliente (token en el header, 401 cierra sesión) y `npm run build` compila.

### T27 — Pantallas de login y registro
- **Agente:** frontend · **RN/HU:** HU1, HU2 · **Depende de:** T26
- **Terminado:** se puede registrar un estudiante con código e iniciar sesión con cada rol contra el backend local;
  los errores del backend se muestran.

### T28 — Inicio del estudiante y calendario
- **Agente:** frontend · **RN/HU:** HU7, HU12 · **Depende de:** T27
- **Terminado:** se ven resumen, alerta de riesgo, pendientes y el calendario del mes con colores por estado;
  test del componente de calendario pasa.

### T29 — Lista de entradas y formulario de entrada
- **Agente:** frontend · **RN/HU:** HU8–HU10, HU14, HU15 · **Depende de:** T28
- **Terminado:** se crea, edita, envía y borra una entrada; los filtros y la paginación funcionan; el 409 muestra
  un aviso y recarga; se descarga el CSV.

### T30 — Pantallas del docente
- **Agente:** frontend · **RN/HU:** HU6, HU11, HU13, HU15 · **Depende de:** T29
- **Terminado:** el docente ve sus comisiones, estudiantes con riesgo, la carpeta de cada uno, valida u observa
  y carga recesos.

### T31 — Pantallas del administrador
- **Agente:** frontend · **RN/HU:** HU3, HU4, HU5 · **Depende de:** T30
- **Terminado:** el administrador crea y edita comisiones, crea docentes y gestiona feriados.

## Etapa 7 — Publicación y cierre

### T32 — Configuración de despliegue (CORS, variables, Railway)
- **Agente:** arquitecto · **Depende de:** T31
- **Qué hacer:** CORS con `FRONTEND_URL`; `.env.example` en backend y frontend; scripts `build` y `start`;
  configuración de Railway por servicio.
- **Terminado:** test de CORS (origen permitido sí, otro no) pasa; ningún secreto en el repositorio.

### T33 — Publicación en Railway y prueba en internet
- **Agente:** arquitecto · **Depende de:** T32
- **Qué hacer:** crear el proyecto en Railway con PostgreSQL, backend y frontend; cargar variables; dominios públicos.
- **Terminado:** desde internet se registra un estudiante, se carga y envía una entrada y un docente la valida.

### T34 — README final e informe con las pruebas
- **Agente:** analista · **Depende de:** T33
- **Qué hacer:** README con link público, cómo correr el proyecto y usuarios de prueba; `docs/informe.md` con el
  plan, el orden de las tareas, los tests y las pruebas de la API.
- **Terminado:** el revisor aprueba que el checklist final de la consigna está completo.
