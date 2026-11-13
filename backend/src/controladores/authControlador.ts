import { RequestHandler } from 'express';
import type { Servicios } from '../app';

export function controladorAuth({ auth }: Servicios) {
  const login: RequestHandler = async (req, res) => {
    res.json(await auth.login(req.body));
  };

  return { login };
}
