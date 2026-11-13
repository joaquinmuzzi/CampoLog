// Errores que los repositorios lanzan cuando la base rechaza una operación por una regla.
// Los servicios los traducen a ErrorNegocio con el mensaje para el usuario.

export class EmailDuplicado extends Error {
  constructor() { super('Email duplicado'); this.name = 'EmailDuplicado'; }
}

export class CodigoDuplicado extends Error {
  constructor() { super('Código de inscripción duplicado'); this.name = 'CodigoDuplicado'; }
}

export class DiaNoLaborableDuplicado extends Error {
  constructor() { super('Día no laborable duplicado'); this.name = 'DiaNoLaborableDuplicado'; }
}

/** RN15: ya existe una entrada del estudiante para esa fecha. */
export class EntradaDuplicada extends Error {
  constructor() { super('Entrada duplicada'); this.name = 'EntradaDuplicada'; }
}

/** RN23: la entrada cambió desde que se leyó. */
export class VersionDesactualizada extends Error {
  constructor() { super('Versión desactualizada'); this.name = 'VersionDesactualizada'; }
}

/** Código de PostgreSQL para violación de restricción única. */
export function esViolacionUnica(error: unknown, restriccion?: string): boolean {
  const e = error as { code?: string; constraint?: string };
  return e?.code === '23505' && (!restriccion || e.constraint === restriccion);
}
