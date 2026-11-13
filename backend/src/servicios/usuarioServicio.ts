import { aPublico, UsuarioPublico } from '../dominio/tipos';
import { esquemaPersona } from '../dominio/validaciones';
import { ErrorNegocio } from '../errores';
import { EmailDuplicado } from '../repositorios/errores';
import { Repos } from '../repositorios/tipos';
import { AuthServicio } from './authServicio';

export const emailYaRegistrado = () => new ErrorNegocio(409, 'Ya existe una cuenta con ese email');

export class UsuarioServicio {
  constructor(private readonly repos: Repos, private readonly auth: AuthServicio) {}

  /** RN4: solo el administrador crea docentes (el rol se controla en la ruta). */
  async crearDocente(cuerpo: unknown): Promise<UsuarioPublico> {
    const datos = esquemaPersona.parse(cuerpo);
    try {
      const docente = await this.repos.usuarios.crear({
        nombre: datos.nombre, apellido: datos.apellido, email: datos.email,
        passwordHash: await this.auth.hashear(datos.password), rol: 'DOCENTE', comisionId: null,
      });
      return aPublico(docente);
    } catch (error) {
      if (error instanceof EmailDuplicado) throw emailYaRegistrado();
      throw error;
    }
  }

  async listarDocentes(): Promise<UsuarioPublico[]> {
    return (await this.repos.usuarios.listarPorRol('DOCENTE')).map(aPublico);
  }
}
