import { RequestHandler } from 'express';
import type { Servicios } from '../app';
import { usuarioDe } from '../middlewares/autenticacion';
import { idDeRuta } from './parametros';

export function controladorComisiones({ comisiones }: Servicios) {
  const listar: RequestHandler = async (_req, res) => {
    res.json(await comisiones.listar(usuarioDe(res)));
  };
  const crear: RequestHandler = async (req, res) => {
    res.status(201).json(await comisiones.crear(req.body));
  };
  const obtener: RequestHandler = async (req, res) => {
    res.json(await comisiones.obtener(usuarioDe(res), idDeRuta(req.params.id, 'Comisión')));
  };
  const actualizar: RequestHandler = async (req, res) => {
    res.json(await comisiones.actualizar(idDeRuta(req.params.id, 'Comisión'), req.body));
  };
  return { listar, crear, obtener, actualizar };
}
