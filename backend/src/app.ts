import express, { Express } from 'express';
import { Config } from './config';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores';
import { Reloj } from './reloj';
import { Repos } from './repositorios/tipos';
import { crearRutasAuth } from './rutas/auth';
import { crearRutasComisiones } from './rutas/comisiones';
import { crearRutasDiasNoLaborables } from './rutas/diasNoLaborables';
import { crearRutasDocentes } from './rutas/docentes';
import { AuthServicio } from './servicios/authServicio';
import { ComisionServicio } from './servicios/comisionServicio';
import { DiaNoLaborableServicio } from './servicios/diaNoLaborableServicio';
import { UsuarioServicio } from './servicios/usuarioServicio';

export interface Dependencias {
  repos: Repos;
  reloj: Reloj;
  config: Config;
}

export interface Servicios {
  auth: AuthServicio;
  usuarios: UsuarioServicio;
  comisiones: ComisionServicio;
  diasNoLaborables: DiaNoLaborableServicio;
}

export function crearServicios({ repos, reloj, config }: Dependencias): Servicios {
  const auth = new AuthServicio(repos, reloj, config);
  const usuarios = new UsuarioServicio(repos, auth);
  const comisiones = new ComisionServicio(repos, reloj);
  const diasNoLaborables = new DiaNoLaborableServicio(repos, reloj);
  return { auth, usuarios, comisiones, diasNoLaborables };
}

export function crearApp(deps?: Dependencias): Express {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/salud', (_req, res) => {
    res.json({ estado: 'ok' });
  });

  if (deps) {
    const servicios = crearServicios(deps);
    app.use('/api/auth', crearRutasAuth(servicios));
    app.use('/api/docentes', crearRutasDocentes(servicios));
    app.use('/api/comisiones', crearRutasComisiones(servicios));
    app.use('/api/dias-no-laborables', crearRutasDiasNoLaborables(servicios));
  }

  app.use('/api', rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
