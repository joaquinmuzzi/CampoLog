import express, { Express } from 'express';
import { Config } from './config';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores';
import { Reloj } from './reloj';
import { Repos } from './repositorios/tipos';
import { crearRutasAuth } from './rutas/auth';
import { AuthServicio } from './servicios/authServicio';

export interface Dependencias {
  repos: Repos;
  reloj: Reloj;
  config: Config;
}

export interface Servicios {
  auth: AuthServicio;
}

export function crearServicios({ repos, reloj, config }: Dependencias): Servicios {
  const auth = new AuthServicio(repos, reloj, config);
  return { auth };
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
  }

  app.use('/api', rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
