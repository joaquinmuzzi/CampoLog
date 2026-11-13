import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ErrorApi } from '../../api/cliente';
import { Usuario } from '../../api/tipos';
import { FormularioComision } from './Admin';

const DOCENTES = [{ id: 2, nombre: 'Laura', apellido: 'Gómez', email: 'docente@campolog.demo', rol: 'DOCENTE', comisionId: null }] as Usuario[];
const COMISION = { nombre: '6° 2° Computación', diasSemana: [2, 4], fechaInicio: '2026-08-04', fechaFin: '2026-12-10', horasJornada: 4, docenteId: 2 };

describe('T31 — formulario de comisión', () => {
  afterEach(cleanup);

  it('arma los datos con los días elegidos y muestra el error del backend (RN7)', async () => {
    const alGuardar = vi.fn().mockRejectedValueOnce(new ErrorApi(400, 'La comisión puede durar como máximo 270 días')).mockResolvedValue(undefined);
    render(<FormularioComision docentes={DOCENTES} textoBoton="Crear comisión" alGuardar={alGuardar} />);
    fireEvent.change(screen.getByLabelText('Nombre'), { target: { value: '5° 1° Programación' } });
    fireEvent.change(screen.getByLabelText('Docente a cargo'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('Fecha de inicio'), { target: { value: '2027-03-01' } });
    fireEvent.change(screen.getByLabelText('Fecha de fin'), { target: { value: '2027-12-01' } });

    // Sin días de práctica no se manda nada.
    fireEvent.click(screen.getByText('Crear comisión'));
    expect(await screen.findByText('Elegí entre 1 y 5 días de práctica')).toBeTruthy();
    expect(alGuardar).not.toHaveBeenCalled();

    fireEvent.click(screen.getByLabelText('Miércoles'));
    fireEvent.click(screen.getByLabelText('Lunes'));
    fireEvent.click(screen.getByText('Crear comisión'));
    expect(await screen.findByText(/como máximo 270 días/)).toBeTruthy();
    expect(alGuardar).toHaveBeenCalledWith({
      nombre: '5° 1° Programación', diasSemana: [1, 3], fechaInicio: '2027-03-01', fechaFin: '2027-12-01', horasJornada: 4, docenteId: 2,
    });
  });

  it('si la comisión ya empezó, bloquea días, fechas y horas pero deja cambiar el nombre (RN11)', () => {
    render(<FormularioComision inicial={COMISION} docentes={DOCENTES} calendarioBloqueado textoBoton="Guardar cambios" alGuardar={vi.fn()} />);
    expect(screen.getByText(/La comisión ya empezó/)).toBeTruthy();
    expect((screen.getByLabelText('Fecha de inicio') as HTMLInputElement).disabled).toBe(true);
    expect((screen.getByLabelText('Horas por jornada') as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByLabelText('Martes') as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText('Nombre') as HTMLInputElement).disabled).toBe(false);
  });
});
