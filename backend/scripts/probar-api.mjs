// Prueba de punta a punta de la API de CampoLog (registro de las pruebas del informe).
// Recorre el flujo completo con los datos de demostración y verifica las reglas de negocio con pedidos reales.
//
// Uso:   node scripts/probar-api.mjs https://url-del-backend [https://url-del-frontend]
// - Con CAMPOLOG_ADMIN_EMAIL y CAMPOLOG_ADMIN_PASSWORD en el entorno, el script crea su propio docente y su
//   propia comisión (y prueba también las reglas del administrador).
// - Sin esas variables usa la comisión de demostración (SEMBRAR_DEMO=true): código DEMO26 y docente
//   docente@campolog.demo.
// Crea estudiantes de prueba nuevos en cada corrida (emails con la hora, para no repetirse).

const BASE = (process.argv[2] ?? 'http://localhost:3000').replace(/\/+$/, '');
const FRONT = process.argv[3]?.replace(/\/+$/, '');
const CLAVE_DEMO = 'demo1234';
const ADMIN = process.env.CAMPOLOG_ADMIN_EMAIL && process.env.CAMPOLOG_ADMIN_PASSWORD
  ? { email: process.env.CAMPOLOG_ADMIN_EMAIL, password: process.env.CAMPOLOG_ADMIN_PASSWORD }
  : null;
const sello = Date.now().toString(36);
let CODIGO = 'DEMO26';
let DOCENTE = { email: 'docente@campolog.demo', password: CLAVE_DEMO };
let ok = 0;
let mal = 0;

async function pedir(metodo, ruta, { token, cuerpo, origen } = {}) {
  const cabeceras = {};
  if (token) cabeceras.Authorization = `Bearer ${token}`;
  if (cuerpo !== undefined) cabeceras['Content-Type'] = 'application/json';
  if (origen) cabeceras.Origin = origen;
  const res = await fetch(`${BASE}/api${ruta}`, { method: metodo, headers: cabeceras, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
  const tipo = res.headers.get('content-type') ?? '';
  const datos = tipo.includes('json') ? await res.json() : await res.text();
  return { status: res.status, datos, headers: res.headers };
}

function verificar(regla, descripcion, obtenido, esperado, extra = '') {
  const paso = obtenido === esperado;
  paso ? ok++ : mal++;
  console.log(`${paso ? '✓' : '✗'} [${regla}] ${descripcion} → ${obtenido}${paso ? '' : ` (se esperaba ${esperado})`}${extra ? ` · ${extra}` : ''}`);
}

const hoyAr = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Argentina/Buenos_Aires' });
function sumarDias(fecha, dias) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dias);
  return d.toISOString().slice(0, 10);
}
const diaSemana = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay(); // 0 = domingo

async function registrar(nombre) {
  const email = `${nombre.toLowerCase()}.${sello}@prueba.campolog`;
  const r = await pedir('POST', '/auth/registro', { cuerpo: { nombre, apellido: 'Prueba', email, password: 'prueba1234', codigoInscripcion: CODIGO } });
  return { ...r, email };
}

async function main() {
  console.log(`Prueba de la API de CampoLog — ${BASE} — ${new Date().toISOString()}\n`);

  // Salud y errores generales
  verificar('—', 'GET /salud', (await pedir('GET', '/salud')).status, 200);
  verificar('—', 'Ruta inexistente', (await pedir('GET', '/no-existe')).status, 404);
  verificar('RN5', 'Pedido protegido sin token', (await pedir('GET', '/mi/resumen')).status, 401);

  // CORS (si se indicó el frontend)
  if (FRONT) {
    const permitido = await pedir('GET', '/salud', { origen: FRONT });
    verificar('CORS', 'Origen del frontend publicado recibe permiso', permitido.headers.get('access-control-allow-origin'), FRONT);
    const ajeno = await pedir('GET', '/salud', { origen: 'https://sitio-ajeno.com' });
    verificar('CORS', 'Origen ajeno no recibe permiso', ajeno.headers.get('access-control-allow-origin'), null);
  }

  // Administración (RN1, RN4, RN7, RN9): docente y comisión propios de esta corrida
  if (ADMIN) {
    const admin = await pedir('POST', '/auth/login', { cuerpo: ADMIN });
    verificar('RN1', 'Login del administrador inicial', admin.status, 200);
    const tAdmin = admin.datos.token;
    DOCENTE = { email: `docente.${sello}@prueba.campolog`, password: 'prueba1234' };
    const doc = await pedir('POST', '/docentes', { token: tAdmin, cuerpo: { nombre: 'Docente', apellido: 'Prueba', ...DOCENTE } });
    verificar('RN4', 'El administrador crea un docente', doc.status, 201);
    const hoy = hoyAr();
    const COMISION = { nombre: `Comisión de prueba ${sello}`, diasSemana: [1, 2, 3, 4, 5], fechaInicio: sumarDias(hoy, -30), fechaFin: sumarDias(hoy, 60), horasJornada: 4, docenteId: doc.datos.id };
    const larga = await pedir('POST', '/comisiones', { token: tAdmin, cuerpo: { ...COMISION, fechaFin: sumarDias(hoy, 300) } });
    verificar('RN7', 'Comisión de más de 270 días', larga.status, 400, larga.datos.error);
    const comision = await pedir('POST', '/comisiones', { token: tAdmin, cuerpo: COMISION });
    verificar('RN7', 'El administrador crea una comisión de lunes a viernes', comision.status, 201, `código ${comision.datos.codigoInscripcion}`);
    CODIGO = comision.datos.codigoInscripcion;
    const cambio = await pedir('PATCH', `/comisiones/${comision.datos.id}`, { token: tAdmin, cuerpo: { horasJornada: 5 } });
    verificar('RN11', 'Cambiar las horas de una comisión que ya empezó', cambio.status, 400, cambio.datos.error);
    const tDoc = (await pedir('POST', '/auth/login', { cuerpo: DOCENTE })).datos.token;
    const feriado = await pedir('POST', '/dias-no-laborables', { token: tDoc, cuerpo: { fecha: sumarDias(hoy, 3), motivo: 'Feriado de prueba', tipo: 'FERIADO' } });
    verificar('RN9', 'Un docente intenta cargar un feriado', feriado.status, 403);
    const pasado = await pedir('POST', '/dias-no-laborables', { token: tDoc, cuerpo: { fecha: sumarDias(hoy, -1), motivo: 'Receso pasado', tipo: 'RECESO', comisionId: comision.datos.id } });
    verificar('RN10', 'Un docente carga un receso con fecha pasada', pasado.status, 400);
  }

  // Registro con código (RN2, RN3)
  const malCodigo = await pedir('POST', '/auth/registro', { cuerpo: { nombre: 'Sin', apellido: 'Codigo', email: `sin.${sello}@prueba.campolog`, password: 'prueba1234', codigoInscripcion: 'ZZZZZZ' } });
  verificar('RN3', 'Registro con código inexistente', malCodigo.status, 400, malCodigo.datos.error);
  const debil = await pedir('POST', '/auth/registro', { cuerpo: { nombre: 'Clave', apellido: 'Debil', email: `debil.${sello}@prueba.campolog`, password: 'abcdefgh', codigoInscripcion: CODIGO } });
  verificar('RN2', 'Registro con contraseña sin números', debil.status, 400, debil.datos.error);
  const lucia = await registrar('Lucia');
  verificar('RN3', `Registro con el código ${CODIGO}`, lucia.status, 201);
  const repetido = await pedir('POST', '/auth/registro', { cuerpo: { nombre: 'Lucia', apellido: 'Prueba', email: lucia.email, password: 'prueba1234', codigoInscripcion: CODIGO } });
  verificar('RN2', 'Registro con un email ya usado', repetido.status, 409);
  const tLucia = lucia.datos.token;

  // Login y bloqueo (RN5, RN6)
  const tomas = await registrar('Tomas');
  for (let i = 1; i <= 5; i++) {
    const r = await pedir('POST', '/auth/login', { cuerpo: { email: tomas.email, password: 'equivocada1' } });
    if (i === 5) verificar('RN6', 'Quinto intento fallido de login', r.status, 401);
  }
  const bloqueado = await pedir('POST', '/auth/login', { cuerpo: { email: tomas.email, password: 'prueba1234' } });
  verificar('RN6', 'Login correcto con la cuenta bloqueada (15 min)', bloqueado.status, 423, bloqueado.datos.error);
  const docente = await pedir('POST', '/auth/login', { cuerpo: DOCENTE });
  verificar('RN5', 'Login del docente a cargo', docente.status, 200);
  const tDocente = docente.datos.token;

  // Permisos por rol (RN24)
  verificar('RN24', 'Estudiante pide la lista de comisiones', (await pedir('GET', '/comisiones', { token: tLucia })).status, 403);
  verificar('RN4', 'Docente intenta crear un docente', (await pedir('POST', '/docentes', { token: tDocente, cuerpo: {} })).status, 403);

  // Resumen y pendientes (RN25)
  const resumen = await pedir('GET', '/mi/resumen', { token: tLucia });
  verificar('RN25', 'Resumen del estudiante', resumen.status, 200, `${resumen.datos.pendientes?.length ?? 0} días pendientes de carga`);
  const pendientes = resumen.datos.pendientes ?? [];
  if (pendientes.length === 0) {
    console.log('\n(No hay días pendientes hoy en la comisión de demostración: se omiten las pruebas de carga.)');
    return;
  }
  const fecha = pendientes[pendientes.length - 1].fecha;

  // Crear entrada (RN12–RN18)
  const hoy = hoyAr();
  const ENTRADA = { actividad: 'Prueba de la API publicada', descripcion: 'Entrada creada por el script de pruebas.', horas: 4, etiquetas: ['pruebas'], evidencias: [] };
  verificar('RN13', 'Crear una entrada con fecha futura', (await pedir('POST', '/entradas', { token: tLucia, cuerpo: { ...ENTRADA, fecha: sumarDias(hoy, 7) } })).status, 400);
  let sabado = hoy;
  while (diaSemana(sabado) !== 6) sabado = sumarDias(sabado, -1);
  verificar('RN12', 'Crear una entrada un sábado (no es día de práctica)', (await pedir('POST', '/entradas', { token: tLucia, cuerpo: { ...ENTRADA, fecha: sabado } })).status, 400);
  verificar('RN16', 'Horas que no son múltiplo de media hora', (await pedir('POST', '/entradas', { token: tLucia, cuerpo: { ...ENTRADA, fecha, horas: 1.3 } })).status, 400);
  verificar('RN17', 'Actividad de menos de 5 caracteres', (await pedir('POST', '/entradas', { token: tLucia, cuerpo: { ...ENTRADA, fecha, actividad: 'abc' } })).status, 400);
  verificar('RN18', 'Evidencia que no es un link http(s)', (await pedir('POST', '/entradas', { token: tLucia, cuerpo: { ...ENTRADA, fecha, evidencias: [{ tipo: 'COMMIT', titulo: 'Commit', url: 'ftp://x' }] } })).status, 400);
  const creada = await pedir('POST', '/entradas', { token: tLucia, cuerpo: { ...ENTRADA, fecha } });
  verificar('RN14', `Crear la entrada del ${fecha} (pendiente)`, creada.status, 201, `estado ${creada.datos.estado}, versión ${creada.datos.version}`);
  const id = creada.datos.id;

  // Una entrada por día, también con pedidos simultáneos (RN15)
  const duplicada = await pedir('POST', '/entradas', { token: tLucia, cuerpo: { ...ENTRADA, fecha } });
  verificar('RN15', 'Segunda entrada para el mismo día', duplicada.status, 409, `detalle.id = ${duplicada.datos.detalle?.id}`);
  const tomasLogin = await registrar('Bea');
  const pendientesBea = (await pedir('GET', '/mi/resumen', { token: tomasLogin.datos.token })).datos.pendientes;
  const fechaBea = pendientesBea[pendientesBea.length - 1].fecha;
  const simultaneas = await Promise.all(Array.from({ length: 5 }, () => pedir('POST', '/entradas', { token: tomasLogin.datos.token, cuerpo: { ...ENTRADA, fecha: fechaBea } })));
  const creadas = simultaneas.filter((r) => r.status === 201).length;
  verificar('RN15', '5 pedidos simultáneos para el mismo día crean una sola entrada', creadas, 1, `${simultaneas.filter((r) => r.status === 409).length} respondieron 409`);
  verificar('RN24', 'Otro estudiante abre esa entrada', (await pedir('GET', `/entradas/${id}`, { token: tomasLogin.datos.token })).status, 404);

  // Enviar (RN19, RN21)
  const sinEvidencia = await pedir('POST', `/entradas/${id}/enviar`, { token: tLucia, cuerpo: { version: 1 } });
  verificar('RN21', 'Enviar sin evidencias', sinEvidencia.status, 400, sinEvidencia.datos.error);
  const conEvidencia = await pedir('PATCH', `/entradas/${id}`, { token: tLucia, cuerpo: { ...ENTRADA, evidencias: [{ tipo: 'COMMIT', titulo: 'Commit de la jornada', url: 'https://github.com/joaquinmuzzi/CampoLog' }], version: 1 } });
  verificar('RN20', 'Editar el borrador agregando una evidencia', conEvidencia.status, 200, `versión ${conEvidencia.datos.version}`);
  const vieja = await pedir('PATCH', `/entradas/${id}`, { token: tLucia, cuerpo: { ...ENTRADA, version: 1 } });
  verificar('RN23', 'Editar con una versión vieja', vieja.status, 409, `detalle ${JSON.stringify(vieja.datos.detalle)}`);
  const enviada = await pedir('POST', `/entradas/${id}/enviar`, { token: tLucia, cuerpo: { version: conEvidencia.datos.version } });
  verificar('RN19', 'Enviar a revisión', enviada.status, 200, `estado ${enviada.datos.estado}`);
  verificar('RN20', 'Editar una entrada enviada', (await pedir('PATCH', `/entradas/${id}`, { token: tLucia, cuerpo: { ...ENTRADA, version: enviada.datos.version } })).status, 400);

  // Revisión docente (RN22) y corrección
  verificar('RN22', 'Observar sin comentario', (await pedir('POST', `/entradas/${id}/observar`, { token: tDocente, cuerpo: { version: enviada.datos.version } })).status, 400);
  const observada = await pedir('POST', `/entradas/${id}/observar`, { token: tDocente, cuerpo: { version: enviada.datos.version, comentario: 'Agregá qué parte de la API probaste.' } });
  verificar('RN22', 'Observar con comentario', observada.status, 200, `estado ${observada.datos.estado}`);
  const corregida = await pedir('PATCH', `/entradas/${id}`, { token: tLucia, cuerpo: { ...conEvidencia.datos, descripcion: 'Probé registro, carga, envío y revisión.', version: observada.datos.version } });
  verificar('RN20', 'Corregir la entrada observada', corregida.status, 200);
  const reenviada = await pedir('POST', `/entradas/${id}/enviar`, { token: tLucia, cuerpo: { version: corregida.datos.version } });
  verificar('RN19', 'Reenviar la corrección', reenviada.status, 200, `estado ${reenviada.datos.estado}`);
  const [v1, v2] = await Promise.all([
    pedir('POST', `/entradas/${id}/validar`, { token: tDocente, cuerpo: { version: reenviada.datos.version } }),
    pedir('POST', `/entradas/${id}/validar`, { token: tDocente, cuerpo: { version: reenviada.datos.version } }),
  ]);
  verificar('RN23', 'Dos validaciones simultáneas: una gana y la otra recibe 409', [v1.status, v2.status].sort().join(' y '), '200 y 409');

  // Seguimiento y exportación (RN26–RN29)
  const despues = await pedir('GET', '/mi/resumen', { token: tLucia });
  verificar('RN27', 'Las horas validadas suman la jornada', despues.datos.horasValidadas, 4, `asistencia ${despues.datos.asistencia} %`);
  const csv = await pedir('GET', '/mi/exportacion', { token: tLucia });
  verificar('RN28', 'Exportar la carpeta en CSV', csv.status, 200, `${csv.headers.get('content-type')} · ${String(csv.datos).split('\n').length - 1} filas`);
  const pagina = await pedir('GET', '/estudiantes/' + lucia.datos.usuario.id + '/entradas?pagina=1', { token: tDocente });
  verificar('RN29', 'La docente lista la carpeta de la estudiante', pagina.status, 200, `${pagina.datos.total} entrada(s)`);
  const estudiantes = await pedir('GET', '/comisiones/' + lucia.datos.usuario.comisionId + '/estudiantes', { token: tDocente });
  verificar('RN26', 'Estudiantes de la comisión, primero los que están en riesgo', estudiantes.status, 200, `${estudiantes.datos.filter((e) => e.enRiesgo).length} en riesgo`);
}

main()
  .catch((error) => { mal++; console.error(`✗ Error inesperado: ${error.message}`); })
  .finally(() => {
    console.log(`\nResultado: ${ok} pruebas correctas, ${mal} con error.`);
    process.exitCode = mal > 0 ? 1 : 0;
  });
