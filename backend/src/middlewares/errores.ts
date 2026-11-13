import { ErrorRequestHandler, RequestHandler } from 'express';
import { ZodError } from 'zod';
import { ErrorNegocio } from '../errores';

export const rutaNoEncontrada: RequestHandler = (_req, res) => {
  res.status(404).json({ error: 'Recurso no encontrado' });
};

export const manejarErrores: ErrorRequestHandler = (err, _req, res, _next) => {
  if (err instanceof ErrorNegocio) {
    res.status(err.status).json(err.detalle ? { error: err.message, detalle: err.detalle } : { error: err.message });
    return;
  }
  if (err instanceof ZodError) {
    res.status(400).json({ error: err.issues[0]?.message ?? 'Datos inválidos' });
    return;
  }
  if (err?.type === 'entity.parse.failed') {
    res.status(400).json({ error: 'El cuerpo del pedido no es un JSON válido' });
    return;
  }
  if (err?.type === 'entity.too.large') {
    res.status(400).json({ error: 'El pedido es demasiado grande' });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Ocurrió un error inesperado. Intentá de nuevo en unos minutos.' });
};
