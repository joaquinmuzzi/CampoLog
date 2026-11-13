import { RequestHandler } from 'express';
import type { Servicios } from '../app';

export function controladorUsuarios({ usuarios }: Servicios) {
  const crearDocente: RequestHandler = async (req, res) => {
    res.status(201).json(await usuarios.crearDocente(req.body));
  };

  const listarDocentes: RequestHandler = async (_req, res) => {
    res.json(await usuarios.listarDocentes());
  };

  return { crearDocente, listarDocentes };
}
