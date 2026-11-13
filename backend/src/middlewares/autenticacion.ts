import { RequestHandler, Response } from 'express';
import { Rol } from '../dominio/tipos';
import { ErrorNegocio, sinPermiso } from '../errores';
import { AuthServicio, DatosToken } from '../servicios/authServicio';

/** RN5: toda operación salvo registro e inicio de sesión requiere un token válido. */
export function autenticar(auth: AuthServicio): RequestHandler {
  return (req, res, next) => {
    const cabecera = req.header('authorization') ?? '';
    const [tipo, token] = cabecera.split(' ');
    if (tipo !== 'Bearer' || !token) throw new ErrorNegocio(401, 'Tenés que iniciar sesión');
    res.locals.usuario = auth.verificarToken(token);
    next();
  };
}

export function requerirRol(...roles: Rol[]): RequestHandler {
  return (_req, res, next) => {
    if (!roles.includes(usuarioDe(res).rol)) throw sinPermiso();
    next();
  };
}

export function usuarioDe(res: Response): DatosToken {
  return res.locals.usuario as DatosToken;
}
