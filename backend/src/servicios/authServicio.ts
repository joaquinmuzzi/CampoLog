import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { Config } from '../config';
import { estaBloqueado, trasIntentoCorrecto, trasIntentoFallido } from '../dominio/bloqueo';
import { aPublico, Comision, Rol, Usuario, UsuarioPublico } from '../dominio/tipos';
import { esquemaEmail, esquemaLogin, esquemaPassword } from '../dominio/validaciones';
import { ErrorNegocio } from '../errores';
import { Reloj } from '../reloj';
import { Repos } from '../repositorios/tipos';

export const DURACION_SESION_HORAS = 8; // RN5

export interface Sesion {
  token: string;
  usuario: UsuarioPublico;
}

export interface DatosToken {
  id: number;
  rol: Rol;
}

const credencialesIncorrectas = () => new ErrorNegocio(401, 'Email o contraseña incorrectos');

export class AuthServicio {
  constructor(
    private readonly repos: Repos,
    private readonly reloj: Reloj,
    private readonly config: Config,
  ) {}

  hashear(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcryptRondas); // RN2: nunca en texto plano
  }

  /** RN5: token que vence a las 8 horas. */
  emitirToken(usuario: Pick<Usuario, 'id' | 'rol'>): string {
    const iat = Math.floor(this.reloj.ahora().getTime() / 1000);
    return jwt.sign({ sub: String(usuario.id), rol: usuario.rol, iat }, this.config.jwtSecreto, {
      expiresIn: `${DURACION_SESION_HORAS}h`,
    });
  }

  verificarToken(token: string): DatosToken {
    try {
      const datos = jwt.verify(token, this.config.jwtSecreto, {
        clockTimestamp: Math.floor(this.reloj.ahora().getTime() / 1000),
      }) as jwt.JwtPayload;
      return { id: Number(datos.sub), rol: datos.rol as Rol };
    } catch {
      throw new ErrorNegocio(401, 'Tu sesión venció o no es válida. Iniciá sesión de nuevo.');
    }
  }

  /** RN1: si no hay ningún administrador, crea el inicial. Devuelve true si lo creó. */
  async asegurarAdminInicial(email: string, password: string): Promise<boolean> {
    if ((await this.repos.usuarios.contarPorRol('ADMIN')) > 0) return false;
    await this.repos.usuarios.crear({
      nombre: 'Coordinación',
      apellido: 'CampoLog',
      email: esquemaEmail.parse(email),
      passwordHash: await this.hashear(esquemaPassword.parse(password)),
      rol: 'ADMIN',
      comisionId: null,
    });
    return true;
  }

  /** Usuario de la sesión actual y, si es estudiante, su comisión. */
  async yo(id: number): Promise<{ usuario: UsuarioPublico; comision: Comision | null }> {
    const usuario = await this.repos.usuarios.porId(id);
    if (!usuario) throw new ErrorNegocio(401, 'Tu sesión venció o no es válida. Iniciá sesión de nuevo.');
    const comision = usuario.comisionId ? await this.repos.comisiones.porId(usuario.comisionId) : null;
    return { usuario: aPublico(usuario), comision };
  }

  async login(cuerpo: unknown): Promise<Sesion> {
    const { email, password } = esquemaLogin.parse(cuerpo);
    const usuario = await this.repos.usuarios.porEmail(email);
    if (!usuario) throw credencialesIncorrectas();

    const ahora = this.reloj.ahora();
    // RN6: con la cuenta bloqueada se rechaza aunque la contraseña sea correcta.
    if (estaBloqueado(usuario, ahora)) {
      throw new ErrorNegocio(423, 'La cuenta está bloqueada por demasiados intentos fallidos. Probá de nuevo en 15 minutos.');
    }

    if (!(await bcrypt.compare(password, usuario.passwordHash))) {
      const nuevo = trasIntentoFallido(usuario, ahora);
      await this.repos.usuarios.actualizarSeguridad(usuario.id, nuevo.intentosFallidos, nuevo.bloqueadoHasta);
      throw credencialesIncorrectas();
    }

    const limpio = trasIntentoCorrecto();
    await this.repos.usuarios.actualizarSeguridad(usuario.id, limpio.intentosFallidos, limpio.bloqueadoHasta);
    return { token: this.emitirToken(usuario), usuario: aPublico(usuario) };
  }
}
