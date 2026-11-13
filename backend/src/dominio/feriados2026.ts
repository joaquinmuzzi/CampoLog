// RN9 — Feriados nacionales 2026 precargados (con los trasladables ya movidos al día en que se cumplen).
// El administrador puede agregar o quitar feriados futuros desde la aplicación si el calendario oficial cambia.
// La migración 002_feriados_2026.sql carga esta misma lista en PostgreSQL.
export const FERIADOS_2026: ReadonlyArray<{ fecha: string; motivo: string }> = [
  { fecha: '2026-01-01', motivo: 'Año Nuevo' },
  { fecha: '2026-02-16', motivo: 'Carnaval' },
  { fecha: '2026-02-17', motivo: 'Carnaval' },
  { fecha: '2026-03-24', motivo: 'Día Nacional de la Memoria por la Verdad y la Justicia' },
  { fecha: '2026-04-02', motivo: 'Día del Veterano y de los Caídos en la Guerra de Malvinas' },
  { fecha: '2026-04-03', motivo: 'Viernes Santo' },
  { fecha: '2026-05-01', motivo: 'Día del Trabajador' },
  { fecha: '2026-05-25', motivo: 'Día de la Revolución de Mayo' },
  { fecha: '2026-06-15', motivo: 'Paso a la Inmortalidad del General Güemes' },
  { fecha: '2026-06-20', motivo: 'Paso a la Inmortalidad del General Belgrano' },
  { fecha: '2026-07-09', motivo: 'Día de la Independencia' },
  { fecha: '2026-08-17', motivo: 'Paso a la Inmortalidad del General San Martín' },
  { fecha: '2026-10-12', motivo: 'Día del Respeto a la Diversidad Cultural' },
  { fecha: '2026-11-23', motivo: 'Día de la Soberanía Nacional' },
  { fecha: '2026-12-08', motivo: 'Inmaculada Concepción de María' },
  { fecha: '2026-12-25', motivo: 'Navidad' },
];
