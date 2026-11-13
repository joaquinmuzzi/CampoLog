import { Router } from 'express';
import type { Servicios } from '../app';
import { controladorUsuarios } from '../controladores/usuarioControlador';
import { autenticar, requerirRol } from '../middlewares/autenticacion';

export function crearRutasDocentes(servicios: Servicios): Router {
  const c = controladorUsuarios(servicios);
  const rutas = Router();
  rutas.use(autenticar(servicios.auth), requerirRol('ADMIN'));
  rutas.get('/', c.listarDocentes);
  rutas.post('/', c.crearDocente);
  return rutas;
}
