import { RequestHandler } from 'express';
import type { Servicios } from '../app';
import { usuarioDe } from '../middlewares/autenticacion';
import { idDeRuta } from './parametros';

export function controladorDiasNoLaborables({ diasNoLaborables }: Servicios) {
  const listar: RequestHandler = async (req, res) => {
    const comisionId = req.query.comisionId ? idDeRuta(req.query.comisionId, 'Comisión') : undefined;
    res.json(await diasNoLaborables.listar(usuarioDe(res), comisionId));
  };
  const crear: RequestHandler = async (req, res) => {
    res.status(201).json(await diasNoLaborables.crear(usuarioDe(res), req.body));
  };
  const borrar: RequestHandler = async (req, res) => {
    await diasNoLaborables.borrar(usuarioDe(res), idDeRuta(req.params.id, 'Día no laborable'));
    res.status(204).end();
  };
  return { listar, crear, borrar };
}
