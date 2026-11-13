import { Pool } from 'pg';
import { DiaNoLaborable } from '../../dominio/tipos';
import { DiaNoLaborableDuplicado, esViolacionUnica } from '../errores';
import { RepoDiasNoLaborables } from '../tipos';

const COLUMNAS = 'id, fecha, motivo, tipo, comision_id';

function aDia(f: any): DiaNoLaborable {
  return { id: f.id, fecha: f.fecha, motivo: f.motivo, tipo: f.tipo, comisionId: f.comision_id };
}

export class RepoDiasNoLaborablesPg implements RepoDiasNoLaborables {
  constructor(private readonly pool: Pool) {}

  async crear(n: Omit<DiaNoLaborable, 'id'>): Promise<DiaNoLaborable> {
    try {
      const { rows } = await this.pool.query(
        `INSERT INTO dias_no_laborables (fecha, motivo, tipo, comision_id) VALUES ($1, $2, $3, $4) RETURNING ${COLUMNAS}`,
        [n.fecha, n.motivo, n.tipo, n.comisionId],
      );
      return aDia(rows[0]);
    } catch (error) {
      if (esViolacionUnica(error, 'dias_no_laborables_unico')) throw new DiaNoLaborableDuplicado();
      throw error;
    }
  }

  async porId(id: number) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNAS} FROM dias_no_laborables WHERE id = $1`, [id]);
    return rows[0] ? aDia(rows[0]) : null;
  }

  async listarFeriados() {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNAS} FROM dias_no_laborables WHERE tipo = 'FERIADO' ORDER BY fecha, id`,
    );
    return rows.map(aDia);
  }

  async paraComision(comisionId: number) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNAS} FROM dias_no_laborables WHERE tipo = 'FERIADO' OR comision_id = $1 ORDER BY fecha, id`,
      [comisionId],
    );
    return rows.map(aDia);
  }

  async borrar(id: number) {
    await this.pool.query('DELETE FROM dias_no_laborables WHERE id = $1', [id]);
  }
}
