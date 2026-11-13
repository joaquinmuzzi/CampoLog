import { Router } from 'express';
import type { Servicios } from '../app';
import { controladorDiasNoLaborables } from '../controladores/diaNoLaborableControlador';
import { autenticar, requerirRol } from '../middlewares/autenticacion';

export function crearRutasDiasNoLaborables(servicios: Servicios): Router {
  const c = controladorDiasNoLaborables(servicios);
  const rutas = Router();
  rutas.use(autenticar(servicios.auth));
  rutas.get('/', c.listar);
  rutas.post('/', requerirRol('ADMIN', 'DOCENTE'), c.crear);
  rutas.delete('/:id', requerirRol('ADMIN', 'DOCENTE'), c.borrar);
  return rutas;
}
