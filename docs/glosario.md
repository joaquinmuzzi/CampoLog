# CampoLog — Glosario

Cada término del negocio en una o dos líneas. Si un término aparece en el código, en la spec o en la interfaz,
significa exactamente lo que dice acá.

| Término | Definición |
|---|---|
| **Prácticas Profesionalizantes (PP)** | Espacio curricular de 6.° año en el que el estudiante realiza prácticas en un proyecto o entorno real. |
| **Carpeta de campo** | Conjunto de entradas de un estudiante durante su comisión. Es lo que se entrega a la escuela. |
| **Administrador** | Usuario de la coordinación de PP. Crea comisiones y docentes y gestiona los días no laborables generales. |
| **Docente** | Usuario a cargo de una o más comisiones. Revisa (valida u observa) las entradas de sus estudiantes. |
| **Estudiante** | Usuario que pertenece a una comisión y registra sus jornadas. |
| **Comisión** | Grupo de estudiantes con un mismo calendario de PP y un docente a cargo. |
| **Código de inscripción** | Código de 6 caracteres (letras mayúsculas y números) que identifica a una comisión al registrarse un estudiante. |
| **Días de la semana de práctica** | Días de lunes a viernes en que la comisión tiene práctica (por ejemplo, martes y jueves). Se guardan como números del 1 (lunes) al 5 (viernes). |
| **Horas por jornada** | Horas que dura una jornada de práctica de la comisión. Entero de 1 a 8. Es el máximo de horas de una entrada. |
| **Día no laborable** | Fecha en la que no hay práctica: un feriado o un receso. |
| **Feriado** | Día no laborable general, para todas las comisiones (por ejemplo, el 25 de mayo). |
| **Receso** | Día no laborable de una sola comisión (por ejemplo, el receso invernal o una jornada institucional). |
| **Día de práctica** | Fecha entre el inicio y el fin de la comisión, que cae en uno de sus días de la semana de práctica y que no es un día no laborable. |
| **Día transcurrido** | Día de práctica con fecha menor o igual a hoy. |
| **Hoy** | La fecha actual en la zona horaria America/Argentina/Buenos_Aires. |
| **Entrada** | Registro de un estudiante para un día de práctica: actividad, descripción, horas, etiquetas y evidencias. Hay como máximo una por estudiante y día. |
| **Jornada** | Sinónimo de día de práctica cuando se habla desde el punto de vista del estudiante ("cargar la jornada"). |
| **Actividad** | Resumen corto de lo que se hizo en la jornada (5 a 120 caracteres). |
| **Evidencia** | Link (http/https) con título y tipo que prueba lo hecho en la jornada. Tipos: commit, documento, tarea, imagen, otro. |
| **Etiqueta** | Palabra corta para clasificar una entrada (por ejemplo, "documentación"). Hasta 5 por entrada. |
| **Borrador** | Estado de una entrada recién creada o en edición, que todavía no se envió al docente. |
| **Enviada** | Estado de una entrada que el estudiante mandó a revisión. No la puede editar. |
| **Observada** | Estado de una entrada que el docente devolvió con un comentario para que el estudiante la corrija. |
| **Validada** | Estado final de una entrada aprobada por el docente. No se modifica ni se borra. |
| **Observación** | Comentario obligatorio (10 a 500 caracteres) que el docente deja al observar una entrada. |
| **Plazo de carga** | 7 días corridos desde el día de práctica para crear y enviar su entrada. |
| **Plazo de corrección** | 7 días corridos desde la observación para corregir y reenviar una entrada observada. |
| **Pendiente de carga** | Día transcurrido sin entrada cuyo plazo de carga todavía no venció. |
| **Sin registro** | Día transcurrido sin entrada cuyo plazo de carga ya venció. |
| **Asistencia** | Porcentaje entero de días transcurridos que tienen una entrada validada. |
| **En riesgo** | Estudiante con asistencia menor al 75 % y al menos 4 días transcurridos. |
| **Horas validadas** | Suma de las horas de las entradas validadas de un estudiante. |
| **Horas del calendario** | Cantidad de días de práctica de la comisión multiplicada por las horas por jornada. |
| **Versión** | Número de una entrada que aumenta en cada cambio. Sirve para detectar que dos personas la modificaron a la vez. |
| **Conflicto** | Rechazo de un cambio porque la entrada fue modificada por otra persona después de que se leyó, o porque ya existe una entrada para ese día. |
| **Exportación** | Archivo CSV con las entradas validadas de un estudiante, ordenadas por fecha. |
