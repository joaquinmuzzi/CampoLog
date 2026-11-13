import { Router } from 'express';
import type { Servicios } from '../app';
import { controladorAuth } from '../controladores/authControlador';
import { autenticar } from '../middlewares/autenticacion';

export function crearRutasAuth(servicios: Servicios): Router {
  const c = controladorAuth(servicios);
  const rutas = Router();
  rutas.post('/registro', c.registro);
  rutas.post('/login', c.login);
  rutas.get('/yo', autenticar(servicios.auth), c.yo);
  return rutas;
}
