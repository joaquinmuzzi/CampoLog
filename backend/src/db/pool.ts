import { Pool, types } from 'pg';

// DATE (1082) como texto AAAA-MM-DD, para no correr fechas por zona horaria (plan.md, DT5).
types.setTypeParser(1082, (valor) => valor);
// NUMERIC (1700) como número (las horas de una entrada).
types.setTypeParser(1700, (valor) => Number(valor));

/** La cadena de conexión viene siempre del entorno (DATABASE_URL); nunca se escribe en el código. */
export function crearPool(cadenaDeConexion: string, opciones: { ssl?: boolean; searchPath?: string } = {}): Pool {
  return new Pool({
    connectionString: cadenaDeConexion,
    ssl: opciones.ssl ? { rejectUnauthorized: false } : undefined,
    options: opciones.searchPath ? `-c search_path=${opciones.searchPath}` : undefined,
    max: 10,
  });
}
