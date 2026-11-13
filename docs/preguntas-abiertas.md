# CampoLog — Preguntas abiertas

Registro de las dudas que surgieron durante el análisis, la regla que afectaban y su impacto, ordenadas de
mayor a menor impacto. Todas quedaron **resueltas** antes de cerrar la spec: la decisión tomada figura en
`decisiones.md`. Si en el futuro aparece una duda nueva, se agrega acá con estado **Abierta** y se frena el
trabajo sobre la regla afectada hasta resolverla.

| # | Pregunta | Regla afectada | Impacto | Estado | Resolución |
|---|---|---|---|---|---|
| P1 | Si el estudiante edita una entrada mientras el docente la está validando, ¿quién gana? | RN23 | **Alto**: se podría validar un contenido distinto del que el docente leyó. | Resuelta | D31: control por versión; el segundo cambio recibe un conflicto. |
| P2 | ¿Qué pasa si llegan dos pedidos para crear la entrada del mismo día al mismo tiempo? | RN15 | **Alto**: quedarían dos entradas para un día y se duplicarían horas. | Resuelta | D21: restricción única estudiante + fecha en la base; el segundo pedido recibe un conflicto. |
| P3 | ¿Hasta cuándo se puede cargar una jornada? | RN14, RN21 | **Alto**: define si el sistema evita o no la carpeta hecha a último momento. | Resuelta | D20 y D28: 7 días corridos para cargar y enviar; 7 días para corregir una observada. |
| P4 | ¿Qué cuenta como día de práctica si hay feriados y recesos? | RN8, RN9 | **Alto**: afecta la asistencia, las horas y los días pendientes. | Resuelta | D13, D14, D15: días de la comisión menos feriados (generales) y recesos (de la comisión). |
| P5 | ¿Se puede cambiar el calendario de una comisión ya empezada? | RN11 | **Medio**: podría dejar entradas en días que dejan de ser de práctica. | Resuelta | D17: el calendario solo se edita antes de la fecha de inicio. |
| P6 | ¿Un receso puede cargarse sobre un día pasado? | RN10 | **Medio**: mismo problema que P5 para un solo día. | Resuelta | D16: solo hoy o fechas futuras. |
| P7 | ¿Cuándo se considera que un estudiante está en riesgo? | RN26 | **Medio**: con pocos días transcurridos, un solo faltante da porcentajes engañosos. | Resuelta | D34, D35: asistencia < 75 % con al menos 4 días transcurridos. |
| P8 | ¿Cómo se registra el estudiante en la comisión correcta? | RN3 | **Medio**: un estudiante en la comisión equivocada vería otro calendario. | Resuelta | D2, D3: código de inscripción de 6 caracteres. |
| P9 | ¿Se puede enviar una entrada sin evidencia? | RN21 | **Medio**: sin evidencia, el sistema no mejora la planilla de siempre. | Resuelta | D27: al menos una evidencia para enviar. |
| P10 | ¿Hace falta enviar correos de recordatorio? | RN25 | **Bajo**: es un canal extra, no cambia las reglas. | Resuelta | D33: fuera de alcance; los pendientes se muestran en la aplicación. |
| P11 | ¿En qué formato se exporta la carpeta? | RN28 | **Bajo**: solo afecta la descarga. | Resuelta | D37: CSV compatible con Excel, solo entradas validadas. |

**Preguntas abiertas pendientes: ninguna.**
