import { Router } from 'express';
import type { Servicios } from '../app';
import { controladorComisiones } from '../controladores/comisionControlador';
import { autenticar, requerirRol } from '../middlewares/autenticacion';

export function crearRutasComisiones(servicios: Servicios): Router {
  const c = controladorComisiones(servicios);
  const rutas = Router();
  rutas.use(autenticar(servicios.auth));
  rutas.get('/', requerirRol('ADMIN', 'DOCENTE'), c.listar);
  rutas.post('/', requerirRol('ADMIN'), c.crear);
  rutas.get('/:id', requerirRol('ADMIN', 'DOCENTE'), c.obtener);
  rutas.patch('/:id', requerirRol('ADMIN'), c.actualizar);
  rutas.get('/:id/estudiantes', requerirRol('ADMIN', 'DOCENTE'), c.estudiantes);
  return rutas;
}
