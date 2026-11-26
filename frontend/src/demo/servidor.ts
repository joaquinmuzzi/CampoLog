// Modo demo (GitHub Pages): la API de CampoLog corre ENTERA en el navegador.
// Usa los mismos servicios, reglas de negocio y repositorios en memoria del backend (backend/src), así que el
// comportamiento es el real (RN1–RN29), pero sin servidor, sin base de datos y sin credenciales reales.
// Los datos se crean al abrir la página con la semilla de demostración y se reinician al recargar.
// Solo se incluye en el build de demo (npm run build:demo); el build normal sigue usando el backend publicado.
import { ErrorNegocio, sinPermiso } from '../../../backend/src/errores';
import { RelojArgentina } from '../../../backend/src/reloj';
import { crearReposMemoria } from '../../../backend/src/repositorios';
import { sembrarDemo, PASSWORD_DEMO } from '../../../backend/src/semilla';
import { AccesoServicio } from '../../../backend/src/servicios/accesoServicio';
import { AuthServicio } from '../../../backend/src/servicios/authServicio';
import { ComisionServicio } from '../../../backend/src/servicios/comisionServicio';
import { DiaNoLaborableServicio } from '../../../backend/src/servicios/diaNoLaborableServicio';
import { EntradaServicio } from '../../../backend/src/servicios/entradaServicio';
import { ExportacionServicio } from '../../../backend/src/servicios/exportacionServicio';
import { RevisionServicio } from '../../../backend/src/servicios/revisionServicio';
import { SeguimientoServicio } from '../../../backend/src/servicios/seguimientoServicio';
import { UsuarioServicio } from '../../../backend/src/servicios/usuarioServicio';

export const CUENTAS_DEMO = {
  estudiante: 'ana@campolog.demo',
  docente: 'docente@campolog.demo',
  admin: 'admin@campolog.demo',
};

// La comisión de la semilla va del 04/08/2026 al 10/12/2026. Si hoy cae fuera de ese período, la demo corre
// las fechas de la comisión para que "hoy" quede en plena cursada y siempre haya jornadas para cargar y revisar.
const INICIO_SEMILLA = '2026-08-04';
const FIN_SEMILLA = '2026-12-10';

function sumarDias(fecha: string, dias: number): string {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}

function minimoPeriodo(hoy: string): boolean {
  return hoy >= sumarDias(INICIO_SEMILLA, 21) && hoy <= FIN_SEMILLA;
}

async function crearServidor() {
  const repos = crearReposMemoria();
  const reloj = new RelojArgentina();
  // Secreto solo de la demo: los tokens de este modo no sirven contra ningún servidor.
  const config = { jwtSecreto: 'demo-en-el-navegador', bcryptRondas: 4 };
  const auth = new AuthServicio(repos, reloj, config);
  const acceso = new AccesoServicio(repos);
  const s = {
    auth,
    usuarios: new UsuarioServicio(repos, auth),
    comisiones: new ComisionServicio(repos, reloj),
    diasNoLaborables: new DiaNoLaborableServicio(repos, reloj),
    acceso,
    entradas: new EntradaServicio(repos, reloj, acceso),
    revision: new RevisionServicio(repos, reloj, acceso),
    seguimiento: new SeguimientoServicio(repos, reloj),
    exportacion: new ExportacionServicio(repos),
  };

  // Semilla: el administrador (solo existe en este navegador) y la comisión de demostración.
  await auth.asegurarAdminInicial(CUENTAS_DEMO.admin, PASSWORD_DEMO);
  const hoy = reloj.hoy();
  const crearComision = repos.comisiones.crear.bind(repos.comisiones);
  if (!minimoPeriodo(hoy)) {
    repos.comisiones.crear = (nueva) => crearComision({ ...nueva, fechaInicio: sumarDias(hoy, -16 * 7), fechaFin: sumarDias(hoy, 3 * 7) });
  }
  await sembrarDemo(repos, auth, hoy);
  repos.comisiones.crear = crearComision;

  return s;
}

type Servicios = Awaited<ReturnType<typeof crearServidor>>;
type Rol = 'ADMIN' | 'DOCENTE' | 'ESTUDIANTE';
interface Contexto {
  usuario: { id: number; rol: Rol };
  params: string[];
  query: Record<string, string>;
  cuerpo: unknown;
}
type Resultado = { status: number; json?: unknown; csv?: { nombreArchivo: string; contenido: string } };
type Manejador = (s: Servicios, c: Contexto) => Promise<Resultado>;
interface Ruta { metodo: string; patron: RegExp; roles: Rol[] | 'publica' | 'autenticada'; manejar: Manejador }

const ok = (json: unknown, status = 200): Resultado => ({ status, json });
const id = (valor: string, que: string) => {
  const n = Number(valor);
  if (!Number.isInteger(n) || n <= 0) throw new ErrorNegocio(404, `${que} no encontrado`);
  return n;
};

// Las mismas rutas, roles y controladores que backend/src/rutas y backend/src/controladores.
const RUTAS: Ruta[] = [
  { metodo: 'GET', patron: /^\/salud$/, roles: 'publica', manejar: async () => ok({ estado: 'ok' }) },
  { metodo: 'POST', patron: /^\/auth\/registro$/, roles: 'publica', manejar: async (s, c) => ok(await s.auth.registrarEstudiante(c.cuerpo), 201) },
  { metodo: 'POST', patron: /^\/auth\/login$/, roles: 'publica', manejar: async (s, c) => ok(await s.auth.login(c.cuerpo)) },
  { metodo: 'GET', patron: /^\/auth\/yo$/, roles: 'autenticada', manejar: async (s, c) => ok(await s.auth.yo(c.usuario.id)) },

  { metodo: 'GET', patron: /^\/docentes$/, roles: ['ADMIN'], manejar: async (s) => ok(await s.usuarios.listarDocentes()) },
  { metodo: 'POST', patron: /^\/docentes$/, roles: ['ADMIN'], manejar: async (s, c) => ok(await s.usuarios.crearDocente(c.cuerpo), 201) },

  { metodo: 'GET', patron: /^\/comisiones$/, roles: ['ADMIN', 'DOCENTE'], manejar: async (s, c) => ok(await s.comisiones.listar(c.usuario)) },
  { metodo: 'POST', patron: /^\/comisiones$/, roles: ['ADMIN'], manejar: async (s, c) => ok(await s.comisiones.crear(c.cuerpo), 201) },
  { metodo: 'GET', patron: /^\/comisiones\/([^/]+)$/, roles: ['ADMIN', 'DOCENTE'], manejar: async (s, c) => ok(await s.comisiones.obtener(c.usuario, id(c.params[0], 'Comisión'))) },
  { metodo: 'PATCH', patron: /^\/comisiones\/([^/]+)$/, roles: ['ADMIN'], manejar: async (s, c) => ok(await s.comisiones.actualizar(id(c.params[0], 'Comisión'), c.cuerpo)) },
  {
    metodo: 'GET', patron: /^\/comisiones\/([^/]+)\/estudiantes$/, roles: ['ADMIN', 'DOCENTE'],
    manejar: async (s, c) => ok(await s.seguimiento.estudiantesDeComision(await s.comisiones.obtenerVisible(c.usuario, id(c.params[0], 'Comisión')))),
  },

  {
    metodo: 'GET', patron: /^\/dias-no-laborables$/, roles: 'autenticada',
    manejar: async (s, c) => ok(await s.diasNoLaborables.listar(c.usuario, c.query.comisionId ? id(c.query.comisionId, 'Comisión') : undefined)),
  },
  { metodo: 'POST', patron: /^\/dias-no-laborables$/, roles: ['ADMIN', 'DOCENTE'], manejar: async (s, c) => ok(await s.diasNoLaborables.crear(c.usuario, c.cuerpo), 201) },
  {
    metodo: 'DELETE', patron: /^\/dias-no-laborables\/([^/]+)$/, roles: ['ADMIN', 'DOCENTE'],
    manejar: async (s, c) => { await s.diasNoLaborables.borrar(c.usuario, id(c.params[0], 'Día no laborable')); return { status: 204 }; },
  },

  { metodo: 'GET', patron: /^\/entradas$/, roles: ['ESTUDIANTE'], manejar: async (s, c) => ok(await s.entradas.listarDeEstudiante(c.usuario.id, c.query)) },
  { metodo: 'POST', patron: /^\/entradas$/, roles: ['ESTUDIANTE'], manejar: async (s, c) => ok(await s.entradas.crear(c.usuario, c.cuerpo), 201) },
  { metodo: 'GET', patron: /^\/entradas\/([^/]+)$/, roles: 'autenticada', manejar: async (s, c) => ok(await s.entradas.obtener(c.usuario, id(c.params[0], 'Entrada'))) },
  { metodo: 'PATCH', patron: /^\/entradas\/([^/]+)$/, roles: ['ESTUDIANTE'], manejar: async (s, c) => ok(await s.entradas.editar(c.usuario, id(c.params[0], 'Entrada'), c.cuerpo)) },
  {
    metodo: 'DELETE', patron: /^\/entradas\/([^/]+)$/, roles: ['ESTUDIANTE'],
    manejar: async (s, c) => { await s.entradas.borrar(c.usuario, id(c.params[0], 'Entrada'), c.query); return { status: 204 }; },
  },
  { metodo: 'POST', patron: /^\/entradas\/([^/]+)\/enviar$/, roles: ['ESTUDIANTE'], manejar: async (s, c) => ok(await s.entradas.enviar(c.usuario, id(c.params[0], 'Entrada'), c.cuerpo)) },
  { metodo: 'POST', patron: /^\/entradas\/([^/]+)\/validar$/, roles: ['DOCENTE'], manejar: async (s, c) => ok(await s.revision.validar(c.usuario, id(c.params[0], 'Entrada'), c.cuerpo)) },
  { metodo: 'POST', patron: /^\/entradas\/([^/]+)\/observar$/, roles: ['DOCENTE'], manejar: async (s, c) => ok(await s.revision.observar(c.usuario, id(c.params[0], 'Entrada'), c.cuerpo)) },

  { metodo: 'GET', patron: /^\/mi\/calendario$/, roles: ['ESTUDIANTE'], manejar: async (s, c) => ok(await s.seguimiento.calendario(c.usuario.id, c.query)) },
  { metodo: 'GET', patron: /^\/mi\/resumen$/, roles: ['ESTUDIANTE'], manejar: async (s, c) => ok(await s.seguimiento.resumen(c.usuario.id)) },
  {
    metodo: 'GET', patron: /^\/mi\/exportacion$/, roles: ['ESTUDIANTE'],
    manejar: async (s, c) => {
      const estudiante = await s.auth.usuarioPorId(c.usuario.id);
      if (!estudiante) throw new ErrorNegocio(404, 'Estudiante no encontrado');
      return { status: 200, csv: await s.exportacion.carpeta(estudiante) };
    },
  },

  {
    metodo: 'GET', patron: /^\/estudiantes\/([^/]+)\/entradas$/, roles: ['ADMIN', 'DOCENTE'],
    manejar: async (s, c) => {
      const { estudiante } = await s.acceso.estudianteVisible(c.usuario, id(c.params[0], 'Estudiante'));
      return ok(await s.entradas.listarDeEstudiante(estudiante.id, c.query));
    },
  },
  {
    metodo: 'GET', patron: /^\/estudiantes\/([^/]+)\/resumen$/, roles: ['ADMIN', 'DOCENTE'],
    manejar: async (s, c) => {
      const { estudiante, comision } = await s.acceso.estudianteVisible(c.usuario, id(c.params[0], 'Estudiante'));
      return ok(await s.seguimiento.resumenCon(estudiante, comision));
    },
  },
  {
    metodo: 'GET', patron: /^\/estudiantes\/([^/]+)\/exportacion$/, roles: ['ADMIN', 'DOCENTE'],
    manejar: async (s, c) => {
      const { estudiante } = await s.acceso.estudianteVisible(c.usuario, id(c.params[0], 'Estudiante'));
      return { status: 200, csv: await s.exportacion.carpeta(estudiante) };
    },
  },
];

let servidor: Promise<Servicios> | null = null;

function aRespuesta(r: Resultado): Response {
  if (r.csv) {
    return new Response(r.csv.contenido, {
      status: r.status,
      headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': `attachment; filename="${r.csv.nombreArchivo}"` },
    });
  }
  if (r.json === undefined) return new Response(null, { status: r.status });
  return new Response(JSON.stringify(r.json), { status: r.status, headers: { 'Content-Type': 'application/json' } });
}

/** Atiende un pedido a /api como lo haría el backend, y devuelve una Response igual a la del servidor. */
export async function atenderDemo(metodo: string, rutaConConsulta: string, cabeceras: Record<string, string>, cuerpo?: unknown): Promise<Response> {
  servidor ??= crearServidor();
  const s = await servidor;
  const [ruta, consulta = ''] = rutaConConsulta.split('?');
  try {
    let params: string[] = [];
    let encontrada: Ruta | undefined;
    for (const r of RUTAS) {
      const m = r.metodo === metodo ? r.patron.exec(ruta) : null;
      if (m) { encontrada = r; params = m.slice(1).map(decodeURIComponent); break; }
    }
    if (!encontrada) return aRespuesta({ status: 404, json: { error: 'Recurso no encontrado' } });

    let usuario = { id: 0, rol: 'ESTUDIANTE' as Rol };
    if (encontrada.roles !== 'publica') {
      // RN5: igual que el middleware autenticar del backend.
      const [tipo, token] = (cabeceras.Authorization ?? '').split(' ');
      if (tipo !== 'Bearer' || !token) throw new ErrorNegocio(401, 'Tenés que iniciar sesión');
      usuario = s.auth.verificarToken(token);
      if (Array.isArray(encontrada.roles) && !encontrada.roles.includes(usuario.rol)) throw sinPermiso();
    }
    const query = Object.fromEntries(new URLSearchParams(consulta));
    // Copia del cuerpo, como si viajara por la red.
    const datos = cuerpo === undefined ? {} : JSON.parse(JSON.stringify(cuerpo));
    return aRespuesta(await encontrada.manejar(s, { usuario, params, query, cuerpo: datos }));
  } catch (err) {
    if (err instanceof ErrorNegocio) {
      return aRespuesta({ status: err.status, json: err.detalle ? { error: err.message, detalle: err.detalle } : { error: err.message } });
    }
    const e = err as { name?: string; issues?: { message?: string }[] };
    if (e?.name === 'ZodError' && Array.isArray(e.issues)) {
      return aRespuesta({ status: 400, json: { error: e.issues[0]?.message ?? 'Datos inválidos' } });
    }
    console.error(err);
    return aRespuesta({ status: 500, json: { error: 'Ocurrió un error inesperado. Intentá de nuevo en unos minutos.' } });
  }
}

/** Inicia sesión con una cuenta de la demo (la contraseña es la pública de la semilla y solo vale en este navegador). */
export async function sesionDemo(email: string): Promise<{ token: string; usuario: unknown }> {
  servidor ??= crearServidor();
  const s = await servidor;
  return s.auth.login({ email, password: PASSWORD_DEMO });
}
