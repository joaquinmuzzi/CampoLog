import { Pool } from 'pg';
import { crearPool } from '../../src/db/pool';
import { aplicarMigraciones, leerMigraciones } from '../../src/db/migraciones';

/** URL de una base PostgreSQL para los tests de contrato (opcional; nunca se escribe en el código). */
export const URL_PG_PRUEBA = process.env.TEST_DATABASE_URL;

/** Crea un esquema nuevo y aislado, le aplica las migraciones y devuelve un pool que lo usa. */
export async function crearBaseDePrueba(): Promise<{ pool: Pool; limpiar: () => Promise<void> }> {
  if (!URL_PG_PRUEBA) throw new Error('Falta TEST_DATABASE_URL');
  const esquema = `prueba_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
  const admin = crearPool(URL_PG_PRUEBA);
  await admin.query(`CREATE SCHEMA ${esquema}`);
  const pool = crearPool(URL_PG_PRUEBA, { searchPath: esquema });
  await aplicarMigraciones(pool, leerMigraciones());
  return {
    pool,
    limpiar: async () => {
      await pool.end();
      await admin.query(`DROP SCHEMA ${esquema} CASCADE`);
      await admin.end();
    },
  };
}
