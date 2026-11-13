import { z } from 'zod';
import { puedeTransicionar } from '../dominio/estados';
import { Entrada } from '../dominio/tipos';
import { ErrorNegocio } from '../errores';
import { Reloj } from '../reloj';
import { VersionDesactualizada } from '../repositorios/errores';
import { CambiosEntrada, Repos } from '../repositorios/tipos';
import { AccesoServicio, conflictoDeVersion } from './accesoServicio';
import { DatosToken } from './authServicio';
import { esquemaVersion } from './entradaServicio';

const esquemaValidar = esquemaVersion.extend({
  comentario: z
    .string()
    .trim()
    .max(500, { error: 'El comentario puede tener hasta 500 caracteres' })
    .optional()
    .transform((c) => (c ? c : undefined)),
});

const esquemaObservar = esquemaVersion.extend({
  comentario: z
    .string({ error: 'Para observar una entrada tenés que escribir un comentario de 10 a 500 caracteres' })
    .trim()
    .min(10, { error: 'Para observar una entrada tenés que escribir un comentario de 10 a 500 caracteres' })
    .max(500, { error: 'El comentario puede tener hasta 500 caracteres' }),
});

/** HU11 — Revisión docente de entradas enviadas (RN22). */
export class RevisionServicio {
  constructor(
    private readonly repos: Repos,
    private readonly reloj: Reloj,
    private readonly acceso: AccesoServicio,
  ) {}

  async validar(usuario: DatosToken, id: number, cuerpo: unknown): Promise<Entrada> {
    const entrada = await this.entradaParaRevisar(usuario, id);
    const { version, comentario } = esquemaValidar.parse(cuerpo);
    this.verificarRevisable(entrada, version, 'VALIDADA');
    return this.guardar(entrada, version, {
      estado: 'VALIDADA',
      validadaEn: this.reloj.ahora(),
      comentario: comentario ? { autorId: usuario.id, tipo: 'VALIDACION', texto: comentario } : undefined,
    });
  }

  async observar(usuario: DatosToken, id: number, cuerpo: unknown): Promise<Entrada> {
    const entrada = await this.entradaParaRevisar(usuario, id);
    const { version, comentario } = esquemaObservar.parse(cuerpo);
    this.verificarRevisable(entrada, version, 'OBSERVADA');
    return this.guardar(entrada, version, {
      estado: 'OBSERVADA',
      observadaEn: this.reloj.ahora(),
      comentario: { autorId: usuario.id, tipo: 'OBSERVACION', texto: comentario },
    });
  }

  /** RN22 y RN24: solo el docente a cargo de la comisión; lo ajeno responde 404. */
  private async entradaParaRevisar(usuario: DatosToken, id: number): Promise<Entrada> {
    return this.acceso.entradaVisible(usuario, id);
  }

  private verificarRevisable(entrada: Entrada, version: number, destino: 'VALIDADA' | 'OBSERVADA') {
    if (version !== entrada.version) throw conflictoDeVersion(entrada); // RN23
    if (!puedeTransicionar(entrada.estado, destino)) {
      throw new ErrorNegocio(400, 'Solo se pueden revisar entradas enviadas'); // RN19, RN22
    }
  }

  private async guardar(entrada: Entrada, version: number, cambios: CambiosEntrada): Promise<Entrada> {
    try {
      return await this.repos.entradas.actualizarConVersion(entrada.id, version, cambios);
    } catch (error) {
      if (error instanceof VersionDesactualizada) {
        throw conflictoDeVersion((await this.repos.entradas.porId(entrada.id)) ?? entrada);
      }
      throw error;
    }
  }
}
