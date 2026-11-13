# CampoLog

Carpeta de campo digital para las **Prácticas Profesionalizantes** de las escuelas técnicas: cada estudiante
registra sus jornadas de práctica con evidencias, su docente las revisa (las valida o las observa) y el sistema
calcula solo los días de práctica, la asistencia, el riesgo y las horas.

## Probar la aplicación publicada

**👉 https://frontend-production-32dc3f68.up.railway.app**

API: https://backend-production-535121a0.up.railway.app/api/salud

Cuentas de demostración (contraseña `demo1234`):

| Rol | Email | Qué probar |
|---|---|---|
| Docente | `docente@campolog.demo` | Ver la comisión, los estudiantes en riesgo, revisar (validar u observar) y cargar recesos |
| Estudiante | `ana@campolog.demo` | Inicio con pendientes, calendario, cargar una jornada, enviarla, corregir una observada, exportar el CSV |
| Estudiante | `bruno@campolog.demo`, `carla@campolog.demo` | Estudiantes con asistencia baja (en riesgo) |

También se puede crear una cuenta de estudiante nueva desde **"Creala con el código de tu comisión"** usando el
código **`DEMO26`**. La cuenta de administración no se publica en este README (se entrega aparte).

> La comisión de demostración es de martes y jueves, del 04/08/2026 al 10/12/2026. Solo se pueden cargar
> jornadas de días de práctica de los últimos 7 días (RN12–RN14).

## Qué resuelve

- **Calendario propio por comisión**: días de la semana, fechas y horas por jornada; descuenta feriados y recesos.
- **Una entrada por día y con plazo**: solo días de práctica, sin fechas futuras y hasta 7 días después.
- **Circuito de revisión**: borrador → enviada → validada u observada (con comentario obligatorio) → corregida.
- **Concurrencia**: si dos pedidos crean la misma jornada o dos personas cambian la misma entrada a la vez, gana uno
  solo (restricción única y control por versión, con aviso `409`).
- **Seguimiento**: pendientes de carga, asistencia (en riesgo por debajo del 75 %), horas validadas y exportación CSV.

Las 29 reglas de negocio (RN) y las 15 historias de usuario (HU) están en [`docs/spec.md`](docs/spec.md).

## Documentación (metodología del curso)

| Documento | Para qué |
|---|---|
| [`docs/idea.md`](docs/idea.md) | La idea "pasada en limpio" |
| [`docs/decisiones.md`](docs/decisiones.md) | Cada decisión del negocio, con su pregunta y su respuesta (D1–D38) |
| [`docs/glosario.md`](docs/glosario.md) | Términos del negocio |
| [`docs/preguntas-abiertas.md`](docs/preguntas-abiertas.md) | Dudas, la regla que afectan y su impacto (todas resueltas) |
| [`docs/spec.md`](docs/spec.md) | **Fuente de verdad**: RN1–RN29, HU1–HU15, casos borde, sin pendientes |
| [`AGENTS.md`](AGENTS.md) y [`.cursor/rules/`](.cursor/rules) | Reglamento de la obra y reglas de los 6 agentes |
| [`docs/plan.md`](docs/plan.md) | Plan técnico: arquitectura, base de datos, API, dónde vive cada regla |
| [`docs/tasks.md`](docs/tasks.md) | Las 34 tareas, ordenadas por dependencias, todas terminadas (un commit por tarea) |
| [`docs/informe.md`](docs/informe.md) | **Informe final**: plan, orden de las tareas y pruebas |
| [`docs/pruebas/`](docs/pruebas) | Registros de las pruebas y colección de Postman |

## Stack

- **Backend:** Node.js + TypeScript + Express 5, Zod, PostgreSQL (`pg`), JWT, bcrypt. Tests con Vitest y Supertest.
- **Frontend:** React 18 + TypeScript + Vite + React Router. Tests con Vitest y Testing Library.
- **Publicación:** Railway (servicios `backend`, `frontend` y `Postgres`).

## Correrlo en la computadora

Requisitos: Node.js 20 o superior.

**Opción rápida, sin base de datos** (repositorios en memoria y datos de demostración):

```bash
cd backend
npm install
npm run dev:memoria
```

En otra terminal:

```bash
cd frontend
npm install
npm run dev
```

Abrir http://localhost:5173 (el frontend manda `/api` al backend de http://localhost:3000). Además de las cuentas
de demostración, este modo crea el administrador local `admin@campolog.demo` con contraseña `admin1234`
(solo existe en tu máquina).

**Con PostgreSQL:** copiar `backend/.env.example` como `backend/.env`, completar `DATABASE_URL`, `JWT_SECRET` y el
administrador inicial, y correr `npm run dev` en `backend/`. Al arrancar se aplican las migraciones y se crea el
administrador si no existe.

## Tests

```bash
cd backend && npm test     # 195 tests (los de contrato de PostgreSQL corren si existe TEST_DATABASE_URL)
cd frontend && npm test    # 16 tests
```

Prueba de punta a punta de la API (registro, carga, envío, observación, validación, CSV y casos de error):

```bash
cd backend && node scripts/probar-api.mjs https://backend-production-535121a0.up.railway.app https://frontend-production-32dc3f68.up.railway.app
```

## Variables de entorno

Los secretos nunca van al repositorio: `.env` está en el `.gitignore` y en Railway se cargan como variables de
cada servicio. Ver [`backend/.env.example`](backend/.env.example) y [`frontend/.env.example`](frontend/.env.example).

| Servicio | Variable | Para qué |
|---|---|---|
| backend | `DATABASE_URL` | Conexión a PostgreSQL (en Railway, referencia a `${{Postgres.DATABASE_URL}}`) |
| backend | `JWT_SECRET` | Firma de los tokens |
| backend | `FRONTEND_URL` | Único origen permitido por CORS |
| backend | `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_PASSWORD` | Administrador inicial (RN1) |
| backend | `SEMBRAR_DEMO` | `true` para cargar los datos de demostración |
| frontend | `VITE_API_URL` | Dirección pública del backend (se usa al compilar) |

## Grupo

Proyecto final de **Generación T — Bootcamp IA-First** (Módulo 5).

- Kevin Yavi
- Felipe Salinas
- Juan Hracek
- Santino Portaluppi
- Joaquín Muzzi
