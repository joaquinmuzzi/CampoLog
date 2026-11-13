import { z } from 'zod';
import { DatosEntrada } from './tipos';

export const MAX_EVIDENCIAS = 5;
export const MAX_ETIQUETAS = 5;

const esquemaEvidencia = z.object({
  tipo: z.enum(['COMMIT', 'DOCUMENTO', 'TAREA', 'IMAGEN', 'OTRO'], {
    error: 'El tipo de evidencia tiene que ser commit, documento, tarea, imagen u otro',
  }),
  titulo: z
    .string({ error: 'Cada evidencia necesita un título' })
    .trim()
    .min(3, { error: 'El título de la evidencia tiene que tener entre 3 y 80 caracteres' })
    .max(80, { error: 'El título de la evidencia tiene que tener entre 3 y 80 caracteres' }),
  url: z
    .string({ error: 'Cada evidencia necesita un link' })
    .trim()
    .max(500, { error: 'El link de la evidencia puede tener hasta 500 caracteres' })
    .refine(esUrlWeb, { error: 'El link de la evidencia tiene que empezar con http:// o https://' }),
});

function esUrlWeb(valor: string): boolean {
  if (!/^https?:\/\//i.test(valor)) return false;
  try {
    return Boolean(new URL(valor).hostname);
  } catch {
    return false;
  }
}

/** RN16, RN17, RN18 — Valida y normaliza lo que el estudiante carga en una entrada. */
export function validarDatosEntrada(cuerpo: unknown, horasJornada: number): DatosEntrada {
  const esquema = z.object({
    actividad: z
      .string({ error: 'La actividad es obligatoria' })
      .trim()
      .min(5, { error: 'La actividad tiene que tener entre 5 y 120 caracteres' })
      .max(120, { error: 'La actividad tiene que tener entre 5 y 120 caracteres' }),
    descripcion: z
      .string()
      .trim()
      .max(2000, { error: 'La descripción puede tener hasta 2000 caracteres' })
      .optional()
      .default(''),
    horas: z
      .number({ error: 'Las horas son obligatorias' })
      .min(0.5, { error: `Las horas tienen que estar entre 0,5 y ${horasJornada}` })
      .max(horasJornada, { error: `Las horas tienen que estar entre 0,5 y ${horasJornada} (horas por jornada de la comisión)` })
      .refine((h) => Number.isInteger(h * 2), { error: 'Las horas se cargan en múltiplos de media hora (0,5)' }),
    etiquetas: z
      .array(
        z
          .string()
          .trim()
          .min(1, { error: 'Las etiquetas no pueden estar vacías' })
          .max(30, { error: 'Cada etiqueta puede tener hasta 30 caracteres' }),
      )
      .max(MAX_ETIQUETAS, { error: `Podés cargar hasta ${MAX_ETIQUETAS} etiquetas` })
      .refine((et) => new Set(et.map((e) => e.toLowerCase())).size === et.length, {
        error: 'Las etiquetas no se pueden repetir',
      })
      .optional()
      .default([]),
    evidencias: z
      .array(esquemaEvidencia)
      .max(MAX_EVIDENCIAS, { error: `Podés cargar hasta ${MAX_EVIDENCIAS} evidencias por entrada` })
      .optional()
      .default([]),
  });
  return esquema.parse(cuerpo);
}
