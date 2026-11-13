import { Pool } from 'pg';
import {
  CambiosComision, Comision, NuevaComision, NuevoUsuario, Rol, Usuario,
} from '../../dominio/tipos';
import { CodigoDuplicado, EmailDuplicado, esViolacionUnica } from '../errores';
import { RepoComisiones, RepoUsuarios } from '../tipos';

const COLUMNAS_USUARIO = `id, nombre, apellido, email, password_hash, rol, comision_id,
  intentos_fallidos, bloqueado_hasta, creado_en`;

function aUsuario(f: any): Usuario {
  return {
    id: f.id, nombre: f.nombre, apellido: f.apellido, email: f.email, passwordHash: f.password_hash,
    rol: f.rol, comisionId: f.comision_id, intentosFallidos: f.intentos_fallidos,
    bloqueadoHasta: f.bloqueado_hasta, creadoEn: f.creado_en,
  };
}

export class RepoUsuariosPg implements RepoUsuarios {
  constructor(private readonly pool: Pool) {}

  async crear(n: NuevoUsuario): Promise<Usuario> {
    try {
      const { rows } = await this.pool.query(
        `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol, comision_id)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${COLUMNAS_USUARIO}`,
        [n.nombre, n.apellido, n.email.toLowerCase(), n.passwordHash, n.rol, n.comisionId],
      );
      return aUsuario(rows[0]);
    } catch (error) {
      if (esViolacionUnica(error, 'usuarios_email_key')) throw new EmailDuplicado();
      throw error;
    }
  }

  async porId(id: number) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNAS_USUARIO} FROM usuarios WHERE id = $1`, [id]);
    return rows[0] ? aUsuario(rows[0]) : null;
  }

  async porEmail(email: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNAS_USUARIO} FROM usuarios WHERE email = $1`, [
      email.toLowerCase(),
    ]);
    return rows[0] ? aUsuario(rows[0]) : null;
  }

  async listarPorRol(rol: Rol) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNAS_USUARIO} FROM usuarios WHERE rol = $1 ORDER BY apellido, nombre, id`, [rol],
    );
    return rows.map(aUsuario);
  }

  async listarEstudiantesDeComision(comisionId: number) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNAS_USUARIO} FROM usuarios WHERE rol = 'ESTUDIANTE' AND comision_id = $1
       ORDER BY apellido, nombre, id`,
      [comisionId],
    );
    return rows.map(aUsuario);
  }

  async contarPorRol(rol: Rol) {
    const { rows } = await this.pool.query('SELECT count(*)::int AS n FROM usuarios WHERE rol = $1', [rol]);
    return rows[0].n as number;
  }

  async actualizarSeguridad(id: number, intentosFallidos: number, bloqueadoHasta: Date | null) {
    await this.pool.query('UPDATE usuarios SET intentos_fallidos = $2, bloqueado_hasta = $3 WHERE id = $1', [
      id, intentosFallidos, bloqueadoHasta,
    ]);
  }
}

const COLUMNAS_COMISION = `id, nombre, dias_semana, fecha_inicio, fecha_fin, horas_jornada,
  codigo_inscripcion, docente_id, creado_en`;

function aComision(f: any): Comision {
  return {
    id: f.id, nombre: f.nombre, diasSemana: f.dias_semana.map(Number), fechaInicio: f.fecha_inicio,
    fechaFin: f.fecha_fin, horasJornada: f.horas_jornada, codigoInscripcion: f.codigo_inscripcion,
    docenteId: f.docente_id, creadoEn: f.creado_en,
  };
}

const CAMPOS_EDITABLES: Record<keyof CambiosComision, string> = {
  nombre: 'nombre',
  diasSemana: 'dias_semana',
  fechaInicio: 'fecha_inicio',
  fechaFin: 'fecha_fin',
  horasJornada: 'horas_jornada',
  docenteId: 'docente_id',
};

export class RepoComisionesPg implements RepoComisiones {
  constructor(private readonly pool: Pool) {}

  async crear(n: NuevaComision): Promise<Comision> {
    try {
      const { rows } = await this.pool.query(
        `INSERT INTO comisiones (nombre, dias_semana, fecha_inicio, fecha_fin, horas_jornada, codigo_inscripcion, docente_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING ${COLUMNAS_COMISION}`,
        [n.nombre, n.diasSemana, n.fechaInicio, n.fechaFin, n.horasJornada, n.codigoInscripcion, n.docenteId],
      );
      return aComision(rows[0]);
    } catch (error) {
      if (esViolacionUnica(error, 'comisiones_codigo_inscripcion_key')) throw new CodigoDuplicado();
      throw error;
    }
  }

  async porId(id: number) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNAS_COMISION} FROM comisiones WHERE id = $1`, [id]);
    return rows[0] ? aComision(rows[0]) : null;
  }

  async porCodigo(codigo: string) {
    const { rows } = await this.pool.query(`SELECT ${COLUMNAS_COMISION} FROM comisiones WHERE codigo_inscripcion = $1`, [
      codigo,
    ]);
    return rows[0] ? aComision(rows[0]) : null;
  }

  async listar() {
    const { rows } = await this.pool.query(`SELECT ${COLUMNAS_COMISION} FROM comisiones ORDER BY nombre, id`);
    return rows.map(aComision);
  }

  async listarPorDocente(docenteId: number) {
    const { rows } = await this.pool.query(
      `SELECT ${COLUMNAS_COMISION} FROM comisiones WHERE docente_id = $1 ORDER BY nombre, id`, [docenteId],
    );
    return rows.map(aComision);
  }

  async actualizar(id: number, cambios: CambiosComision) {
    const claves = (Object.keys(cambios) as (keyof CambiosComision)[]).filter((k) => cambios[k] !== undefined);
    if (claves.length === 0) return (await this.porId(id)) as Comision;
    const sets = claves.map((k, i) => `${CAMPOS_EDITABLES[k]} = $${i + 2}`).join(', ');
    const { rows } = await this.pool.query(
      `UPDATE comisiones SET ${sets} WHERE id = $1 RETURNING ${COLUMNAS_COMISION}`,
      [id, ...claves.map((k) => cambios[k])],
    );
    return aComision(rows[0]);
  }
}
