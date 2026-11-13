import {
  CambiosComision, Comision, NuevaComision, NuevoUsuario, Rol, Usuario,
} from '../../dominio/tipos';
import { CodigoDuplicado, EmailDuplicado } from '../errores';
import { RepoComisiones, RepoUsuarios } from '../tipos';

const copia = <T>(valor: T): T => structuredClone(valor);

export class RepoUsuariosMemoria implements RepoUsuarios {
  private filas: Usuario[] = [];
  private siguienteId = 1;

  async crear(nuevo: NuevoUsuario): Promise<Usuario> {
    const email = nuevo.email.toLowerCase();
    if (this.filas.some((u) => u.email === email)) throw new EmailDuplicado();
    const usuario: Usuario = {
      ...nuevo, email, id: this.siguienteId++, intentosFallidos: 0, bloqueadoHasta: null, creadoEn: new Date(),
    };
    this.filas.push(usuario);
    return copia(usuario);
  }

  async porId(id: number) {
    const u = this.filas.find((x) => x.id === id);
    return u ? copia(u) : null;
  }

  async porEmail(email: string) {
    const u = this.filas.find((x) => x.email === email.toLowerCase());
    return u ? copia(u) : null;
  }

  async listarPorRol(rol: Rol) {
    return this.filas.filter((u) => u.rol === rol).sort(porApellido).map(copia);
  }

  async listarEstudiantesDeComision(comisionId: number) {
    return this.filas.filter((u) => u.rol === 'ESTUDIANTE' && u.comisionId === comisionId).sort(porApellido).map(copia);
  }

  async contarPorRol(rol: Rol) {
    return this.filas.filter((u) => u.rol === rol).length;
  }

  async actualizarSeguridad(id: number, intentosFallidos: number, bloqueadoHasta: Date | null) {
    const u = this.filas.find((x) => x.id === id);
    if (u) { u.intentosFallidos = intentosFallidos; u.bloqueadoHasta = bloqueadoHasta; }
  }
}

function porApellido(a: Usuario, b: Usuario) {
  return a.apellido.localeCompare(b.apellido) || a.nombre.localeCompare(b.nombre) || a.id - b.id;
}

export class RepoComisionesMemoria implements RepoComisiones {
  private filas: Comision[] = [];
  private siguienteId = 1;

  async crear(nueva: NuevaComision): Promise<Comision> {
    if (this.filas.some((c) => c.codigoInscripcion === nueva.codigoInscripcion)) throw new CodigoDuplicado();
    const comision: Comision = { ...copia(nueva), id: this.siguienteId++, creadoEn: new Date() };
    this.filas.push(comision);
    return copia(comision);
  }

  async porId(id: number) {
    const c = this.filas.find((x) => x.id === id);
    return c ? copia(c) : null;
  }

  async porCodigo(codigo: string) {
    const c = this.filas.find((x) => x.codigoInscripcion === codigo);
    return c ? copia(c) : null;
  }

  async listar() {
    return [...this.filas].sort((a, b) => a.nombre.localeCompare(b.nombre)).map(copia);
  }

  async listarPorDocente(docenteId: number) {
    return (await this.listar()).filter((c) => c.docenteId === docenteId);
  }

  async actualizar(id: number, cambios: CambiosComision) {
    const c = this.filas.find((x) => x.id === id);
    if (!c) throw new Error(`Comisión ${id} inexistente`);
    Object.assign(c, copia(cambios));
    return copia(c);
  }
}
