import { Router } from 'express';
import type { Servicios } from '../app';
import { controladorEntradas } from '../controladores/entradaControlador';
import { autenticar, requerirRol } from '../middlewares/autenticacion';

export function crearRutasEntradas(servicios: Servicios): Router {
  const c = controladorEntradas(servicios);
  const rutas = Router();
  rutas.use(autenticar(servicios.auth));
  rutas.post('/', requerirRol('ESTUDIANTE'), c.crear);
  return rutas;
}
