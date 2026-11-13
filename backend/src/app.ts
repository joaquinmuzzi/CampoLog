import express, { Express } from 'express';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores';

export interface Dependencias {
  // Se completa en las tareas siguientes (repositorios, reloj y configuración).
}

export function crearApp(_deps: Partial<Dependencias> = {}): Express {
  const app = express();
  app.use(express.json({ limit: '100kb' }));

  app.get('/api/salud', (_req, res) => {
    res.json({ estado: 'ok' });
  });

  app.use('/api', rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
