import { Router } from 'express';
import type { Servicios } from '../app';
import { controladorMi } from '../controladores/miControlador';
import { autenticar, requerirRol } from '../middlewares/autenticacion';

export function crearRutasMi(servicios: Servicios): Router {
  const c = controladorMi(servicios);
  const rutas = Router();
  rutas.use(autenticar(servicios.auth), requerirRol('ESTUDIANTE'));
  rutas.get('/calendario', c.calendario);
  rutas.get('/resumen', c.resumen);
  return rutas;
}
