import { Router } from 'express';
import type { Servicios } from '../app';
import { controladorEntradas } from '../controladores/entradaControlador';
import { autenticar, requerirRol } from '../middlewares/autenticacion';

export function crearRutasEntradas(servicios: Servicios): Router {
  const c = controladorEntradas(servicios);
  const rutas = Router();
  rutas.use(autenticar(servicios.auth));
  rutas.get('/', requerirRol('ESTUDIANTE'), c.listarPropias);
  rutas.post('/', requerirRol('ESTUDIANTE'), c.crear);
  rutas.get('/:id', c.obtener);
  rutas.patch('/:id', requerirRol('ESTUDIANTE'), c.editar);
  rutas.delete('/:id', requerirRol('ESTUDIANTE'), c.borrar);
  rutas.post('/:id/enviar', requerirRol('ESTUDIANTE'), c.enviar);
  return rutas;
}
