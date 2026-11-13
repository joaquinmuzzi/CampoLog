import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DiaDelCalendario } from '../api/tipos';
import { CalendarioMes } from './CalendarioMes';

// Septiembre de 2026 empieza un martes.
const dias: DiaDelCalendario[] = Array.from({ length: 30 }, (_, i) => ({ fecha: `2026-09-${String(i + 1).padStart(2, '0')}`, tipo: 'SIN_PRACTICA' }));
dias[2] = { fecha: '2026-09-03', tipo: 'SIN_REGISTRO' };
dias[7] = { fecha: '2026-09-08', tipo: 'CON_ENTRADA', estado: 'OBSERVADA', entradaId: 7 };
dias[9] = { fecha: '2026-09-10', tipo: 'PENDIENTE', diasRestantes: 2 };
dias[16] = { fecha: '2026-09-17', tipo: 'NO_LABORABLE', motivo: 'Jornada institucional' };

describe('T28 — calendario del mes', () => {
  afterEach(cleanup);

  it('deja un hueco antes del martes 1 y muestra el estado de cada día', () => {
    const { container } = render(<CalendarioMes dias={dias} hoy="2026-09-15" />);
    const grilla = container.querySelector('.calendario')!;
    // 7 cabeceras + 1 hueco (lunes) + 30 días
    expect(grilla.children).toHaveLength(38);
    expect(container.querySelector('[data-fecha="2026-09-03"]')?.className).toContain('dia-sin_registro');
    expect(container.querySelector('[data-fecha="2026-09-08"]')?.className).toContain('estado-observada');
    expect(container.querySelector('[data-fecha="2026-09-15"]')?.className).toContain('dia-hoy');
    expect(screen.getByText('Cargar (2 d)')).toBeTruthy();
    expect(screen.getByText('Jornada institucional')).toBeTruthy();
    expect(container.querySelector('[data-fecha="2026-09-08"]')?.textContent).toContain('Observada');
  });

  it('solo los días pendientes y con entrada se pueden elegir', () => {
    const alElegir = vi.fn();
    render(<CalendarioMes dias={dias} hoy="2026-09-15" alElegir={alElegir} />);
    const botones = screen.getAllByRole('button');
    expect(botones.map((b) => b.getAttribute('data-fecha'))).toEqual(['2026-09-08', '2026-09-10']);
    fireEvent.click(botones[1]);
    expect(alElegir).toHaveBeenCalledWith(dias[9]);
  });
});
