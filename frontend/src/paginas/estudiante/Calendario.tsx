import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../../api/cliente';
import { Calendario as DatosCalendario } from '../../api/tipos';
import { CalendarioMes } from '../../componentes/CalendarioMes';
import { Aviso, Cargando, Tarjeta } from '../../componentes/comunes';
import { mesVecino, nombreMes } from '../../util/formato';
import { useDatos } from '../../util/useDatos';

/** HU7 — Calendario de práctica del estudiante. */
export function CalendarioEstudiante() {
  const [params, setParams] = useSearchParams();
  const navegar = useNavigate();
  const mes = params.get('mes') ?? '';
  const { datos, error, cargando } = useDatos(
    () => api.get<DatosCalendario>(`/mi/calendario${mes ? `?mes=${mes}` : ''}`), [mes],
  );

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Calendario de práctica</h1>
          <p className="subtitulo">Tocá un día pendiente para cargarlo o una entrada para verla.</p>
        </div>
      </div>
      <Aviso>{error}</Aviso>
      {cargando && !datos ? <Cargando /> : datos && (
        <Tarjeta>
          <div className="calendario-cabecera">
            <button className="boton boton-secundario boton-chico" onClick={() => setParams({ mes: mesVecino(datos.mes, -1) })}>← Anterior</button>
            <h2>{nombreMes(datos.mes)}</h2>
            <button className="boton boton-secundario boton-chico" onClick={() => setParams({ mes: mesVecino(datos.mes, 1) })}>Siguiente →</button>
          </div>
          <CalendarioMes
            dias={datos.dias}
            hoy={datos.hoy}
            alElegir={(d) => navegar(d.entradaId ? `/estudiante/entradas/${d.entradaId}` : `/estudiante/entradas/nueva?fecha=${d.fecha}`)}
          />
        </Tarjeta>
      )}
    </>
  );
}
