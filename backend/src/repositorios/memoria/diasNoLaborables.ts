import { FERIADOS_2026 } from '../../dominio/feriados2026';
import { DiaNoLaborable } from '../../dominio/tipos';
import { DiaNoLaborableDuplicado } from '../errores';
import { RepoDiasNoLaborables } from '../tipos';

export class RepoDiasNoLaborablesMemoria implements RepoDiasNoLaborables {
  private filas: DiaNoLaborable[] = [];
  private siguienteId = 1;

  constructor() {
    // Misma semilla que la migración 002 en PostgreSQL.
    for (const f of FERIADOS_2026) this.filas.push({ id: this.siguienteId++, fecha: f.fecha, motivo: f.motivo, tipo: 'FERIADO', comisionId: null });
  }

  async crear(nuevo: Omit<DiaNoLaborable, 'id'>): Promise<DiaNoLaborable> {
    if (this.filas.some((d) => d.fecha === nuevo.fecha && d.comisionId === nuevo.comisionId)) throw new DiaNoLaborableDuplicado();
    const dia = { ...nuevo, id: this.siguienteId++ };
    this.filas.push(dia);
    return { ...dia };
  }

  async porId(id: number) {
    const d = this.filas.find((x) => x.id === id);
    return d ? { ...d } : null;
  }

  async listarFeriados() {
    return this.ordenar(this.filas.filter((d) => d.tipo === 'FERIADO'));
  }

  async paraComision(comisionId: number) {
    return this.ordenar(this.filas.filter((d) => d.tipo === 'FERIADO' || d.comisionId === comisionId));
  }

  async borrar(id: number) {
    this.filas = this.filas.filter((d) => d.id !== id);
  }

  private ordenar(dias: DiaNoLaborable[]) {
    return dias.map((d) => ({ ...d })).sort((a, b) => a.fecha.localeCompare(b.fecha) || a.id - b.id);
  }
}
