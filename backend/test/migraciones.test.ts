import { describe, expect, it } from 'vitest';
import { aplicarMigraciones, Ejecutor, leerMigraciones } from '../src/db/migraciones';
import { crearBaseDePrueba, URL_PG_PRUEBA } from './ayudas/pg';

/** Ejecutor falso que recuerda qué SQL se corrió y simula la tabla migraciones. */
function ejecutorFalso(yaAplicadas: string[] = []): Ejecutor & { corridas: string[] } {
  const aplicadas = [...yaAplicadas];
  const corridas: string[] = [];
  const control = ['BEGIN', 'COMMIT', 'ROLLBACK'];
  return {
    corridas,
    async query(sql: string, params?: unknown[]) {
      if (sql.startsWith('SELECT nombre FROM migraciones')) return { rows: aplicadas.map((nombre) => ({ nombre })) };
      if (sql.startsWith('INSERT INTO migraciones')) aplicadas.push(String(params?.[0]));
      else if (!control.includes(sql) && !sql.startsWith('CREATE TABLE IF NOT EXISTS migraciones')) corridas.push(sql);
      return { rows: [] };
    },
  };
}

describe('T04 — migraciones', () => {
  it('aplica las migraciones pendientes en orden por nombre', async () => {
    const db = ejecutorFalso();
    const aplicadas = await aplicarMigraciones(db, [
      { nombre: '002_b.sql', sql: 'SQL B' },
      { nombre: '001_a.sql', sql: 'SQL A' },
    ]);
    expect(aplicadas).toEqual(['001_a.sql', '002_b.sql']);
    expect(db.corridas).toEqual(['SQL A', 'SQL B']);
  });

  it('no repite una migración ya aplicada', async () => {
    const db = ejecutorFalso(['001_a.sql']);
    const aplicadas = await aplicarMigraciones(db, [
      { nombre: '001_a.sql', sql: 'SQL A' },
      { nombre: '002_b.sql', sql: 'SQL B' },
    ]);
    expect(aplicadas).toEqual(['002_b.sql']);
    expect(db.corridas).toEqual(['SQL B']);
  });

  it('lee el esquema inicial desde src/db/migraciones', () => {
    const migraciones = leerMigraciones();
    expect(migraciones[0].nombre).toBe('001_inicial.sql');
    expect(migraciones[0].sql).toContain('entradas_estudiante_fecha_unica');
  });

  it.skipIf(!URL_PG_PRUEBA)('el esquema se aplica sin errores en PostgreSQL', async () => {
    const { pool, limpiar } = await crearBaseDePrueba();
    try {
      const { rows } = await pool.query("SELECT to_regclass('entradas')::text AS tabla");
      expect(rows[0].tabla).toBe('entradas');
    } finally {
      await limpiar();
    }
  });
});
