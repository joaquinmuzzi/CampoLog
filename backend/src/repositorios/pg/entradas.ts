import { Pool, PoolClient } from 'pg';
import { Comentario, Entrada, Evidencia } from '../../dominio/tipos';
import { EntradaDuplicada, esViolacionUnica, VersionDesactualizada } from '../errores';
import {
  CambiosEntrada, ENTRADAS_POR_PAGINA, FiltroEntradas, NuevaEntrada, RepoEntradas,
} from '../tipos';

const COLUMNAS = `id, estudiante_id, comision_id, fecha, actividad, descripcion, horas, etiquetas, estado, version,
  enviada_en, observada_en, validada_en, creado_en, actualizado_en`;

function aEntrada(f: any, evidencias: Evidencia[], comentarios: Comentario[]): Entrada {
  return {
    id: f.id, estudianteId: f.estudiante_id, comisionId: f.comision_id, fecha: f.fecha, actividad: f.actividad,
    descripcion: f.descripcion, horas: Number(f.horas), etiquetas: f.etiquetas, estado: f.estado, version: f.version,
    evidencias, comentarios, enviadaEn: f.enviada_en, observadaEn: f.observada_en, validadaEn: f.validada_en,
    creadoEn: f.creado_en, actualizadoEn: f.actualizado_en,
  };
}

export class RepoEntradasPg implements RepoEntradas {
  constructor(private readonly pool: Pool) {}

  async crear(n: NuevaEntrada): Promise<Entrada> {
    const id = await this.enTransaccion(async (cliente) => {
      try {
        const { rows } = await cliente.query(
          `INSERT INTO entradas (estudiante_id, comision_id, fecha, actividad, descripcion, horas, etiquetas)
           VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id`,
          [n.estudianteId, n.comisionId, n.fecha, n.datos.actividad, n.datos.descripcion, n.datos.horas, n.datos.etiquetas],
        );
        await this.guardarEvidencias(cliente, rows[0].id, n.datos.evidencias);
        return rows[0].id as number;
      } catch (error) {
        // RN15: la restricción única decide cuál de dos pedidos simultáneos gana.
        if (esViolacionUnica(error, 'entradas_estudiante_fecha_unica')) throw new EntradaDuplicada();
        throw error;
      }
    });
    return (await this.porId(id)) as Entrada;
  }

  async porId(id: number) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNAS} FROM entradas WHERE id = $1`, [id]);
    if (!rows[0]) return null;
    return (await this.completar(rows))[0];
  }

  async listar(f: FiltroEntradas) {
    const condiciones = ['estudiante_id = $1'];
    const params: unknown[] = [f.estudianteId];
    if (f.mes) {
      params.push(`${f.mes}-01`);
      const p = `$${params.length}::date`;
      condiciones.push(`fecha >= ${p} AND fecha < (${p} + INTERVAL '1 month')`);
    }
    if (f.estado) { params.push(f.estado); condiciones.push(`estado = $${params.length}`); }
    const donde = condiciones.join(' AND ');
    const total = await this.pool.query(`SELECT count(*)::int AS n FROM entradas WHERE ${donde}`, params);
    params.push(ENTRADAS_POR_PAGINA, (f.pagina - 1) * ENTRADAS_POR_PAGINA);
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNAS} FROM entradas WHERE ${donde} ORDER BY fecha DESC LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params,
    );
    return { items: await this.completar(rows), total: total.rows[0].n as number };
  }

  async todasDeEstudiante(estudianteId: number) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNAS} FROM entradas WHERE estudiante_id = $1 ORDER BY fecha`, [
      estudianteId,
    ]);
    return this.completar(rows);
  }

  async actualizarConVersion(id: number, versionLeida: number, c: CambiosEntrada) {
    await this.enTransaccion(async (cliente) => {
      const sets = ['version = version + 1', 'actualizado_en = now()'];
      const params: unknown[] = [id, versionLeida];
      const poner = (columna: string, valor: unknown) => { params.push(valor); sets.push(`${columna} = $${params.length}`); };
      if (c.datos) {
        poner('actividad', c.datos.actividad);
        poner('descripcion', c.datos.descripcion);
        poner('horas', c.datos.horas);
        poner('etiquetas', c.datos.etiquetas);
      }
      if (c.estado) poner('estado', c.estado);
      if (c.enviadaEn) poner('enviada_en', c.enviadaEn);
      if (c.observadaEn) poner('observada_en', c.observadaEn);
      if (c.validadaEn) poner('validada_en', c.validadaEn);

      // RN23: solo actualiza si nadie la modificó desde que se leyó.
      const r = await cliente.query(`UPDATE entradas SET ${sets.join(', ')} WHERE id = $1 AND version = $2`, params);
      if (r.rowCount === 0) throw new VersionDesactualizada();

      if (c.datos) {
        await cliente.query('DELETE FROM evidencias WHERE entrada_id = $1', [id]);
        await this.guardarEvidencias(cliente, id, c.datos.evidencias);
      }
      if (c.comentario) {
        await cliente.query('INSERT INTO comentarios (entrada_id, autor_id, tipo, texto) VALUES ($1, $2, $3, $4)', [
          id, c.comentario.autorId, c.comentario.tipo, c.comentario.texto,
        ]);
      }
    });
    return (await this.porId(id)) as Entrada;
  }

  async borrarConVersion(id: number, versionLeida: number) {
    const r = await this.pool.query('DELETE FROM entradas WHERE id = $1 AND version = $2', [id, versionLeida]);
    if (r.rowCount === 0) throw new VersionDesactualizada(); // RN23
  }

  private async guardarEvidencias(cliente: PoolClient, entradaId: number, evidencias: Evidencia[]) {
    for (const [orden, ev] of evidencias.entries()) {
      await cliente.query('INSERT INTO evidencias (entrada_id, tipo, titulo, url, orden) VALUES ($1, $2, $3, $4, $5)', [
        entradaId, ev.tipo, ev.titulo, ev.url, orden,
      ]);
    }
  }

  /** Agrega evidencias y comentarios a las filas leídas (dos consultas para todo el lote). */
  private async completar(filas: any[]): Promise<Entrada[]> {
    if (filas.length === 0) return [];
    const ids = filas.map((f) => f.id);
    const ev = await this.pool.query(
      'SELECT entrada_id, tipo, titulo, url FROM evidencias WHERE entrada_id = ANY($1) ORDER BY entrada_id, orden', [ids],
    );
    const com = await this.pool.query(
      `SELECT c.id, c.entrada_id, c.autor_id, c.tipo, c.texto, c.creado_en, u.nombre || ' ' || u.apellido AS autor_nombre
       FROM comentarios c JOIN usuarios u ON u.id = c.autor_id WHERE c.entrada_id = ANY($1) ORDER BY c.creado_en, c.id`,
      [ids],
    );
    return filas.map((f) =>
      aEntrada(
        f,
        ev.rows.filter((e) => e.entrada_id === f.id).map((e) => ({ tipo: e.tipo, titulo: e.titulo, url: e.url })),
        com.rows
          .filter((c) => c.entrada_id === f.id)
          .map((c) => ({ id: c.id, autorId: c.autor_id, autorNombre: c.autor_nombre, tipo: c.tipo, texto: c.texto, creadoEn: c.creado_en })),
      ),
    );
  }

  private async enTransaccion<T>(trabajo: (cliente: PoolClient) => Promise<T>): Promise<T> {
    const cliente = await this.pool.connect();
    try {
      await cliente.query('BEGIN');
      const resultado = await trabajo(cliente);
      await cliente.query('COMMIT');
      return resultado;
    } catch (error) {
      await cliente.query('ROLLBACK');
      throw error;
    } finally {
      cliente.release();
    }
  }
}
