import { Entrada } from './tipos';

// RN28 — CSV de la carpeta validada: UTF-8 con BOM y separador ";" para que Excel lo abra bien.
export const BOM = '﻿';
const SEPARADOR = ';';
const FIN_DE_LINEA = '\r\n';
export const ENCABEZADOS = ['Fecha', 'Actividad', 'Horas', 'Evidencias', 'Comentario del docente'];

/** Encierra el valor entre comillas y duplica las comillas internas. */
function celda(valor: string): string {
  return `"${valor.replace(/"/g, '""')}"`;
}

function comentarioDeValidacion(entrada: Pick<Entrada, 'comentarios'>): string {
  const validaciones = entrada.comentarios.filter((c) => c.tipo === 'VALIDACION');
  return validaciones.length > 0 ? validaciones[validaciones.length - 1].texto : '';
}

export function generarCsvCarpeta(entradas: Pick<Entrada, 'fecha' | 'actividad' | 'horas' | 'estado' | 'evidencias' | 'comentarios'>[]): string {
  const filas = entradas
    .filter((e) => e.estado === 'VALIDADA')
    .sort((a, b) => a.fecha.localeCompare(b.fecha))
    .map((e) => [
      e.fecha,
      celda(e.actividad),
      String(e.horas).replace('.', ','), // coma decimal, como la usa Excel en español
      celda(e.evidencias.map((ev) => ev.url).join(' | ')),
      celda(comentarioDeValidacion(e)),
    ].join(SEPARADOR));
  return BOM + [ENCABEZADOS.join(SEPARADOR), ...filas].join(FIN_DE_LINEA) + FIN_DE_LINEA;
}

/** Nombre de archivo sin acentos ni espacios: carpeta-apellido-nombre.csv */
export function nombreDeArchivo(apellido: string, nombre: string): string {
  const limpio = `${apellido}-${nombre}`
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `carpeta-${limpio || 'estudiante'}.csv`;
}
