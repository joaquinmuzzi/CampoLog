import { RequestHandler } from 'express';
import type { Servicios } from '../app';
import { noEncontrado } from '../errores';
import { usuarioDe } from '../middlewares/autenticacion';
import { enviarCsv } from './exportacion';

/** Rutas del estudiante sobre su propia carpeta (/api/mi/...). */
export function controladorMi({ seguimiento, exportacion, auth }: Servicios) {
  const calendario: RequestHandler = async (req, res) => {
    res.json(await seguimiento.calendario(usuarioDe(res).id, req.query));
  };
  const resumen: RequestHandler = async (_req, res) => {
    res.json(await seguimiento.resumen(usuarioDe(res).id));
  };
  const exportar: RequestHandler = async (_req, res) => {
    const estudiante = await auth.usuarioPorId(usuarioDe(res).id);
    if (!estudiante) throw noEncontrado('Estudiante');
    enviarCsv(res, await exportacion.carpeta(estudiante));
  };
  return { calendario, resumen, exportar };
}
