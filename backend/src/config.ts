export interface Config {
  /** Secreto para firmar los tokens. Viene de JWT_SECRET (nunca escrito en el código). */
  jwtSecreto: string;
  /** Costo de bcrypt (10 en producción; los tests usan 4 para ir más rápido). */
  bcryptRondas: number;
  /** Origen del frontend permitido por CORS (FRONTEND_URL). */
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
