import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../../api/cliente';
import { Entrada, Resumen } from '../../api/tipos';
import { TablaEstudiantes } from '../../componentes/TablaEstudiantes';
import { RevisarEntrada } from './Docente';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock('../../api/cliente', async (original) => ({ ...(await original<typeof import('../../api/cliente')>()), api }));

const ENVIADA = {
  id: 9, estudianteId: 3, comisionId: 1, fecha: '2026-09-10', actividad: 'Diseño del modelo de datos', descripcion: '',
  horas: 4, etiquetas: [], evidencias: [{ tipo: 'COMMIT', titulo: 'DER', url: 'https://github.com/x/y/commit/1' }],
  estado: 'ENVIADA', version: 2, comentarios: [], enviadaEn: '2026-09-10T20:00:00Z', observadaEn: null, validadaEn: null,
} as Entrada;

function abrir() {
  return render(
    <MemoryRouter initialEntries={['/docente/entradas/9']}>
      <Routes><Route path="/docente/entradas/:id" element={<RevisarEntrada />} /></Routes>
    </MemoryRouter>,
  );
}

describe('T30 — revisión docente', () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(cleanup);

  it('observar exige un comentario de 10 a 500 caracteres (RN22)', async () => {
    api.get.mockResolvedValue(ENVIADA);
    abrir();
    fireEvent.click(await screen.findByText('Observar'));
    expect(await screen.findByText(/comentario de 10 a 500/)).toBeTruthy();
    expect(api.post).not.toHaveBeenCalled();

    api.post.mockResolvedValue({ ...ENVIADA, estado: 'OBSERVADA', version: 3 });
    fireEvent.change(screen.getByLabelText(/Comentario/), { target: { value: 'Falta el link al commit.' } });
    fireEvent.click(screen.getByText('Observar'));
    expect(await screen.findByText(/quedó observada/)).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/entradas/9/observar', { version: 2, comentario: 'Falta el link al commit.' });
  });

  it('validar manda la versión; si otro la revisó, avisa y recarga (RN23)', async () => {
    api.get.mockResolvedValueOnce(ENVIADA).mockResolvedValueOnce({ ...ENVIADA, estado: 'VALIDADA', version: 3 });
    api.post.mockRejectedValue(new ErrorApi(409, 'Otra persona modificó esta entrada', { version: 3, estado: 'VALIDADA' }));
    abrir();
    fireEvent.click(await screen.findByText('Validar'));
    expect(await screen.findByText(/ya está validada/)).toBeTruthy();
    expect(screen.getByText(/Otra persona modificó/)).toBeTruthy();
    expect(api.post).toHaveBeenCalledWith('/entradas/9/validar', { version: 2 });
  });

  it('la tabla marca a los estudiantes en riesgo y enlaza a lo que falta revisar (RN26)', () => {
    const base = { asistencia: 50, diasValidados: 5, diasTranscurridos: 10, horasValidadas: 20, enviadasPorRevisar: 2,
      cantidadPorEstado: { BORRADOR: 0, ENVIADA: 2, OBSERVADA: 1, VALIDADA: 5 } };
    const estudiantes = [
      { ...base, enRiesgo: true, estudiante: { id: 4, nombre: 'Bruno', apellido: 'Díaz' } },
      { ...base, enRiesgo: false, enviadasPorRevisar: 0, estudiante: { id: 3, nombre: 'Ana', apellido: 'Pérez' } },
    ] as unknown as Resumen[];
    render(<MemoryRouter><TablaEstudiantes estudiantes={estudiantes} enlace={(id) => `/docente/estudiantes/${id}`} /></MemoryRouter>);
    expect(screen.getAllByText('En riesgo')).toHaveLength(1);
    expect(screen.getByText('2').closest('a')?.getAttribute('href')).toBe('/docente/estudiantes/4?estado=ENVIADA');
  });
});
