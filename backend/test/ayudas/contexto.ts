import bcrypt from 'bcryptjs';
import { crearApp, crearServicios, Dependencias } from '../../src/app';
import { NuevaComision, Rol } from '../../src/dominio/tipos';
import { RelojFijo } from '../../src/reloj';
import { crearReposMemoria } from '../../src/repositorios';

export const PASSWORD = 'clave1234';

/** Arma la app con repositorios en memoria y un reloj fijo (por defecto, martes 15/09/2026 al mediodía). */
export function crearContexto(instante = '2026-09-15T12:00:00-03:00') {
  const reloj = new RelojFijo(instante);
  const deps: Dependencias = {
    repos: crearReposMemoria(),
    reloj,
    config: { jwtSecreto: 'secreto-de-prueba-largo', bcryptRondas: 4, frontendUrl: 'http://localhost:5173' },
  };
  const servicios = crearServicios(deps);
  const app = crearApp(deps);
  let codigos = 0;

  async function crearUsuario(rol: Rol, email: string, extra: { comisionId?: number; nombre?: string; apellido?: string } = {}) {
    return deps.repos.usuarios.crear({
      nombre: extra.nombre ?? 'Nombre', apellido: extra.apellido ?? 'Apellido', email,
      passwordHash: await bcrypt.hash(PASSWORD, 4), rol, comisionId: extra.comisionId ?? null,
    });
  }

  /** Comisión de martes y jueves, 4 horas por jornada, del 01/09/2026 al 27/11/2026 (salvo que se indique otra cosa). */
  async function crearComision(docenteId: number, extra: Partial<NuevaComision> = {}) {
    codigos++;
    return deps.repos.comisiones.crear({
      nombre: 'Comisión de prueba', diasSemana: [2, 4], fechaInicio: '2026-09-01', fechaFin: '2026-11-27',
      horasJornada: 4, codigoInscripcion: `CODE${String(codigos).padStart(2, '2')}`.slice(0, 6), docenteId, ...extra,
    });
  }

  /** Docente, comisión y estudiante listos para usar. */
  async function escenarioBase(extraComision: Partial<NuevaComision> = {}) {
    const docente = await crearUsuario('DOCENTE', 'docente@escuela.edu.ar', { nombre: 'Diego', apellido: 'Morales' });
    const comision = await crearComision(docente.id, extraComision);
    const estudiante = await crearUsuario('ESTUDIANTE', 'kevin@escuela.edu.ar', {
      comisionId: comision.id, nombre: 'Kevin', apellido: 'Yavi',
    });
    return { docente, comision, estudiante };
  }

  const tokenDe = (u: { id: number; rol: Rol }) => `Bearer ${servicios.auth.emitirToken(u)}`;

  return { app, reloj, repos: deps.repos, servicios, deps, crearUsuario, crearComision, escenarioBase, tokenDe };
}
