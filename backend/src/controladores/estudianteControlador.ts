import { RequestHandler } from 'express';
import type { Servicios } from '../app';
import { usuarioDe } from '../middlewares/autenticacion';
import { idDeRuta } from './parametros';

/** Vista del docente (o del administrador) sobre la carpeta de un estudiante (/api/estudiantes/:id/...). */
export function controladorEstudiantes({ acceso, entradas, seguimiento }: Servicios) {
  const entradasDe: RequestHandler = async (req, res) => {
    const { estudiante } = await acceso.estudianteVisible(usuarioDe(res), idDeRuta(req.params.id, 'Estudiante')); // RN24
    res.json(await entradas.listarDeEstudiante(estudiante.id, req.query));
  };
  const resumenDe: RequestHandler = async (req, res) => {
    const { estudiante, comision } = await acceso.estudianteVisible(usuarioDe(res), idDeRuta(req.params.id, 'Estudiante'));
    res.json(await seguimiento.resumenCon(estudiante, comision));
  };
  return { entradasDe, resumenDe };
}
