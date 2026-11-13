# CampoLog — Decisiones

Cada decisión registra la pregunta que surgió al analizar la idea y la respuesta que tomamos haciendo de
cliente. No respondimos "lo primero que se nos ocurrió": en cada caso pensamos qué le sirve más a una escuela
técnica real. La columna **Regla** indica en qué regla de la `spec.md` quedó plasmada.

## Usuarios y acceso

| # | Pregunta | Decisión | Regla |
|---|---|---|---|
| D1 | ¿Quién crea la primera cuenta de administrador si no hay nadie en el sistema? | Se crea sola al arrancar el backend, con el email y la contraseña de las variables de entorno `INITIAL_ADMIN_EMAIL` e `INITIAL_ADMIN_PASSWORD`, solo si no existe ningún administrador. | RN1 |
| D2 | ¿El estudiante se registra solo o lo carga el docente? | Se registra solo, pero necesita el **código de inscripción** de su comisión. Cargar 30 alumnos a mano por comisión no escala y el código evita que alguien se anote en una comisión ajena. | RN3 |
| D3 | ¿Cómo es el código de inscripción? | 6 caracteres, letras mayúsculas y números, sin caracteres confusos (0/O, 1/I). Se genera solo al crear la comisión y es único. | RN3, RN7 |
| D4 | ¿Un estudiante puede estar en dos comisiones? | No. Un estudiante pertenece a una sola comisión; si se cambia, lo resuelve la coordinación fuera del sistema (fuera de alcance del MVP). | RN3 |
| D5 | ¿Quién crea a los docentes? | Solo el administrador. Un docente no puede registrarse solo. | RN4 |
| D6 | ¿Qué requisitos tiene la contraseña? | Mínimo 8 caracteres, con al menos una letra y un número. Se guarda con hash bcrypt. | RN2 |
| D7 | ¿Cuánto dura la sesión? | 8 horas: alcanza para una jornada escolar completa sin dejar sesiones abiertas para siempre. | RN5 |
| D8 | ¿Qué pasa si alguien prueba contraseñas? | Con 5 intentos fallidos seguidos, la cuenta queda bloqueada 15 minutos. Un login correcto reinicia el contador. | RN6 |

## Comisiones y calendario

| # | Pregunta | Decisión | Regla |
|---|---|---|---|
| D9 | ¿Qué datos define una comisión? | Nombre, días de práctica de la semana (lunes a viernes), fecha de inicio, fecha de fin, horas por jornada y docente a cargo. | RN7 |
| D10 | ¿Puede haber práctica los sábados? | No. Las PP se cursan en días hábiles; se aceptan de 1 a 5 días entre lunes y viernes. | RN7 |
| D11 | ¿Cuánto puede durar una comisión? | La fecha de fin tiene que ser posterior a la de inicio y la duración máxima es de 270 días (un ciclo lectivo). | RN7 |
| D12 | ¿Cuántas horas puede tener una jornada? | Un número entero entre 1 y 8. | RN7 |
| D13 | ¿Qué es exactamente un día de práctica? | Una fecha entre el inicio y el fin de la comisión, que cae en uno de sus días de la semana y que no es feriado ni receso. | RN8 |
| D14 | ¿De dónde salen los feriados? | Los feriados nacionales de 2026 vienen precargados. El administrador puede agregar o quitar días no laborables generales. | RN9 |
| D15 | ¿Y los recesos (por ejemplo, el receso invernal o una jornada institucional)? | El docente carga recesos para su comisión. El administrador puede cargarlos para cualquier comisión. | RN9 |
| D16 | ¿Se puede marcar como receso un día que ya pasó? | No. Solo hoy o fechas futuras, para no dejar afuera del calendario jornadas que el estudiante ya registró. | RN10 |
| D17 | ¿Se pueden cambiar los días o las fechas de una comisión ya empezada? | No. Días, fechas y horas por jornada solo se modifican antes de la fecha de inicio. Después solo se cambian el nombre y el docente. Cambiar el calendario a mitad de año invalidaría entradas ya cargadas. | RN11 |

## Entradas (jornadas)

| # | Pregunta | Decisión | Regla |
|---|---|---|---|
| D18 | ¿Se puede registrar un día que no es de práctica (por ejemplo, un sábado)? | No. Solo días de práctica de la comisión del estudiante. | RN12 |
| D19 | ¿Se puede registrar por adelantado? | No. Nunca una fecha posterior a hoy (hora Argentina). | RN13 |
| D20 | ¿Hasta cuándo se puede cargar una jornada? | Hasta 7 días corridos después del día de práctica. Pasado ese plazo, el día queda "sin registro". Es el corazón del proyecto: evita la carpeta armada a último momento. | RN14 |
| D21 | ¿Puede haber dos entradas el mismo día? | No, una por estudiante por día. Si llegan dos pedidos a la vez (doble clic, dos pestañas), se guarda uno y el otro recibe un conflicto. | RN15 |
| D22 | ¿Cuántas horas se pueden cargar? | Entre 0,5 y las horas por jornada de la comisión, en múltiplos de 0,5 (media hora). | RN16 |
| D23 | ¿Qué largo tienen los textos? | Actividad obligatoria de 5 a 120 caracteres; descripción opcional de hasta 2000; hasta 5 etiquetas de hasta 30 caracteres. | RN17 |
| D24 | ¿Cómo es una evidencia? | Un link `http` o `https` con un título (3 a 80 caracteres) y un tipo: commit, documento, tarea, imagen u otro. Máximo 5 por entrada. | RN18 |
| D25 | ¿Qué estados tiene una entrada? | Borrador → Enviada → Validada u Observada. Una observada vuelve a Enviada cuando el estudiante la reenvía. Validada es definitiva. | RN19 |
| D26 | ¿Qué puede editar o borrar el estudiante? | Edita solo borradores y observadas. Borra solo borradores. Lo enviado espera la revisión del docente y lo validado queda fijo. | RN20 |
| D27 | ¿Se puede enviar una entrada sin evidencia? | No. Para enviar hace falta al menos una evidencia: es lo que la diferencia de la planilla de siempre. | RN21 |
| D28 | ¿El envío también tiene plazo? | Sí. El primer envío, dentro de los 7 días del día de práctica. Una entrada observada se puede corregir y reenviar dentro de los 7 días desde la observación. | RN21 |

## Revisión docente

| # | Pregunta | Decisión | Regla |
|---|---|---|---|
| D29 | ¿Quién valida? | Solo el docente a cargo de la comisión del estudiante, y solo entradas en estado Enviada. | RN22 |
| D30 | ¿Observar requiere explicar por qué? | Sí. Observar exige un comentario de 10 a 500 caracteres. Validar admite un comentario opcional. | RN22 |
| D31 | ¿Qué pasa si el estudiante edita mientras el docente valida? | Cada entrada tiene una **versión**. Cada cambio indica la versión que vio quien lo hace; si mientras tanto alguien la modificó, el cambio se rechaza con un conflicto y se muestra el estado actual. Nadie pisa el trabajo del otro sin enterarse. | RN23 |
| D32 | ¿Qué ve cada rol? | El estudiante, solo sus entradas. El docente, solo las de sus comisiones. El administrador ve todo pero no modifica entradas. | RN24 |

## Seguimiento y exportación

| # | Pregunta | Decisión | Regla |
|---|---|---|---|
| D33 | ¿Cómo se recuerda al estudiante que cargue? | Sin correos (fuera de alcance): la pantalla de inicio muestra los días de práctica ya pasados sin entrada que todavía están en plazo, con los días que le quedan a cada uno. | RN25 |
| D34 | ¿Cómo se calcula la asistencia? | Días con entrada validada sobre días de práctica transcurridos hasta hoy, en porcentaje entero. Si no transcurrió ningún día, la asistencia es 100 %. | RN26 |
| D35 | ¿Cuándo un estudiante está "en riesgo"? | Cuando su asistencia es menor al 75 % y ya transcurrieron al menos 4 días de práctica (antes de eso, un solo día pendiente da porcentajes alarmistas). | RN26 |
| D36 | ¿Qué horas se muestran? | Horas validadas acumuladas contra horas totales del calendario (días de práctica × horas por jornada). | RN27 |
| D37 | ¿Qué se exporta? | Un CSV con las entradas validadas ordenadas por fecha: fecha, actividad, horas, evidencias y comentario del docente. Lo descarga el estudiante (su carpeta) o su docente. | RN28 |
| D38 | ¿Cómo se listan las entradas? | De a 10 por página, de la más nueva a la más vieja, con filtros por mes y por estado. | RN29 |
