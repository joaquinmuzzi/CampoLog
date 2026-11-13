import { diasDePractica } from './dominio/calendario';
import { DatosEntrada, EstadoEntrada } from './dominio/tipos';
import { Repos } from './repositorios/tipos';
import { AuthServicio } from './servicios/authServicio';

/**
 * Datos de demostración para probar la aplicación publicada: un docente, una comisión con estudiantes y
 * entradas en todos los estados. Solo se cargan si todavía no existe el docente de demostración.
 * Contraseña de todas las cuentas de demostración: demo1234.
 */
export const PASSWORD_DEMO = 'demo1234';

const ACTIVIDADES = [
  'Relevamiento de requerimientos con el cliente',
  'Diseño del modelo de datos (DER)',
  'Configuración del repositorio y del entorno',
  'Desarrollo del ABM de usuarios',
  'Pruebas unitarias del módulo de turnos',
  'Reunión de seguimiento con el tutor',
  'Documentación de la API en el README',
  'Corrección de errores reportados en testing',
  'Maquetado de la pantalla principal',
  'Integración del frontend con la API',
];

function datos(i: number, horas: number): DatosEntrada {
  return {
    actividad: ACTIVIDADES[i % ACTIVIDADES.length],
    descripcion: 'Registro de la jornada de práctica con el detalle de lo realizado.',
    horas,
    etiquetas: i % 2 === 0 ? ['código'] : ['documentación'],
    evidencias: [
      { tipo: i % 3 === 0 ? 'DOCUMENTO' : 'COMMIT', titulo: 'Evidencia de la jornada', url: `https://github.com/campolog-demo/proyecto/commit/${(1000 + i).toString(16)}` },
    ],
  };
}

export async function sembrarDemo(repos: Repos, auth: AuthServicio, hoy: string): Promise<boolean> {
  if (await repos.usuarios.porEmail('docente@campolog.demo')) return false;
  const hash = await auth.hashear(PASSWORD_DEMO);

  const docente = await repos.usuarios.crear({ nombre: 'Laura', apellido: 'Gómez', email: 'docente@campolog.demo', passwordHash: hash, rol: 'DOCENTE', comisionId: null });
  const comision = await repos.comisiones.crear({
    nombre: '6° 2° Computación — PP 2026', diasSemana: [2, 4], fechaInicio: '2026-08-04', fechaFin: '2026-12-10',
    horasJornada: 4, codigoInscripcion: 'DEMO26', docenteId: docente.id,
  });
  const noLaborables = await repos.diasNoLaborables.paraComision(comision.id);
  const transcurridos = diasDePractica(comision, noLaborables, hoy);

  const estudiantes = [
    { nombre: 'Ana', apellido: 'Pérez', email: 'ana@campolog.demo', cumplimiento: 0.95 },
    { nombre: 'Bruno', apellido: 'Díaz', email: 'bruno@campolog.demo', cumplimiento: 0.55 },
    { nombre: 'Carla', apellido: 'Sosa', email: 'carla@campolog.demo', cumplimiento: 0.85 },
  ];

  for (const [n, e] of estudiantes.entries()) {
    const est = await repos.usuarios.crear({ nombre: e.nombre, apellido: e.apellido, email: e.email, passwordHash: hash, rol: 'ESTUDIANTE', comisionId: comision.id });
    for (const [i, fecha] of transcurridos.entries()) {
      const desdeElFinal = transcurridos.length - 1 - i;
      // Las últimas jornadas quedan pendientes o en distintos estados para mostrar todo el flujo.
      if (desdeElFinal === 0) continue; // hoy: pendiente de carga
      const sorteo = ((i * 37 + n * 11) % 100) / 100;
      if (desdeElFinal > 3 && sorteo > e.cumplimiento) continue; // días sin registro
      const entrada = await repos.entradas.crear({ estudianteId: est.id, comisionId: comision.id, fecha, datos: datos(i + n, i % 4 === 0 ? 3.5 : 4) });
      let estado: EstadoEntrada = 'VALIDADA';
      if (desdeElFinal === 1) estado = 'BORRADOR';
      else if (desdeElFinal === 2) estado = 'ENVIADA';
      else if (desdeElFinal === 3) estado = n === 0 ? 'OBSERVADA' : 'ENVIADA';
      if (estado === 'BORRADOR') continue;
      await repos.entradas.actualizarConVersion(entrada.id, 1, { estado: 'ENVIADA', enviadaEn: new Date() });
      if (estado === 'ENVIADA') continue;
      if (estado === 'OBSERVADA') {
        await repos.entradas.actualizarConVersion(entrada.id, 2, {
          estado: 'OBSERVADA', observadaEn: new Date(),
          comentario: { autorId: docente.id, tipo: 'OBSERVACION', texto: 'Agregá el link al commit de esta jornada, por favor.' },
        });
        continue;
      }
      await repos.entradas.actualizarConVersion(entrada.id, 2, {
        estado: 'VALIDADA', validadaEn: new Date(),
        comentario: i % 5 === 0 ? { autorId: docente.id, tipo: 'VALIDACION', texto: 'Muy buen registro.' } : undefined,
      });
    }
  }
  return true;
}
