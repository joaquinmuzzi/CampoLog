/** Error de una regla de negocio, con el código HTTP que corresponde y un mensaje para el usuario. */
export class ErrorNegocio extends Error {
  constructor(
    public readonly status: 400 | 401 | 403 | 404 | 409 | 423,
    mensaje: string,
    public readonly detalle?: Record<string, unknown>,
  ) {
    super(mensaje);
    this.name = 'ErrorNegocio';
  }
}

export const noEncontrado = (que = 'Recurso') => new ErrorNegocio(404, `${que} no encontrado`);
export const sinPermiso = () => new ErrorNegocio(403, 'No tenés permiso para hacer esto');
