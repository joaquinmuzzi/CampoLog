import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../../api/cliente';
import { Entrada } from '../../api/tipos';
import { EntradaFormulario } from './EntradaFormulario';

const api = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn(), patch: vi.fn(), borrar: vi.fn() }));
vi.mock('../../api/cliente', async (original) => ({ ...(await original<typeof import('../../api/cliente')>()), api }));
vi.mock('../../sesion/Sesion', () => ({ useSesion: () => ({ comision: { horasJornada: 4 } }) }));

const ENTRADA: Entrada = {
  id: 7, estudianteId: 3, comisionId: 1, fecha: '2026-09-10', actividad: 'Maquetado de la pantalla', descripcion: '',
  horas: 4, etiquetas: [], evidencias: [], estado: 'BORRADOR', version: 1, comentarios: [],
  enviadaEn: null, observadaEn: null, validadaEn: null, creadoEn: '', actualizadoEn: '',
} as Entrada;

function abrir(ruta: string) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <Routes>
        <Route path="/estudiante/entradas/nueva" element={<EntradaFormulario />} />
        <Route path="/estudiante/entradas/:id" element={<EntradaFormulario />} />
      </Routes>
    </MemoryRouter>,
  );
}

describe('T29 — formulario de entrada', () => {
  beforeEach(() => vi.resetAllMocks());
  afterEach(cleanup);

  it('ofrece solo los días pendientes y las horas de a media hasta la jornada', async () => {
    api.get.mockResolvedValue({ pendientes: [{ fecha: '2026-09-08', diasRestantes: 0 }, { fecha: '2026-09-10', diasRestantes: 2 }] });
    abrir('/estudiante/entradas/nueva');
    const fecha = (await screen.findByLabelText('Día de práctica')) as HTMLSelectElement;
    expect(fecha.value).toBe('2026-09-10');
    expect(screen.getByText(/vence hoy/)).toBeTruthy();
    const horas = screen.getByLabelText('Horas') as HTMLSelectElement;
    expect(Array.from(horas.options).map((o) => o.value)).toEqual(['0.5', '1', '1.5', '2', '2.5', '3', '3.5', '4']);
    // Sin evidencias no se puede enviar (RN21).
    expect((screen.getByText('Guardar y enviar') as HTMLButtonElement).disabled).toBe(true);
  });

  it('si el día ya tiene entrada, avisa y ofrece abrirla (RN15)', async () => {
    api.get.mockResolvedValue({ pendientes: [{ fecha: '2026-09-10', diasRestantes: 2 }] });
    api.post.mockRejectedValue(new ErrorApi(409, 'Ya tenés una entrada para ese día', { id: 7 }));
    abrir('/estudiante/entradas/nueva');
    fireEvent.change(await screen.findByLabelText('Actividad'), { target: { value: 'Otra carga del día' } });
    fireEvent.click(screen.getByText('Guardar borrador'));
    expect(await screen.findByText(/Ya tenés una entrada/)).toBeTruthy();
    expect(screen.getByText('Abrir la entrada de ese día').getAttribute('href')).toBe('/estudiante/entradas/7');
  });

  it('ante un conflicto de versión avisa y recarga la entrada (RN23)', async () => {
    api.get.mockResolvedValueOnce(ENTRADA).mockResolvedValueOnce({ ...ENTRADA, horas: 3, version: 2 });
    api.patch.mockRejectedValue(new ErrorApi(409, 'Otra persona modificó esta entrada', { version: 2, estado: 'BORRADOR' }));
    abrir('/estudiante/entradas/7');
    fireEvent.click(await screen.findByText('Guardar cambios'));
    expect(await screen.findByText(/Otra persona modificó/)).toBeTruthy();
    expect(api.patch).toHaveBeenCalledWith('/entradas/7', expect.objectContaining({ version: 1 }));
    expect(api.get).toHaveBeenLastCalledWith('/entradas/7');
    expect((screen.getByLabelText('Horas') as HTMLSelectElement).value).toBe('3');
  });

  it('una entrada enviada se muestra sin formulario (RN20)', async () => {
    api.get.mockResolvedValue({ ...ENTRADA, estado: 'ENVIADA' });
    abrir('/estudiante/entradas/7');
    expect(await screen.findByText(/esperando la revisión/)).toBeTruthy();
    expect(screen.queryByText('Guardar cambios')).toBeNull();
  });
});
