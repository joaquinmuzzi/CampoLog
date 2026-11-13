// "Hoy" del negocio: la fecha en America/Argentina/Buenos_Aires (glosario).
export const ZONA_HORARIA = 'America/Argentina/Buenos_Aires';

export interface Reloj {
  /** Fecha de hoy en Argentina, como AAAA-MM-DD. */
  hoy(): string;
  /** Instante actual. */
  ahora(): Date;
}

export function fechaEnArgentina(instante: Date): string {
  // en-CA formatea como AAAA-MM-DD.
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit',
  }).format(instante);
}

export class RelojArgentina implements Reloj {
  constructor(private readonly fuente: () => Date = () => new Date()) {}

  hoy(): string {
    return fechaEnArgentina(this.fuente());
  }

  ahora(): Date {
    return this.fuente();
  }
}

/** Reloj controlable para los tests. */
export class RelojFijo implements Reloj {
  private instante: Date;

  constructor(instante: string | Date) {
    this.instante = new Date(instante);
  }

  hoy(): string {
    return fechaEnArgentina(this.instante);
  }

  ahora(): Date {
    return new Date(this.instante);
  }

  fijar(instante: string | Date): void {
    this.instante = new Date(instante);
  }

  avanzarMinutos(minutos: number): void {
    this.instante = new Date(this.instante.getTime() + minutos * 60_000);
  }

  avanzarDias(dias: number): void {
    this.avanzarMinutos(dias * 24 * 60);
  }
}
