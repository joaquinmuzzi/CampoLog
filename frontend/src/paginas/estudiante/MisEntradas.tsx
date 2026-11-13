import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, ErrorApi } from '../../api/cliente';
import { EstadoEntrada, PaginaDeEntradas } from '../../api/tipos';
import { Aviso, Cargando, EstadoBadge, Paginacion, Tarjeta, Vacio } from '../../componentes/comunes';
import { fechaConDia, horas, NOMBRE_ESTADO } from '../../util/formato';
import { useDatos } from '../../util/useDatos';

/** Lista de entradas con filtros por mes y estado, paginada de a 10 (RN29). */
export function ListaDeEntradas({ ruta, enlace }: { ruta: string; enlace: (id: number) => string }) {
  const [params, setParams] = useSearchParams();
  const mes = params.get('mes') ?? '';
  const estado = params.get('estado') ?? '';
  const pagina = Number(params.get('pagina') ?? 1);
  const consulta = new URLSearchParams({ ...(mes && { mes }), ...(estado && { estado }), pagina: String(pagina) });
  const { datos, error, cargando } = useDatos(() => api.get<PaginaDeEntradas>(`${ruta}?${consulta}`), [ruta, mes, estado, pagina]);

  const cambiar = (clave: string, valor: string) => {
    const nuevos = new URLSearchParams(params);
    if (valor) nuevos.set(clave, valor); else nuevos.delete(clave);
    if (clave !== 'pagina') nuevos.delete('pagina');
    setParams(nuevos);
  };

  return (
    <>
      <div className="filtros">
        <div className="campo">
          <label htmlFor="filtro-mes">Mes</label>
          <input id="filtro-mes" type="month" value={mes} onChange={(e) => cambiar('mes', e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="filtro-estado">Estado</label>
          <select id="filtro-estado" value={estado} onChange={(e) => cambiar('estado', e.target.value)}>
            <option value="">Todos</option>
            {(Object.keys(NOMBRE_ESTADO) as EstadoEntrada[]).map((e) => <option key={e} value={e}>{NOMBRE_ESTADO[e]}</option>)}
          </select>
        </div>
        {(mes || estado) && <button className="boton-enlace" onClick={() => setParams({})}>Quitar filtros</button>}
      </div>
      <Aviso>{error}</Aviso>
      {cargando && !datos ? <Cargando /> : datos && (
        datos.items.length === 0 ? <Vacio>No hay entradas con esos filtros.</Vacio> : (
          <>
            <p className="subtitulo">{datos.total} {datos.total === 1 ? 'entrada' : 'entradas'}</p>
            <ul className="lista">
              {datos.items.map((e) => (
                <li key={e.id}>
                  <Link to={enlace(e.id)} className="item" style={{ textDecoration: 'none', color: 'inherit' }}>
                    <div>
                      <div className="item-titulo">{fechaConDia(e.fecha)} · {e.actividad}</div>
                      <div className="item-detalle">{horas(e.horas)} · {e.evidencias.length} {e.evidencias.length === 1 ? 'evidencia' : 'evidencias'}</div>
                    </div>
                    <EstadoBadge estado={e.estado} />
                  </Link>
                </li>
              ))}
            </ul>
            <Paginacion pagina={datos.pagina} paginas={datos.paginas} alCambiar={(p) => cambiar('pagina', String(p))} />
          </>
        )
      )}
    </>
  );
}

/** HU14 y HU15 — Mis entradas y exportación de la carpeta. */
export function MisEntradas() {
  const [errorDescarga, setErrorDescarga] = useState('');
  async function exportar() {
    setErrorDescarga('');
    try { await api.descargar('/mi/exportacion', 'carpeta.csv'); } catch (e) {
      setErrorDescarga(e instanceof ErrorApi ? e.message : 'No se pudo descargar la carpeta');
    }
  }
  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Mis entradas</h1>
          <p className="subtitulo">Tu carpeta de campo, de la jornada más nueva a la más vieja.</p>
        </div>
        <div className="acciones">
          <button className="boton boton-secundario" onClick={exportar}>Descargar carpeta (CSV)</button>
          <Link className="boton" to="/estudiante/entradas/nueva">Cargar jornada</Link>
        </div>
      </div>
      <Aviso>{errorDescarga}</Aviso>
      <Tarjeta>
        <ListaDeEntradas ruta="/entradas" enlace={(id) => `/estudiante/entradas/${id}`} />
      </Tarjeta>
    </>
  );
}
