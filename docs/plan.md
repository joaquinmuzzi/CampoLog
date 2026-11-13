# CampoLog — Plan técnico

> Escrito por el agente **arquitecto** a partir de `spec.md`. Responde **cómo** se construye; **qué** hace el
> sistema está en la spec. Si algo de acá contradice la spec, gana la spec.

## 1. Arquitectura

```
Navegador (React)  ──HTTPS/JSON──▶  API REST (Express)  ──SQL──▶  PostgreSQL
   frontend/                          backend/                    Railway
```

Tres servicios independientes en Railway: **frontend** (archivos estáticos de Vite), **backend** (Node.js) y
**PostgreSQL**. El frontend conoce la URL del backend por `VITE_API_URL`; el backend acepta pedidos solo desde
`FRONTEND_URL` (CORS).

### Capas del backend

```
rutas/ ─▶ controladores/ ─▶ servicios/ ─▶ repositorios/ ─▶ PostgreSQL
                                │
                                └──▶ dominio/   (reglas puras, sin base de datos ni HTTP)
```

| Capa | Responsabilidad | No hace |
|---|---|---|
| `rutas/` | Asocia URL y verbo con un controlador y sus middlewares (autenticación, rol). | Lógica |
| `controladores/` | Lee el pedido, llama al servicio y arma la respuesta HTTP. | Reglas, SQL |
| `servicios/` | Orquesta un caso de uso: permisos, reglas del dominio, repositorios. | SQL, HTTP |
| `dominio/` | Reglas puras: calendario, plazos, estados, validaciones, seguimiento, CSV. Funciones sin efectos. | Base, HTTP, `new Date()` |
| `repositorios/` | Acceso a datos. Dos implementaciones con la misma interfaz: `pg/` (PostgreSQL) y `memoria/` (tests). | Reglas |

**Reloj.** "Hoy" sale de un componente `Reloj` inyectado (`RelojArgentina` en producción, `RelojFijo` en los tests),
que devuelve la fecha en America/Argentina/Buenos_Aires como texto `AAAA-MM-DD`. Así los tests de plazos no
dependen del día en que se corren y no hay corrimientos por UTC.

**Inyección de dependencias.** `crearApp({ repos, reloj, config })` arma la aplicación. En producción recibe los
repositorios de PostgreSQL; en los tests, los de memoria. Los mismos **tests de contrato** de repositorios corren
contra memoria siempre y contra PostgreSQL cuando existe `TEST_DATABASE_URL`.

## 2. Base de datos

**PostgreSQL**, porque:
- La regla de una entrada por día (RN15) y el control por versión (RN23) necesitan garantías transaccionales y
  restricciones únicas: con dos pedidos simultáneos, la base decide uno solo.
- Tipos `DATE` (sin hora) para las fechas de práctica y arreglos para los días de la semana y las etiquetas.
- Es la base vista en el curso y Railway la ofrece administrada.

### Modelo de datos

```
usuarios (id, nombre, apellido, email UNIQUE, password_hash, rol, comision_id → comisiones,
          intentos_fallidos, bloqueado_hasta, creado_en)
comisiones (id, nombre, dias_semana INT[], fecha_inicio DATE, fecha_fin DATE, horas_jornada,
            codigo_inscripcion UNIQUE, docente_id → usuarios, creado_en)
dias_no_laborables (id, fecha DATE, motivo, tipo FERIADO|RECESO, comision_id → comisiones NULL)
                   UNIQUE (fecha, COALESCE(comision_id, 0))
entradas (id, estudiante_id → usuarios, comision_id → comisiones, fecha DATE, actividad, descripcion,
          horas NUMERIC(3,1), etiquetas TEXT[], estado, version, enviada_en, observada_en,
          validada_en, creado_en, actualizado_en)  UNIQUE (estudiante_id, fecha)
evidencias (id, entrada_id → entradas ON DELETE CASCADE, tipo, titulo, url, orden)
comentarios (id, entrada_id → entradas ON DELETE CASCADE, autor_id → usuarios, tipo OBSERVACION|VALIDACION,
             texto, creado_en)
```

- `rol` ∈ `ADMIN`, `DOCENTE`, `ESTUDIANTE`; `estado` ∈ `BORRADOR`, `ENVIADA`, `OBSERVADA`, `VALIDADA` (CHECK).
- El driver `pg` devuelve los `DATE` como texto (`AAAA-MM-DD`) para evitar corrimientos de zona horaria.
- Las migraciones son archivos SQL numerados en `backend/src/db/migraciones/` que se aplican al arrancar y se
  registran en la tabla `migraciones`.

## 3. API

Prefijo `/api`. JSON en todos los casos salvo la exportación (CSV). Errores con forma
`{ "error": "mensaje en español", "detalle"?: {...} }` y códigos: 400 datos inválidos, 401 sin sesión,
403 sin permiso, 404 no existe (o no es tuyo), 409 conflicto, 423 cuenta bloqueada.

| Método y ruta | Rol | Qué hace | RN |
|---|---|---|---|
| `GET /salud` | — | Estado del servicio | — |
| `POST /auth/registro` | — | Registro de estudiante con código | RN2, RN3 |
| `POST /auth/login` | — | Inicio de sesión | RN5, RN6 |
| `GET /auth/yo` | todos | Usuario actual (y su comisión) | RN5 |
| `GET /comisiones` | admin, docente | Lista (el docente ve las suyas) | RN24 |
| `POST /comisiones` | admin | Crea comisión | RN7 |
| `GET /comisiones/:id` | admin, docente | Detalle con código | RN24 |
| `PATCH /comisiones/:id` | admin | Edita comisión | RN7, RN11 |
| `GET /comisiones/:id/estudiantes` | admin, docente | Estudiantes con su resumen | RN24, RN26, RN27 |
| `GET /docentes` · `POST /docentes` | admin | Lista y alta de docentes | RN4 |
| `GET /dias-no-laborables?comisionId=` | todos | Feriados (y recesos de una comisión) | RN9 |
| `POST /dias-no-laborables` | admin, docente | Crea feriado o receso | RN9, RN10 |
| `DELETE /dias-no-laborables/:id` | admin, docente | Borra feriado o receso | RN9, RN10 |
| `GET /mi/calendario?mes=` | estudiante | Días del mes con su estado | RN8, RN14, RN25 |
| `GET /mi/resumen` | estudiante | Asistencia, horas y pendientes | RN25–RN27 |
| `GET /mi/exportacion` | estudiante | CSV de la carpeta validada | RN28 |
| `GET /entradas?mes=&estado=&pagina=` | estudiante | Mis entradas paginadas | RN29 |
| `POST /entradas` | estudiante | Crea entrada | RN12–RN18 |
| `GET /entradas/:id` | todos | Detalle con evidencias y comentarios | RN24 |
| `PATCH /entradas/:id` | estudiante | Edita (con `version`) | RN16–RN18, RN20, RN23 |
| `DELETE /entradas/:id?version=` | estudiante | Borra un borrador | RN20, RN23 |
| `POST /entradas/:id/enviar` | estudiante | Envía a revisión | RN19, RN21, RN23 |
| `POST /entradas/:id/validar` | docente | Valida | RN19, RN22, RN23 |
| `POST /entradas/:id/observar` | docente | Observa con comentario | RN19, RN22, RN23 |
| `GET /estudiantes/:id/entradas` | admin, docente | Entradas de un estudiante | RN24, RN29 |
| `GET /estudiantes/:id/resumen` | admin, docente | Resumen de un estudiante | RN24–RN27 |
| `GET /estudiantes/:id/exportacion` | admin, docente | CSV de un estudiante | RN24, RN28 |

## 4. Dónde vive cada regla

| Regla | Archivo principal | Garantía extra |
|---|---|---|
| RN1 | `servicios/authServicio.ts` (`asegurarAdminInicial`) | se llama en `arranque.ts` al iniciar el servidor |
| RN2 | `dominio/validaciones.ts`, `servicios/authServicio.ts` | `UNIQUE(email)` |
| RN3 | `servicios/authServicio.ts` (`registrarEstudiante`) | FK `comision_id` |
| RN4 | `servicios/usuarioServicio.ts`, `rutas` con rol admin | — |
| RN5 | `servicios/authServicio.ts` (JWT 8 h), `middlewares/autenticacion.ts` | — |
| RN6 | `dominio/bloqueo.ts`, `servicios/authServicio.ts` | columnas `intentos_fallidos`, `bloqueado_hasta` |
| RN7 | `dominio/validaciones.ts` (`validarComision`), `dominio/codigo.ts` | `UNIQUE(codigo_inscripcion)` |
| RN8 | `dominio/calendario.ts` (`esDiaDePractica`, `diasDePractica`) | — |
| RN9, RN10 | `servicios/diaNoLaborableServicio.ts` | índice único (fecha, alcance) |
| RN11 | `servicios/comisionServicio.ts` | — |
| RN12–RN14 | `dominio/plazos.ts`, `servicios/entradaServicio.ts` | — |
| RN15 | `servicios/entradaServicio.ts` | `UNIQUE(estudiante_id, fecha)` → 409 |
| RN16–RN18 | `dominio/validaciones.ts` (`validarDatosEntrada`) | CHECK de estado |
| RN19 | `dominio/estados.ts` (`puedeTransicionar`) | — |
| RN20, RN21 | `dominio/estados.ts`, `dominio/plazos.ts`, `servicios/entradaServicio.ts` | — |
| RN22 | `servicios/revisionServicio.ts` | — |
| RN23 | `repositorios/*/entradas` (`actualizarConVersion`) | `UPDATE … WHERE version = $n` |
| RN24 | `servicios/accesoServicio.ts` | todas las consultas filtran por dueño |
| RN25–RN27 | `dominio/seguimiento.ts`, `servicios/seguimientoServicio.ts` | — |
| RN28 | `dominio/csv.ts`, `servicios/exportacionServicio.ts` | — |
| RN29 | `repositorios/*/entradas` (`listar`) | `ORDER BY fecha DESC LIMIT 10` |

## 5. Frontend

| Ruta | Rol | Pantalla | HU |
|---|---|---|---|
| `/login`, `/registro` | — | Inicio de sesión y registro con código | HU1, HU2 |
| `/estudiante` | estudiante | Inicio: resumen, alerta de riesgo y pendientes de carga | HU7, HU12 |
| `/estudiante/calendario` | estudiante | Calendario mensual con el estado de cada día | HU7 |
| `/estudiante/entradas` | estudiante | Mis entradas con filtros y paginación, exportar | HU14, HU15 |
| `/estudiante/entradas/nueva`, `/estudiante/entradas/:id` | estudiante | Crear, editar, enviar o borrar una entrada | HU8–HU10 |
| `/docente` | docente | Mis comisiones | HU13 |
| `/docente/comisiones/:id` | docente | Estudiantes con su situación y recesos de la comisión | HU6, HU13 |
| `/docente/estudiantes/:id` | docente | Carpeta del estudiante, resumen y exportación | HU11, HU15 |
| `/docente/entradas/:id` | docente | Revisar: validar u observar | HU11 |
| `/admin`, `/admin/comisiones/:id` | admin | Comisiones: crear, editar, recesos | HU3, HU6 |
| `/admin/docentes` | admin | Docentes | HU4 |
| `/admin/feriados` | admin | Feriados | HU5 |

El token se guarda en `localStorage`; un `401` cierra la sesión y vuelve al login.

## 6. Decisiones técnicas

| # | Decisión | Motivo |
|---|---|---|
| DT1 | Repositorios con interfaz + implementación en memoria | Tests rápidos y deterministas de servicios y API sin base de datos; el SQL se prueba aparte con tests de contrato. |
| DT2 | Validación con `zod` en el backend | Mensajes claros y un único lugar por esquema. |
| DT3 | `bcryptjs` y `jsonwebtoken` | Sin compilación nativa: despliega igual en Windows y en Railway. |
| DT4 | CSV generado a mano (sin librerías) | Es un formato simple; evita dependencias. |
| DT5 | Fechas como texto `AAAA-MM-DD` en todo el sistema | Evita corrimientos de un día entre UTC y Argentina. |
| DT6 | Migraciones SQL propias al arrancar | Sin ORM: el SQL queda a la vista y se explica en el informe. |
| DT7 | Frontend servido con `serve` en Railway | Railway corre el `npm start` del frontend sobre el build estático. |
| DT8 | Un servicio de Railway por carpeta (`/backend`, `/frontend`) más Postgres; comandos y healthcheck (`/api/salud`) configurados en cada servicio | El backend lee todo del entorno (`DATABASE_URL` como referencia a Postgres, `JWT_SECRET`, `FRONTEND_URL`, admin inicial); el frontend recibe `VITE_API_URL` al compilar. CORS solo permite `FRONTEND_URL`. |
| DT9 | Datos de demostración opcionales (`SEMBRAR_DEMO=true`) | Quien corrige puede probar los tres roles en la app publicada sin cargar todo a mano; se cargan una sola vez. |

## 7. Preguntas para el analista

Ninguna pendiente. Durante el plan surgió una duda — si el docente podía borrar un receso ya pasado — y la
spec ya la respondía (RN10: no, solo fechas desde hoy).
