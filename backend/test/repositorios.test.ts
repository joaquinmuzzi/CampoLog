import { describe } from 'vitest';
import { crearReposMemoria, crearReposPg } from '../src/repositorios';
import { crearBaseDePrueba, URL_PG_PRUEBA } from './ayudas/pg';
import { contratoUsuariosYComisiones, FabricaRepos } from './contrato/usuariosYComisiones';

const memoria: FabricaRepos = async () => ({ repos: crearReposMemoria(), limpiar: async () => {} });

const postgres: FabricaRepos = async () => {
  const { pool, limpiar } = await crearBaseDePrueba();
  return { repos: crearReposPg(pool), limpiar };
};

contratoUsuariosYComisiones('memoria', memoria);

describe.skipIf(!URL_PG_PRUEBA)('PostgreSQL', () => {
  contratoUsuariosYComisiones('postgres', postgres);
});
