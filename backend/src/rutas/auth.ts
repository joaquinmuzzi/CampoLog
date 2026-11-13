import { Router } from 'express';
import type { Servicios } from '../app';
import { controladorAuth } from '../controladores/authControlador';

export function crearRutasAuth(servicios: Servicios): Router {
  const c = controladorAuth(servicios);
  const rutas = Router();
  rutas.post('/login', c.login);
  return rutas;
}
