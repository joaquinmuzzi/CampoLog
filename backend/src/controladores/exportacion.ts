import { Response } from 'express';

export function enviarCsv(res: Response, archivo: { nombreArchivo: string; contenido: string }) {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${archivo.nombreArchivo}"`);
  res.send(archivo.contenido);
}
