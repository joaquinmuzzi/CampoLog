import { FormEvent, useState } from 'react';
import { api, ErrorApi } from '../api/cliente';
import { DiaNoLaborable } from '../api/tipos';
import { fechaConDia, hoyArgentina } from '../util/formato';
import { useDatos } from '../util/useDatos';
import { Aviso, Tarjeta, Vacio } from './comunes';

/** HU6 — Recesos de una comisión (RN9, RN10): solo desde hoy en adelante. Lo usan el docente y el administrador. */
export function Recesos({ comisionId }: { comisionId: number }) {
  const hoy = hoyArgentina();
  const { datos, error, recargar } = useDatos(() => api.get<DiaNoLaborable[]>(`/dias-no-laborables?comisionId=${comisionId}`), [comisionId]);
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [problema, setProblema] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const recesos = (datos ?? []).filter((d) => d.tipo === 'RECESO').sort((a, b) => a.fecha.localeCompare(b.fecha));
  const proximosFeriados = (datos ?? []).filter((d) => d.tipo === 'FERIADO' && d.fecha >= hoy).length;

  async function ejecutar(accion: () => Promise<unknown>) {
    setOcupado(true);
    setProblema('');
    try {
      await accion();
      await recargar();
      return true;
    } catch (e) {
      setProblema(e instanceof ErrorApi ? e.message : 'No se pudo guardar el receso');
      return false;
    } finally {
      setOcupado(false);
    }
  }

  async function agregar(ev: FormEvent) {
    ev.preventDefault();
    const ok = await ejecutar(() => api.post('/dias-no-laborables', { fecha, motivo, tipo: 'RECESO', comisionId }));
    if (ok) { setFecha(''); setMotivo(''); }
  }

  function quitar(dia: DiaNoLaborable) {
    if (!window.confirm(`¿Quitar el receso del ${fechaConDia(dia.fecha)}?`)) return;
    ejecutar(() => api.borrar(`/dias-no-laborables/${dia.id}`));
  }

  return (
    <Tarjeta titulo="Recesos de la comisión">
      <p className="subtitulo">
        Los días de receso no cuentan como días de práctica. Se cargan solo desde hoy en adelante
        {proximosFeriados > 0 && ` · además rigen ${proximosFeriados} feriados próximos cargados por la administración`}.
      </p>
      <Aviso>{error || problema}</Aviso>
      {recesos.length === 0 ? <Vacio>No hay recesos cargados.</Vacio> : (
        <ul className="lista">
          {recesos.map((d) => (
            <li key={d.id} className="item">
              <div>
                <div className="item-titulo">{fechaConDia(d.fecha)}</div>
                <div className="item-detalle">{d.motivo}</div>
              </div>
              {d.fecha >= hoy && (
                <button className="boton boton-peligro boton-chico" disabled={ocupado} onClick={() => quitar(d)}>Quitar</button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form className="fila" onSubmit={agregar} style={{ marginTop: '1rem', alignItems: 'flex-end' }}>
        <div className="campo">
          <label htmlFor="receso-fecha">Fecha</label>
          <input id="receso-fecha" type="date" required min={hoy} max="2099-12-31" value={fecha} onChange={(e) => setFecha(e.target.value)} />
        </div>
        <div className="campo" style={{ flex: 2 }}>
          <label htmlFor="receso-motivo">Motivo</label>
          <input id="receso-motivo" required minLength={3} maxLength={80} placeholder="Ej.: Jornada institucional" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
        </div>
        <button className="boton" type="submit" disabled={ocupado}>Agregar receso</button>
      </form>
    </Tarjeta>
  );
}
