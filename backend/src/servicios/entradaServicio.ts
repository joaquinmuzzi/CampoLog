import { z } from 'zod';
import { esDiaDePractica } from '../dominio/calendario';
import { validarDatosEntrada } from '../dominio/entrada';
import { NOMBRE_ESTADO, puedeBorrar, puedeEditar, puedeTransicionar } from '../dominio/estados';
import { esFechaValida, esMesValido } from '../dominio/fechas';
import { dentroDePlazoDeCarga, dentroDePlazoDeCorreccion, esFutura, PLAZO_DIAS } from '../dominio/plazos';
import { Comision, Entrada, EstadoEntrada, Usuario } from '../dominio/tipos';
import { ErrorNegocio, noEncontrado } from '../errores';
import { fechaEnArgentina, Reloj } from '../reloj';
import { EntradaDuplicada, VersionDesactualizada } from '../repositorios/errores';
import { ENTRADAS_POR_PAGINA, Repos } from '../repositorios/tipos';
import { AccesoServicio, conflictoDeVersion } from './accesoServicio';
import { DatosToken } from './authServicio';

const esquemaFechaEntrada = z.object({
  fecha: z.string({ error: 'La fecha es obligatoria' }).refine(esFechaValida, { error: 'La fecha no es válida (AAAA-MM-DD)' }),
});

export const esquemaVersion = z.object({
  version: z.coerce
    .number({ error: 'Falta la versión de la entrada que estás modificando' })
    .int({ error: 'Falta la versión de la entrada que estás modificando' })
    .positive({ error: 'Falta la versión de la entrada que estás modificando' }),
});

export const esquemaFiltroListado = z.object({
  mes: z.string().refine(esMesValido, { error: 'El mes tiene que tener el formato AAAA-MM' }).optional(),
  estado: z.enum(['BORRADOR', 'ENVIADA', 'OBSERVADA', 'VALIDADA'], { error: 'El estado no es válido' }).optional(),
  pagina: z.coerce.number().int().min(1, { error: 'La página tiene que ser 1 o más' }).optional().default(1),
});

export interface PaginaDeEntradas {
  items: Entrada[];
  total: number;
  pagina: number;
  paginas: number;
}

export class EntradaServicio {
  constructor(
    protected readonly repos: Repos,
    protected readonly reloj: Reloj,
    protected readonly acceso: AccesoServicio,
  ) {}

  /** HU8 — Registrar una jornada. */
  async crear(usuario: DatosToken, cuerpo: unknown): Promise<Entrada> {
    const { estudiante, comision } = await this.estudianteYComision(usuario.id);
    const { fecha } = esquemaFechaEntrada.parse(cuerpo);
    const hoy = this.reloj.hoy();

    if (esFutura(fecha, hoy)) throw new ErrorNegocio(400, 'No se pueden registrar jornadas futuras'); // RN13
    const noLaborables = await this.repos.diasNoLaborables.paraComision(comision.id);
    if (!esDiaDePractica(comision, fecha, noLaborables)) {
      throw new ErrorNegocio(400, 'Esa fecha no es un día de práctica de tu comisión'); // RN12
    }
    if (!dentroDePlazoDeCarga(fecha, hoy)) {
      throw new ErrorNegocio(400, `Venció el plazo de carga: cada jornada se carga hasta ${PLAZO_DIAS} días después`); // RN14
    }
    const datos = validarDatosEntrada(cuerpo, comision.horasJornada); // RN16, RN17, RN18

    try {
      return await this.repos.entradas.crear({ estudianteId: estudiante.id, comisionId: comision.id, fecha, datos });
    } catch (error) {
      if (error instanceof EntradaDuplicada) {
        // RN15: ya existe (por ejemplo, un doble clic): se informa cuál es para poder abrirla.
        const existente = (await this.repos.entradas.todasDeEstudiante(estudiante.id)).find((e) => e.fecha === fecha);
        throw new ErrorNegocio(409, 'Ya tenés una entrada para ese día', existente ? { id: existente.id } : undefined);
      }
      throw error;
    }
  }

  /** HU14 — RN29: listado paginado de las entradas de un estudiante. */
  async listarDeEstudiante(estudianteId: number, consulta: unknown): Promise<PaginaDeEntradas> {
    const filtro = esquemaFiltroListado.parse(consulta);
    const { items, total } = await this.repos.entradas.listar({ estudianteId, ...filtro });
    return { items, total, pagina: filtro.pagina, paginas: Math.max(1, Math.ceil(total / ENTRADAS_POR_PAGINA)) };
  }

  async obtener(usuario: DatosToken, id: number): Promise<Entrada> {
    return this.acceso.entradaVisible(usuario, id); // RN24
  }

  /** HU9 — Editar una entrada propia en BORRADOR u OBSERVADA. */
  async editar(usuario: DatosToken, id: number, cuerpo: unknown): Promise<Entrada> {
    const entrada = await this.acceso.entradaPropia(usuario, id);
    const { version } = esquemaVersion.parse(cuerpo);
    if (version !== entrada.version) throw conflictoDeVersion(entrada); // RN23
    if (!puedeEditar(entrada.estado)) {
      throw new ErrorNegocio(400, 'Solo se pueden editar entradas en borrador u observadas'); // RN20
    }
    const fechaPedida = (cuerpo as { fecha?: unknown })?.fecha;
    if (fechaPedida !== undefined && fechaPedida !== entrada.fecha) {
      throw new ErrorNegocio(400, 'La fecha de una entrada no se puede cambiar'); // RN20
    }
    const comision = await this.comisionDe(entrada);
    const datos = validarDatosEntrada(cuerpo, comision.horasJornada);
    return this.guardar(entrada, version, { datos });
  }

  /** HU9 — Borrar una entrada propia en BORRADOR. */
  async borrar(usuario: DatosToken, id: number, consulta: unknown): Promise<void> {
    const entrada = await this.acceso.entradaPropia(usuario, id);
    const { version } = esquemaVersion.parse(consulta);
    if (version !== entrada.version) throw conflictoDeVersion(entrada); // RN23
    if (!puedeBorrar(entrada.estado)) throw new ErrorNegocio(400, 'Solo se pueden borrar entradas en borrador'); // RN20
    try {
      await this.repos.entradas.borrarConVersion(id, version);
    } catch (error) {
      if (error instanceof VersionDesactualizada) throw conflictoDeVersion((await this.repos.entradas.porId(id)) ?? entrada);
      throw error;
    }
  }

  /** HU10 — Enviar a revisión (RN19, RN21). */
  async enviar(usuario: DatosToken, id: number, cuerpo: unknown): Promise<Entrada> {
    const entrada = await this.acceso.entradaPropia(usuario, id);
    const { version } = esquemaVersion.parse(cuerpo);
    if (version !== entrada.version) throw conflictoDeVersion(entrada); // RN23
    if (!puedeTransicionar(entrada.estado, 'ENVIADA')) {
      throw new ErrorNegocio(400, `No se puede enviar una entrada ${NOMBRE_ESTADO[entrada.estado]}`); // RN19
    }
    if (entrada.evidencias.length === 0) {
      throw new ErrorNegocio(400, 'Para enviar la entrada necesitás cargar al menos una evidencia'); // RN21
    }
    const hoy = this.reloj.hoy();
    if (entrada.estado === 'BORRADOR' && !dentroDePlazoDeCarga(entrada.fecha, hoy)) {
      throw new ErrorNegocio(400, `Venció el plazo para enviar esta jornada (${PLAZO_DIAS} días desde su fecha)`); // RN21
    }
    if (entrada.estado === 'OBSERVADA' && entrada.observadaEn
      && !dentroDePlazoDeCorreccion(fechaEnArgentina(entrada.observadaEn), hoy)) {
      throw new ErrorNegocio(400, `Venció el plazo de corrección (${PLAZO_DIAS} días desde la observación)`); // RN21
    }
    return this.guardar(entrada, version, { estado: 'ENVIADA', enviadaEn: this.reloj.ahora() });
  }

  /** Guarda cambios con control de versión; si alguien la modificó en el medio, responde conflicto (RN23). */
  protected async guardar(
    entrada: Entrada, version: number, cambios: Parameters<Repos['entradas']['actualizarConVersion']>[2],
  ): Promise<Entrada> {
    try {
      return await this.repos.entradas.actualizarConVersion(entrada.id, version, cambios);
    } catch (error) {
      if (error instanceof VersionDesactualizada) {
        throw conflictoDeVersion((await this.repos.entradas.porId(entrada.id)) ?? entrada);
      }
      throw error;
    }
  }

  protected async comisionDe(entrada: Entrada): Promise<Comision> {
    const comision = await this.repos.comisiones.porId(entrada.comisionId);
    if (!comision) throw noEncontrado('Comisión');
    return comision;
  }

  protected async estudianteYComision(estudianteId: number): Promise<{ estudiante: Usuario; comision: Comision }> {
    const estudiante = await this.repos.usuarios.porId(estudianteId);
    if (!estudiante?.comisionId) throw noEncontrado('Estudiante');
    const comision = await this.repos.comisiones.porId(estudiante.comisionId);
    if (!comision) throw noEncontrado('Comisión');
    return { estudiante, comision };
  }
}

export type { EstadoEntrada };
