// Servidor local de desarrollo sin base de datos: repositorios en memoria y datos de demostración.
// Uso: npm run dev:memoria (no se usa en producción; las cuentas son solo para probar en tu máquina).
import { crearApp, crearServicios } from './app';
import { RelojArgentina } from './reloj';
import { crearReposMemoria } from './repositorios';
import { sembrarDemo } from './semilla';

async function main() {
  const deps = { repos: crearReposMemoria(), reloj: new RelojArgentina(), config: { jwtSecreto: 'solo-para-desarrollo-local', bcryptRondas: 4, frontendUrl: 'http://localhost:5173' } };
  const servicios = crearServicios(deps);
  await servicios.auth.asegurarAdminInicial('admin@campolog.demo', 'admin1234');
  await sembrarDemo(deps.repos, servicios.auth, deps.reloj.hoy());
  crearApp(deps).listen(3000, () => console.log('API de desarrollo en http://localhost:3000'));
}
main();
