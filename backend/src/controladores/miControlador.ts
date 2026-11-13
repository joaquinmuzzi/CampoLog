import { RequestHandler } from 'express';
import type { Servicios } from '../app';
import { usuarioDe } from '../middlewares/autenticacion';

/** Rutas del estudiante sobre su propia carpeta (/api/mi/...). */
export function controladorMi({ seguimiento }: Servicios) {
  const calendario: RequestHandler = async (req, res) => {
    res.json(await seguimiento.calendario(usuarioDe(res).id, req.query));
  };
  const resumen: RequestHandler = async (_req, res) => {
    res.json(await seguimiento.resumen(usuarioDe(res).id));
  };
  return { calendario, resumen };
}
