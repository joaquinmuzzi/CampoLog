export interface Config {
  /** Secreto para firmar los tokens. Viene de JWT_SECRET (nunca escrito en el código). */
  jwtSecreto: string;
  /** Costo de bcrypt (10 en producción; los tests usan 4 para ir más rápido). */
  bcryptRondas: number;
  /** Origen (u orígenes, separados por coma) del frontend permitido por CORS (FRONTEND_URL). */
  frontendUrl?: string;
}

export function leerConfigDelEntorno(env: NodeJS.ProcessEnv = process.env): Config {
  if (!env.JWT_SECRET || env.JWT_SECRET.length < 16) {
    throw new Error('Falta JWT_SECRET (al menos 16 caracteres) en las variables de entorno');
  }
  return {
    jwtSecreto: env.JWT_SECRET,
    bcryptRondas: Number(env.BCRYPT_ROUNDS ?? 10),
    frontendUrl: env.FRONTEND_URL,
  };
}

/** Lista de orígenes permitidos por CORS a partir de FRONTEND_URL ("https://a.app, http://localhost:5173"). */
export function origenesPermitidos(frontendUrl: string | undefined): string[] {
  return (frontendUrl ?? '')
    .split(',')
    .map((origen) => origen.trim().replace(/\/+$/, ''))
    .filter(Boolean);
}
