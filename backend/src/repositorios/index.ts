import { Pool } from 'pg';
import { RepoComisionesMemoria, RepoUsuariosMemoria } from './memoria/usuariosYComisiones';
import { RepoComisionesPg, RepoUsuariosPg } from './pg/usuariosYComisiones';
import { Repos } from './tipos';

export function crearReposMemoria(): Repos {
  return {
    usuarios: new RepoUsuariosMemoria(),
    comisiones: new RepoComisionesMemoria(),
  };
}

export function crearReposPg(pool: Pool): Repos {
  return {
    usuarios: new RepoUsuariosPg(pool),
    comisiones: new RepoComisionesPg(pool),
  };
}
