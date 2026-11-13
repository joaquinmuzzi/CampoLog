import { RequestHandler } from 'express';
import type { Servicios } from '../app';
import { usuarioDe } from '../middlewares/autenticacion';

export function controladorAuth({ auth }: Servicios) {
  const login: RequestHandler = async (req, res) => {
    res.json(await auth.login(req.body));
  };

  const yo: RequestHandler = async (_req, res) => {
    res.json(await auth.yo(usuarioDe(res).id));
  };

  return { login, yo };
}
