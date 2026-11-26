// Reemplazo de jsonwebtoken SOLO para el modo demo en el navegador (jsonwebtoken necesita Node).
// El token no va firmado: en la demo no hay servidor que proteger, pero se respeta el vencimiento (RN5).
export interface JwtPayload { sub?: string; rol?: string; iat?: number; exp?: number; [clave: string]: unknown }

const aBase64 = (texto: string) => btoa(unescape(encodeURIComponent(texto)));
const deBase64 = (texto: string) => decodeURIComponent(escape(atob(texto)));

function segundos(duracion: string | number): number {
  if (typeof duracion === 'number') return duracion;
  const m = /^(\d+)([smhd])$/.exec(duracion);
  if (!m) return Number(duracion);
  return Number(m[1]) * { s: 1, m: 60, h: 3600, d: 86400 }[m[2] as 's' | 'm' | 'h' | 'd'];
}

function sign(payload: JwtPayload, _secreto: string, opciones: { expiresIn?: string | number } = {}): string {
  const iat = payload.iat ?? Math.floor(Date.now() / 1000);
  const datos = { ...payload, iat, ...(opciones.expiresIn ? { exp: iat + segundos(opciones.expiresIn) } : {}) };
  return `demo.${aBase64(JSON.stringify(datos))}`;
}

function verify(token: string, _secreto: string, opciones: { clockTimestamp?: number } = {}): JwtPayload {
  const [marca, cuerpo] = token.split('.');
  if (marca !== 'demo' || !cuerpo) throw new Error('Token inválido');
  const datos = JSON.parse(deBase64(cuerpo)) as JwtPayload;
  const ahora = opciones.clockTimestamp ?? Math.floor(Date.now() / 1000);
  if (datos.exp !== undefined && ahora >= datos.exp) throw new Error('Token vencido');
  return datos;
}

export default { sign, verify };
