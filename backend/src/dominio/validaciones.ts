import { z } from 'zod';
import { ErrorNegocio } from '../errores';
import { diferenciaEnDias, esFechaValida } from './fechas';

// RN2 — Credenciales.
export const esquemaEmail = z
  .string({ error: 'El email es obligatorio' })
  .trim()
  .toLowerCase()
  .pipe(z.email({ error: 'El email no es válido' }).max(254, { error: 'El email es demasiado largo' }));

export const esquemaPassword = z
  .string({ error: 'La contraseña es obligatoria' })
  .min(8, { error: 'La contraseña tiene que tener al menos 8 caracteres' })
  .max(72, { error: 'La contraseña puede tener hasta 72 caracteres' })
  .regex(/[A-Za-zÁÉÍÓÚÑáéíóúñ]/, { error: 'La contraseña tiene que tener al menos una letra' })
  .regex(/\d/, { error: 'La contraseña tiene que tener al menos un número' });

export const esquemaLogin = z.object({
  email: z.string({ error: 'El email es obligatorio' }).trim().toLowerCase(),
  password: z.string({ error: 'La contraseña es obligatoria' }),
});

const esquemaNombre = (campo: string) =>
  z
    .string({ error: `El ${campo} es obligatorio` })
    .trim()
    .min(2, { error: `El ${campo} tiene que tener entre 2 y 60 caracteres` })
    .max(60, { error: `El ${campo} tiene que tener entre 2 y 60 caracteres` });

export const esquemaPersona = z.object({
  nombre: esquemaNombre('nombre'),
  apellido: esquemaNombre('apellido'),
  email: esquemaEmail,
  password: esquemaPassword,
});

// RN7 — Comisión.
export const DURACION_MAXIMA_COMISION_DIAS = 270;

export const esquemaFecha = (campo: string) =>
  z
    .string({ error: `La ${campo} es obligatoria` })
    .refine(esFechaValida, { error: `La ${campo} no es una fecha válida (AAAA-MM-DD)` });

export const esquemaCamposComision = z.object({
  nombre: z
    .string({ error: 'El nombre es obligatorio' })
    .trim()
    .min(3, { error: 'El nombre tiene que tener entre 3 y 80 caracteres' })
    .max(80, { error: 'El nombre tiene que tener entre 3 y 80 caracteres' }),
  diasSemana: z
    .array(z.number().int().min(1).max(5), { error: 'Los días de práctica tienen que ser de lunes (1) a viernes (5)' })
    .min(1, { error: 'Elegí entre 1 y 5 días de práctica' })
    .max(5, { error: 'Elegí entre 1 y 5 días de práctica' })
    .refine((dias) => new Set(dias).size === dias.length, { error: 'Los días de práctica no se pueden repetir' })
    .transform((dias) => [...dias].sort((a, b) => a - b)),
  fechaInicio: esquemaFecha('fecha de inicio'),
  fechaFin: esquemaFecha('fecha de fin'),
  horasJornada: z
    .number({ error: 'Las horas por jornada son obligatorias' })
    .int({ error: 'Las horas por jornada tienen que ser un número entero entre 1 y 8' })
    .min(1, { error: 'Las horas por jornada tienen que ser un número entero entre 1 y 8' })
    .max(8, { error: 'Las horas por jornada tienen que ser un número entero entre 1 y 8' }),
  docenteId: z.number({ error: 'Elegí el docente a cargo' }).int().positive(),
});

export function validarFechasComision(fechaInicio: string, fechaFin: string): void {
  if (fechaFin <= fechaInicio) throw new ErrorNegocio(400, 'La fecha de fin tiene que ser posterior a la de inicio');
  if (diferenciaEnDias(fechaInicio, fechaFin) > DURACION_MAXIMA_COMISION_DIAS) {
    throw new ErrorNegocio(400, `La comisión puede durar como máximo ${DURACION_MAXIMA_COMISION_DIAS} días`);
  }
}
