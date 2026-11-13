import { Pool } from 'pg';
import { RepoDiasNoLaborablesMemoria } from './memoria/diasNoLaborables';
import { RepoComisionesMemoria, RepoUsuariosMemoria } from './memoria/usuariosYComisiones';
import { RepoDiasNoLaborablesPg } from './pg/diasNoLaborables';
import { RepoComisionesPg, RepoUsuariosPg } from './pg/usuariosYComisiones';
import { Repos } from './tipos';

export function crearReposMemoria(): Repos {
  return {
    usuarios: new RepoUsuariosMemoria(),
    comisiones: new RepoComisionesMemoria(),
    diasNoLaborables: new RepoDiasNoLaborablesMemoria(),
  };
}

export function crearReposPg(pool: Pool): Repos {
  return {
    usuarios: new RepoUsuariosPg(pool),
    comisiones: new RepoComisionesPg(pool),
    diasNoLaborables: new RepoDiasNoLaborablesPg(pool),
  };
}
