# AGENTS.md — Reglamento de la obra

Este archivo vale para **todos** los agentes de IA que trabajan en CampoLog (y para las personas del equipo).
Antes de hacer cualquier cosa, se lee entero.

## 1. El proyecto

CampoLog es una aplicación web para que estudiantes de escuelas técnicas lleven su **carpeta de campo** de
Prácticas Profesionalizantes, una entrada por jornada con evidencias, y para que su docente la revise y la valide.

## 2. Documentos y fuente de verdad

| Documento | Qué tiene | Quién lo modifica |
|---|---|---|
| `docs/spec.md` | **Fuente de verdad.** Reglas de negocio (RN) e historias de usuario (HU). | Solo el analista |
| `docs/idea.md` | La idea pasada en limpio. | Solo el analista |
| `docs/decisiones.md` | Cada decisión con su pregunta y respuesta. | Solo el analista |
| `docs/glosario.md` | Los términos del negocio. | Solo el analista |
| `docs/preguntas-abiertas.md` | Dudas sin resolver y su impacto. | Analista (cualquiera puede proponer una) |
| `docs/plan.md` | Arquitectura, base de datos, API y dónde vive cada regla. | Solo el arquitecto |
| `docs/tasks.md` | Tareas chicas ordenadas por dependencias, con su estado. | Arquitecto (crea) y revisor (marca hechas) |
| `docs/informe.md` | Informe final con las pruebas y el orden de las tareas. | Equipo |

Si dos documentos se contradicen, **gana `docs/spec.md`**.

## 3. Stack

- **Frontend:** React 18 + TypeScript + Vite + React Router, en `frontend/`.
- **Backend:** Node.js 20 + TypeScript + Express, en `backend/`, en capas: rutas → controladores → servicios →
  repositorios. Las reglas de negocio puras viven en `backend/src/dominio/`.
- **Base de datos:** PostgreSQL (la define el arquitecto en `docs/plan.md`).
- **Tests:** Vitest (backend y frontend) y Supertest para la API.
- **Publicación:** Railway (frontend, backend y PostgreSQL).

## 4. Reglas para todos los agentes

1. Antes de actuar, leer `docs/spec.md`, `docs/glosario.md` y la tarea de `docs/tasks.md` que se va a hacer.
2. **No inventar reglas.** Si algo no está en la spec, frenar y preguntar (o registrarlo en `preguntas-abiertas.md`).
3. Todo cambio cumple las RN y las HU que dice su tarea, y las nombra en el código o en los tests donde corresponde.
4. Si un pedido contradice la spec, avisar **antes** de hacerlo.
5. Cambios chicos: **una tarea por vez** y sin tocar archivos fuera del área del agente.
6. Usar los términos del glosario (entrada, día de práctica, observada, etc.) en código, mensajes e interfaz.
7. **Secretos nunca en el código:** van en `.env` (que está en `.gitignore`) y en las variables de Railway.
   Las cadenas de conexión las carga una persona, no se le piden a la IA.
8. Mensajes al usuario en español, claros y sin detalles internos de la base o del servidor.
9. Al terminar, listar los archivos modificados y cómo comprobar el cambio.

## 5. Agentes

| Agente | Archivo de reglas | Responsabilidad |
|---|---|---|
| Analista | `.cursor/rules/analista.mdc` | Dueño de la spec, las decisiones, el glosario y las preguntas abiertas. No escribe código. |
| Arquitecto | `.cursor/rules/arquitecto.mdc` | Define arquitectura, modelo de datos y API en `plan.md` y parte el trabajo en `tasks.md`. No implementa. |
| Dev backend | `.cursor/rules/backend.mdc` | Implementa el backend hasta que pasen los tests de la tarea. No modifica ni borra tests. |
| Dev frontend | `.cursor/rules/frontend.mdc` | Implementa las pantallas en `frontend/`. No modifica ni borra tests. |
| Tester | `.cursor/rules/tester.mdc` | Escribe los tests de cada tarea a partir de los criterios de aceptación, antes del código. |
| Revisor | `.cursor/rules/revisor.mdc` | Inspector de la obra: compara el cambio contra la spec y da **APROBADO** o **RECHAZADO** con motivos. |

Se invocan por su nombre (por ejemplo, `@revisor`) y se les pasa la tarea concreta.

## 6. Ciclo de trabajo de una tarea

1. **Tester:** escribe los tests de la tarea a partir de sus criterios de terminado y de la spec. Los corre: tienen
   que **fallar** (rojo).
2. **Dev (backend o frontend):** implementa lo mínimo para que pasen (verde) y después ordena el código (refactor).
   **No modifica los tests**; si cree que un test está mal, lo reporta.
3. **Revisor:** compara el cambio contra la spec y la tarea. Veredicto **APROBADO** o **RECHAZADO** con motivos.
   Si rechaza, vuelve al paso que corresponda.
4. **Commit:** con el aprobado se hace **un commit por tarea**, con el mensaje `T<nn>: <título de la tarea>`.
5. **Tarea hecha:** se marca `[x]` en `docs/tasks.md` en ese mismo commit.

Una tarea está **terminada** solo cuando pasan sus tests (y todos los anteriores).
