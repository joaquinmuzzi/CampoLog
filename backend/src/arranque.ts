// Arranque del servidor de producción: lee el entorno, conecta PostgreSQL, migra y crea el admin inicial.
import { Express } from 'express';
import { Pool } from 'pg';
import { crearApp, crearServicios, Dependencias } from './app';
import { leerConfigDelEntorno } from './config';
import { aplicarMigraciones, leerMigraciones } from './db/migraciones';
import { crearPool } from './db/pool';
import { RelojArgentina } from './reloj';
import { crearReposPg } from './repositorios';
import { sembrarDemo } from './semilla';

export interface EntornoDelServidor {
  databaseUrl: string;
  ssl: boolean;
  puerto: number;
  /** Primer administrador: se crea solo si todavía no hay ninguno (RN1). */
  adminInicial: { email: string; password: string } | null;
  /** Carga la comisión y las cuentas de demostración (SEMBRAR_DEMO=true). */
  sembrarDemo: boolean;
}

/** Variables propias del servidor. Los secretos llegan siempre por el entorno, nunca escritos en el código. */
export function leerEntornoDelServidor(env: NodeJS.ProcessEnv = process.env): EntornoDelServidor {
  if (!env.DATABASE_URL) throw new Error('Falta DATABASE_URL en las variables de entorno');
  return {
    databaseUrl: env.DATABASE_URL,
    ssl: env.DATABASE_SSL === 'true',
    puerto: Number(env.PORT ?? 3000),
    adminInicial: env.INITIAL_ADMIN_EMAIL && env.INITIAL_ADMIN_PASSWORD
      ? { email: env.INITIAL_ADMIN_EMAIL, password: env.INITIAL_ADMIN_PASSWORD }
      : null,
    sembrarDemo: env.SEMBRAR_DEMO === 'true',
  };
}

/** Prepara todo lo necesario para escuchar: devuelve la app y el pool (para cerrarlo al apagar). */
export async function prepararServidor(env: NodeJS.ProcessEnv = process.env): Promise<{ app: Express; pool: Pool; puerto: number }> {
  const config = leerConfigDelEntorno(env);
  const entorno = leerEntornoDelServidor(env);
  const pool = crearPool(entorno.databaseUrl, { ssl: entorno.ssl });

  const aplicadas = await aplicarMigraciones(pool, leerMigraciones());
  if (aplicadas.length > 0) console.log(`Migraciones aplicadas: ${aplicadas.join(', ')}`);

  const deps: Dependencias = { repos: crearReposPg(pool), reloj: new RelojArgentina(), config };
  const servicios = crearServicios(deps);

  if (entorno.adminInicial) {
    const creado = await servicios.auth.asegurarAdminInicial(entorno.adminInicial.email, entorno.adminInicial.password);
    if (creado) console.log('Se creó el administrador inicial');
  }
  if (entorno.sembrarDemo && (await sembrarDemo(deps.repos, servicios.auth, deps.reloj.hoy()))) {
    console.log('Se cargaron los datos de demostración');
  }
  if (!config.frontendUrl) console.warn('Aviso: falta FRONTEND_URL; el navegador no va a poder llamar a la API desde otro dominio');

  return { app: crearApp(deps), pool, puerto: entorno.puerto };
}
