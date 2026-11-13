import fs from 'fs';
import path from 'path';

export interface Migracion {
  nombre: string;
  sql: string;
}

/** Lo mínimo que se necesita de una conexión para migrar (un Pool o un Client de pg). */
export interface Ejecutor {
  query(sql: string, params?: unknown[]): Promise<{ rows: any[] }>;
}

export function leerMigraciones(directorio = path.join(__dirname, 'migraciones')): Migracion[] {
  return fs
    .readdirSync(directorio)
    .filter((archivo) => archivo.endsWith('.sql'))
    .sort()
    .map((nombre) => ({ nombre, sql: fs.readFileSync(path.join(directorio, nombre), 'utf8') }));
}

/** Aplica, en orden y una sola vez, las migraciones que todavía no se aplicaron. Devuelve las aplicadas. */
export async function aplicarMigraciones(db: Ejecutor, migraciones: Migracion[]): Promise<string[]> {
  await db.query(
    'CREATE TABLE IF NOT EXISTS migraciones (nombre TEXT PRIMARY KEY, aplicada_en TIMESTAMPTZ NOT NULL DEFAULT now())',
  );
  const { rows } = await db.query('SELECT nombre FROM migraciones');
  const yaAplicadas = new Set(rows.map((r) => r.nombre));
  const aplicadas: string[] = [];

  for (const migracion of [...migraciones].sort((a, b) => a.nombre.localeCompare(b.nombre))) {
    if (yaAplicadas.has(migracion.nombre)) continue;
    await db.query('BEGIN');
    try {
      await db.query(migracion.sql);
      await db.query('INSERT INTO migraciones (nombre) VALUES ($1)', [migracion.nombre]);
      await db.query('COMMIT');
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    aplicadas.push(migracion.nombre);
  }
  return aplicadas;
}
