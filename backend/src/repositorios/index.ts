import { Pool } from 'pg';
import { RepoDiasNoLaborablesMemoria } from './memoria/diasNoLaborables';
import { RepoEntradasMemoria } from './memoria/entradas';
import { RepoComisionesMemoria, RepoUsuariosMemoria } from './memoria/usuariosYComisiones';
import { RepoDiasNoLaborablesPg } from './pg/diasNoLaborables';
import { RepoEntradasPg } from './pg/entradas';
import { RepoComisionesPg, RepoUsuariosPg } from './pg/usuariosYComisiones';
import { Repos } from './tipos';

export function crearReposMemoria(): Repos {
  const usuarios = new RepoUsuariosMemoria();
  return {
    usuarios,
    comisiones: new RepoComisionesMemoria(),
    diasNoLaborables: new RepoDiasNoLaborablesMemoria(),
    entradas: new RepoEntradasMemoria(usuarios),
  };
}

export function crearReposPg(pool: Pool): Repos {
  return {
    usuarios: new RepoUsuariosPg(pool),
    comisiones: new RepoComisionesPg(pool),
    diasNoLaborables: new RepoDiasNoLaborablesPg(pool),
    entradas: new RepoEntradasPg(pool),
  };
}
