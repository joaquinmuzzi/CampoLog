import { RequestHandler } from 'express';
import type { Servicios } from '../app';
import { usuarioDe } from '../middlewares/autenticacion';
import { enviarCsv } from './exportacion';
import { idDeRuta } from './parametros';

/** Vista del docente (o del administrador) sobre la carpeta de un estudiante (/api/estudiantes/:id/...). */
export function controladorEstudiantes({ acceso, entradas, seguimiento, exportacion }: Servicios) {
  const visible = (req: Parameters<RequestHandler>[0], res: Parameters<RequestHandler>[1]) =>
    acceso.estudianteVisible(usuarioDe(res), idDeRuta(req.params.id, 'Estudiante')); // RN24

  const entradasDe: RequestHandler = async (req, res) => {
    const { estudiante } = await visible(req, res);
    res.json(await entradas.listarDeEstudiante(estudiante.id, req.query));
  };
  const resumenDe: RequestHandler = async (req, res) => {
    const { estudiante, comision } = await visible(req, res);
    res.json(await seguimiento.resumenCon(estudiante, comision));
  };
  const exportar: RequestHandler = async (req, res) => {
    const { estudiante } = await visible(req, res);
    enviarCsv(res, await exportacion.carpeta(estudiante)); // RN28
  };
  return { entradasDe, resumenDe, exportar };
}
