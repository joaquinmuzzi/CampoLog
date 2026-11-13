import { RequestHandler } from 'express';
import type { Servicios } from '../app';
import { usuarioDe } from '../middlewares/autenticacion';

export function controladorEntradas({ entradas }: Servicios) {
  const crear: RequestHandler = async (req, res) => {
    res.status(201).json(await entradas.crear(usuarioDe(res), req.body));
  };
  return { crear };
}
