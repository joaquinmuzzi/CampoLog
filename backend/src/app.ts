import cors from 'cors';
import express, { Express } from 'express';
import { Config, origenesPermitidos } from './config';
import { manejarErrores, rutaNoEncontrada } from './middlewares/errores';
import { Reloj } from './reloj';
import { Repos } from './repositorios/tipos';
import { crearRutasAuth } from './rutas/auth';
import { crearRutasComisiones } from './rutas/comisiones';
import { crearRutasDiasNoLaborables } from './rutas/diasNoLaborables';
import { crearRutasDocentes } from './rutas/docentes';
import { crearRutasEntradas } from './rutas/entradas';
import { crearRutasEstudiantes } from './rutas/estudiantes';
import { crearRutasMi } from './rutas/mi';
import { AccesoServicio } from './servicios/accesoServicio';
import { AuthServicio } from './servicios/authServicio';
import { ComisionServicio } from './servicios/comisionServicio';
import { DiaNoLaborableServicio } from './servicios/diaNoLaborableServicio';
import { EntradaServicio } from './servicios/entradaServicio';
import { ExportacionServicio } from './servicios/exportacionServicio';
import { RevisionServicio } from './servicios/revisionServicio';
import { SeguimientoServicio } from './servicios/seguimientoServicio';
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
  acceso: AccesoServicio;
  entradas: EntradaServicio;
  revision: RevisionServicio;
  seguimiento: SeguimientoServicio;
  exportacion: ExportacionServicio;
}

export function crearServicios({ repos, reloj, config }: Dependencias): Servicios {
  const auth = new AuthServicio(repos, reloj, config);
  const acceso = new AccesoServicio(repos);
  return {
    auth,
    usuarios: new UsuarioServicio(repos, auth),
    comisiones: new ComisionServicio(repos, reloj),
    diasNoLaborables: new DiaNoLaborableServicio(repos, reloj),
    acceso,
    entradas: new EntradaServicio(repos, reloj, acceso),
    revision: new RevisionServicio(repos, reloj, acceso),
    seguimiento: new SeguimientoServicio(repos, reloj),
    exportacion: new ExportacionServicio(repos),
  };
}

export function crearApp(deps?: Dependencias): Express {
  const app = express();
  // CORS: solo el frontend publicado (FRONTEND_URL) puede llamar a la API desde el navegador.
  const origenes = origenesPermitidos(deps?.config.frontendUrl);
  app.use(cors({ origin: origenes.length > 0 ? origenes : false, exposedHeaders: ['Content-Disposition'] }));
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
    app.use('/api/entradas', crearRutasEntradas(servicios));
    app.use('/api/mi', crearRutasMi(servicios));
    app.use('/api/estudiantes', crearRutasEstudiantes(servicios));
  }

  app.use('/api', rutaNoEncontrada);
  app.use(manejarErrores);
  return app;
}
