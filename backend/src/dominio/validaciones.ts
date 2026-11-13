import { z } from 'zod';

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
