import { Router } from 'express';
import type { Servicios } from '../app';
import { controladorEstudiantes } from '../controladores/estudianteControlador';
import { autenticar, requerirRol } from '../middlewares/autenticacion';

export function crearRutasEstudiantes(servicios: Servicios): Router {
  const c = controladorEstudiantes(servicios);
  const rutas = Router();
  rutas.use(autenticar(servicios.auth), requerirRol('ADMIN', 'DOCENTE'));
  rutas.get('/:id/entradas', c.entradasDe);
  rutas.get('/:id/resumen', c.resumenDe);
  rutas.get('/:id/exportacion', c.exportar);
  return rutas;
}
