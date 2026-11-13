# CampoLog — Idea del proyecto

> Documento de idea "pasado en limpio": lo que pide el cliente después de responder todas las preguntas
> (ver `decisiones.md`). No deja huecos para que la IA complete inventando.

## El problema

En las escuelas técnicas, cada estudiante de 6.° año cursa **Prácticas Profesionalizantes (PP)** y tiene que
llevar una **carpeta de campo**: un registro de lo que hizo en cada jornada de práctica. Hoy se arma a mano en
una planilla o un documento compartido y aparecen siempre los mismos problemas:

- Se completa de golpe, el día antes de la entrega, con fechas aproximadas y actividades vagas.
- No queda atada a ninguna prueba de lo que se hizo (un commit, un documento, una tarea).
- El docente no tiene una forma simple de revisar cada jornada, pedir correcciones y validar las horas.
- Nadie sabe con certeza cuántos días de práctica hubo, porque hay feriados y recesos en el medio.

## Quién lo usa

| Rol | Quién es | Qué necesita |
|---|---|---|
| **Estudiante** | Alumno de 6.° año que cursa PP | Registrar cada jornada en menos de un minuto, con evidencia, y saber qué días le faltan cargar |
| **Docente** | Profesor a cargo de una comisión de PP | Revisar las jornadas de sus estudiantes, pedir correcciones o validarlas, y ver quién está en riesgo |
| **Administrador** | Coordinación de PP de la escuela | Crear comisiones y docentes, y cargar los feriados del año |

## Qué tiene que hacer el sistema

1. **Comisiones con calendario propio.** Cada comisión tiene días de práctica en la semana (por ejemplo, martes
   y jueves), una fecha de inicio y de fin y una cantidad de horas por jornada. Con eso, el sistema calcula solo
   los **días de práctica**, descontando feriados nacionales y recesos.
2. **Inscripción con código.** El estudiante crea su cuenta con el código de inscripción que le da su docente;
   así queda asignado a la comisión correcta sin que nadie tenga que cargarlo a mano.
3. **Registro de jornadas (entradas).** Una entrada por día de práctica, con actividad, descripción, horas,
   etiquetas y **evidencias** (links a un commit, un documento, una tarea o una imagen).
4. **Plazo de carga.** Las jornadas se cargan cerca del día en que ocurrieron: no se puede cargar el futuro ni
   un día de hace más de una semana. Así se termina la carpeta hecha de golpe.
5. **Revisión docente.** El estudiante **envía** cada entrada; el docente la **valida** o la **observa** con un
   comentario. Una entrada observada vuelve al estudiante para que la corrija y la reenvíe. Una entrada validada
   ya no se puede tocar.
6. **Seguimiento.** El estudiante ve qué días tiene **pendientes de carga** y cuántos días le quedan para cada uno.
   Estudiante y docente ven la **asistencia** (porcentaje de días validados) y las **horas validadas**, con una
   alerta cuando la asistencia baja del 75 %.
7. **Exportación.** La carpeta validada se descarga en CSV (se abre con Excel) para entregarla a la escuela.

## Qué NO hace (fuera de alcance)

- No envía correos ni notificaciones push: los recordatorios se muestran dentro de la aplicación.
- No guarda archivos: la evidencia es siempre un link.
- No maneja calificaciones ni asistencia presencial tomada por el docente.
- No tiene app móvil nativa: es una web que se usa bien desde el celular.

## Restricciones del cliente

- Interfaz en español y usable desde el celular.
- Fechas en hora de Argentina (America/Argentina/Buenos_Aires).
- Datos personales mínimos: nombre, apellido y email. Nada de DNI.
- Cada estudiante ve solo su carpeta; cada docente, solo sus comisiones.
- Tiene que poder probarse desde internet, sin instalar nada.
