import { Entrada } from '../../dominio/tipos';
import { EntradaDuplicada, VersionDesactualizada } from '../errores';
import {
  CambiosEntrada, ENTRADAS_POR_PAGINA, FiltroEntradas, NuevaEntrada, RepoEntradas, RepoUsuarios,
} from '../tipos';

export class RepoEntradasMemoria implements RepoEntradas {
  private filas: Entrada[] = [];
  private siguienteId = 1;
  private siguienteComentario = 1;

  constructor(private readonly usuarios: RepoUsuarios) {}

  async crear(n: NuevaEntrada): Promise<Entrada> {
    // RN15: una por estudiante y fecha (en memoria la comprobación y el alta ocurren sin interrupción).
    if (this.filas.some((e) => e.estudianteId === n.estudianteId && e.fecha === n.fecha)) throw new EntradaDuplicada();
    const ahora = new Date();
    const entrada: Entrada = {
      id: this.siguienteId++, estudianteId: n.estudianteId, comisionId: n.comisionId, fecha: n.fecha,
      ...structuredClone(n.datos), estado: 'BORRADOR', version: 1, comentarios: [],
      enviadaEn: null, observadaEn: null, validadaEn: null, creadoEn: ahora, actualizadoEn: ahora,
    };
    this.filas.push(entrada);
    return structuredClone(entrada);
  }

  async porId(id: number) {
    const e = this.filas.find((x) => x.id === id);
    return e ? structuredClone(e) : null;
  }

  async listar(f: FiltroEntradas) {
    const filtradas = this.filas
      .filter((e) => e.estudianteId === f.estudianteId)
      .filter((e) => !f.mes || e.fecha.startsWith(`${f.mes}-`))
      .filter((e) => !f.estado || e.estado === f.estado)
      .sort((a, b) => b.fecha.localeCompare(a.fecha));
    const desde = (f.pagina - 1) * ENTRADAS_POR_PAGINA;
    return { items: filtradas.slice(desde, desde + ENTRADAS_POR_PAGINA).map((e) => structuredClone(e)), total: filtradas.length };
  }

  async todasDeEstudiante(estudianteId: number) {
    return this.filas
      .filter((e) => e.estudianteId === estudianteId)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((e) => structuredClone(e));
  }

  async actualizarConVersion(id: number, versionLeida: number, c: CambiosEntrada) {
    const e = this.filas.find((x) => x.id === id);
    if (!e || e.version !== versionLeida) throw new VersionDesactualizada(); // RN23
    if (c.datos) Object.assign(e, structuredClone(c.datos));
    if (c.estado) e.estado = c.estado;
    if (c.enviadaEn) e.enviadaEn = c.enviadaEn;
    if (c.observadaEn) e.observadaEn = c.observadaEn;
    if (c.validadaEn) e.validadaEn = c.validadaEn;
    if (c.comentario) {
      const autor = await this.usuarios.porId(c.comentario.autorId);
      e.comentarios.push({
        id: this.siguienteComentario++, autorId: c.comentario.autorId,
        autorNombre: autor ? `${autor.nombre} ${autor.apellido}` : '', tipo: c.comentario.tipo,
        texto: c.comentario.texto, creadoEn: new Date(),
      });
    }
    e.version += 1;
    e.actualizadoEn = new Date();
    return structuredClone(e);
  }

  async borrarConVersion(id: number, versionLeida: number) {
    const e = this.filas.find((x) => x.id === id);
    if (!e || e.version !== versionLeida) throw new VersionDesactualizada(); // RN23
    this.filas = this.filas.filter((x) => x.id !== id);
  }
}
