import bcrypt from 'bcryptjs';
import { crearApp, crearServicios, Dependencias } from '../../src/app';
import { Rol } from '../../src/dominio/tipos';
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

  async function crearUsuario(rol: Rol, email: string, extra: { comisionId?: number; nombre?: string; apellido?: string } = {}) {
    return deps.repos.usuarios.crear({
      nombre: extra.nombre ?? 'Nombre', apellido: extra.apellido ?? 'Apellido', email,
      passwordHash: await bcrypt.hash(PASSWORD, 4), rol, comisionId: extra.comisionId ?? null,
    });
  }

  const tokenDe = (u: { id: number; rol: Rol }) => `Bearer ${servicios.auth.emitirToken(u)}`;

  return { app, reloj, repos: deps.repos, servicios, deps, crearUsuario, tokenDe };
}
