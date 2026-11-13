import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, ErrorApi } from '../../api/cliente';
import { DatosEntrada, Entrada, Evidencia, Resumen, TipoEvidencia } from '../../api/tipos';
import { Comentarios, DetalleEntrada } from '../../componentes/DetalleEntrada';
import { Aviso, Cargando, EstadoBadge, Tarjeta } from '../../componentes/comunes';
import { useSesion } from '../../sesion/Sesion';
import { fechaConDia, NOMBRE_EVIDENCIA } from '../../util/formato';

const VACIA: DatosEntrada = { actividad: '', descripcion: '', horas: 0, etiquetas: [], evidencias: [] };
const MAX_EVIDENCIAS = 5;

interface Problema { mensaje: string; idExistente?: number }

function aProblema(e: unknown): Problema {
  if (!(e instanceof ErrorApi)) return { mensaje: 'Ocurrió un error inesperado' };
  if (e.status === 409 && typeof e.detalle?.id === 'number') return { mensaje: e.message, idExistente: e.detalle.id }; // RN15
  return { mensaje: e.message };
}

/** HU8, HU9 y HU10 — Crear, editar, enviar y borrar una entrada. */
export function EntradaFormulario() {
  const { id } = useParams();
  const esNueva = !id;
  const [params] = useSearchParams();
  const navegar = useNavigate();
  const { comision } = useSesion();
  const horasJornada = comision?.horasJornada ?? 8;

  const [entrada, setEntrada] = useState<Entrada | null>(null);
  const [fecha, setFecha] = useState(params.get('fecha') ?? '');
  const [pendientes, setPendientes] = useState<{ fecha: string; diasRestantes: number }[] | null>(null);
  const [datos, setDatos] = useState<DatosEntrada>({ ...VACIA, horas: horasJornada });
  const [etiquetasTexto, setEtiquetasTexto] = useState('');
  const [cargando, setCargando] = useState(true);
  const [ocupado, setOcupado] = useState(false);
  const [problema, setProblema] = useState<Problema | null>(null);
  const [exito, setExito] = useState('');

  function cargarEnFormulario(e: Entrada) {
    setEntrada(e);
    setDatos({ actividad: e.actividad, descripcion: e.descripcion, horas: e.horas, etiquetas: e.etiquetas, evidencias: e.evidencias });
    setEtiquetasTexto(e.etiquetas.join(', '));
  }

  useEffect(() => {
    setCargando(true);
    setProblema(null);
    const carga = esNueva
      ? api.get<Resumen>('/mi/resumen').then((r) => {
        setPendientes(r.pendientes);
        if (!params.get('fecha') && r.pendientes.length > 0) setFecha(r.pendientes[r.pendientes.length - 1].fecha);
      })
      : api.get<Entrada>(`/entradas/${id}`).then(cargarEnFormulario);
    carga.catch((e) => setProblema(aProblema(e))).finally(() => setCargando(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const editable = esNueva || entrada?.estado === 'BORRADOR' || entrada?.estado === 'OBSERVADA'; // RN20
  const opcionesHoras = Array.from({ length: horasJornada * 2 }, (_, i) => (i + 1) / 2); // RN16

  function cuerpo(): DatosEntrada {
    const etiquetas = etiquetasTexto.split(',').map((t) => t.trim()).filter(Boolean);
    return { ...datos, etiquetas };
  }

  function cambiarEvidencia(i: number, cambio: Partial<Evidencia>) {
    setDatos({ ...datos, evidencias: datos.evidencias.map((ev, j) => (j === i ? { ...ev, ...cambio } : ev)) });
  }

  async function ejecutar(accion: () => Promise<void>) {
    setOcupado(true);
    setProblema(null);
    setExito('');
    try {
      await accion();
    } catch (e) {
      const p = aProblema(e);
      setProblema(p);
      // RN23: si otra persona la modificó, se recarga su estado actual.
      if (e instanceof ErrorApi && e.status === 409 && entrada && p.idExistente === undefined) {
        cargarEnFormulario(await api.get<Entrada>(`/entradas/${entrada.id}`));
      }
    } finally {
      setOcupado(false);
    }
  }

  const guardar = (enviar: boolean) => (ev?: FormEvent) => {
    ev?.preventDefault();
    return ejecutar(async () => {
      let actual: Entrada;
      if (esNueva) {
        actual = await api.post<Entrada>('/entradas', { fecha, ...cuerpo() });
      } else {
        actual = await api.patch<Entrada>(`/entradas/${entrada!.id}`, { ...cuerpo(), version: entrada!.version });
      }
      if (enviar) actual = await api.post<Entrada>(`/entradas/${actual.id}/enviar`, { version: actual.version });
      cargarEnFormulario(actual);
      setExito(enviar ? 'La entrada se envió a tu docente.' : 'Los cambios se guardaron.');
      if (esNueva) navegar(`/estudiante/entradas/${actual.id}`, { replace: true });
    });
  };

  const borrar = () => {
    if (!entrada || !window.confirm('¿Borrar este borrador? No se puede deshacer.')) return;
    return ejecutar(async () => {
      await api.borrar(`/entradas/${entrada.id}?version=${entrada.version}`);
      navegar('/estudiante/entradas', { replace: true });
    });
  };

  if (cargando) return <Cargando />;

  const titulo = esNueva ? 'Cargar jornada' : `Jornada del ${fechaConDia(entrada?.fecha ?? '')}`;
  const avisos = (
    <>
      {problema && (
        <Aviso>
          {problema.mensaje}
          {problema.idExistente && <> · <Link to={`/estudiante/entradas/${problema.idExistente}`}>Abrir la entrada de ese día</Link></>}
        </Aviso>
      )}
      <Aviso tipo="exito">{exito}</Aviso>
    </>
  );

  if (!esNueva && entrada && !editable) {
    return (
      <>
        <div className="encabezado"><h1>{titulo}</h1><Link to="/estudiante/entradas">← Volver a mis entradas</Link></div>
        {avisos}
        <Aviso tipo="info">
          {entrada.estado === 'ENVIADA' ? 'La entrada está esperando la revisión de tu docente: no se puede modificar.' : 'La entrada está validada: ya forma parte de tu carpeta y no se puede modificar.'}
        </Aviso>
        <Tarjeta><DetalleEntrada entrada={entrada} /></Tarjeta>
      </>
    );
  }

  if (esNueva && pendientes && pendientes.length === 0 && !params.get('fecha')) {
    return (
      <>
        <div className="encabezado"><h1>{titulo}</h1></div>
        {avisos}
        <Aviso tipo="info">No tenés jornadas pendientes de carga: todas las de los últimos 7 días ya tienen su entrada.</Aviso>
        <Link className="boton boton-secundario" to="/estudiante/calendario">Ver el calendario</Link>
      </>
    );
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>{titulo}</h1>
          {entrada && <p className="subtitulo">Estado: <EstadoBadge estado={entrada.estado} /></p>}
        </div>
        <Link to="/estudiante/entradas">← Volver a mis entradas</Link>
      </div>
      {avisos}
      {entrada?.estado === 'OBSERVADA' && (
        <Aviso tipo="alerta">Tu docente observó esta entrada. Corregila y volvé a enviarla dentro de los 7 días desde la observación.</Aviso>
      )}
      <Tarjeta>
        <form className="formulario" onSubmit={guardar(false)}>
          {esNueva && (
            <div className="campo">
              <label htmlFor="fecha">Día de práctica</label>
              <select id="fecha" required value={fecha} onChange={(e) => setFecha(e.target.value)}>
                <option value="" disabled>Elegí el día</option>
                {fecha && !pendientes?.some((p) => p.fecha === fecha) && <option value={fecha}>{fechaConDia(fecha)}</option>}
                {pendientes?.map((p) => (
                  <option key={p.fecha} value={p.fecha}>{fechaConDia(p.fecha)} ({p.diasRestantes === 0 ? 'vence hoy' : `quedan ${p.diasRestantes} d`})</option>
                ))}
              </select>
              <small>Solo días de práctica de los últimos 7 días que todavía no tienen entrada.</small>
            </div>
          )}
          <div className="campo">
            <label htmlFor="actividad">Actividad</label>
            <input id="actividad" required minLength={5} maxLength={120} placeholder="Ej.: Terminamos el diagrama de la base de datos"
              value={datos.actividad} onChange={(e) => setDatos({ ...datos, actividad: e.target.value })} />
            <small>{datos.actividad.trim().length}/120 caracteres (mínimo 5).</small>
          </div>
          <div className="campo">
            <label htmlFor="descripcion">Descripción (opcional)</label>
            <textarea id="descripcion" maxLength={2000} value={datos.descripcion} onChange={(e) => setDatos({ ...datos, descripcion: e.target.value })} />
          </div>
          <div className="fila">
            <div className="campo">
              <label htmlFor="horas">Horas</label>
              <select id="horas" value={datos.horas} onChange={(e) => setDatos({ ...datos, horas: Number(e.target.value) })}>
                {opcionesHoras.map((h) => <option key={h} value={h}>{String(h).replace('.', ',')} h</option>)}
              </select>
            </div>
            <div className="campo">
              <label htmlFor="etiquetas">Etiquetas (separadas por coma)</label>
              <input id="etiquetas" placeholder="código, documentación" value={etiquetasTexto} onChange={(e) => setEtiquetasTexto(e.target.value)} />
            </div>
          </div>

          <div>
            <div className="etiqueta">Evidencias ({datos.evidencias.length}/{MAX_EVIDENCIAS})</div>
            <small className="subtitulo">Links a un commit, documento, tarea o imagen. Para enviar la entrada hace falta al menos una.</small>
            <div className="formulario" style={{ marginTop: '0.5rem' }}>
              {datos.evidencias.map((ev, i) => (
                <div key={i} className="evidencia">
                  <select aria-label="Tipo de evidencia" value={ev.tipo} onChange={(e) => cambiarEvidencia(i, { tipo: e.target.value as TipoEvidencia })}>
                    {(Object.keys(NOMBRE_EVIDENCIA) as TipoEvidencia[]).map((t) => <option key={t} value={t}>{NOMBRE_EVIDENCIA[t]}</option>)}
                  </select>
                  <input aria-label="Título de la evidencia" required minLength={3} maxLength={80} placeholder="Título" value={ev.titulo}
                    onChange={(e) => cambiarEvidencia(i, { titulo: e.target.value })} />
                  <input aria-label="Link de la evidencia" type="url" required placeholder="https://…" value={ev.url}
                    onChange={(e) => cambiarEvidencia(i, { url: e.target.value })} />
                  <button type="button" className="boton boton-peligro boton-chico"
                    onClick={() => setDatos({ ...datos, evidencias: datos.evidencias.filter((_, j) => j !== i) })}>Quitar</button>
                </div>
              ))}
            </div>
            {datos.evidencias.length < MAX_EVIDENCIAS && (
              <button type="button" className="boton boton-secundario boton-chico" style={{ marginTop: '0.5rem' }}
                onClick={() => setDatos({ ...datos, evidencias: [...datos.evidencias, { tipo: 'COMMIT', titulo: '', url: '' }] })}>
                + Agregar evidencia
              </button>
            )}
          </div>

          {entrada && <Comentarios comentarios={entrada.comentarios} />}

          <div className="acciones">
            <button className="boton boton-secundario" type="submit" disabled={ocupado}>{esNueva ? 'Guardar borrador' : 'Guardar cambios'}</button>
            <button className="boton" type="button" disabled={ocupado || datos.evidencias.length === 0} onClick={() => guardar(true)()}
              title={datos.evidencias.length === 0 ? 'Agregá al menos una evidencia para enviar' : undefined}>
              {entrada?.estado === 'OBSERVADA' ? 'Guardar y reenviar' : 'Guardar y enviar'}
            </button>
            {entrada?.estado === 'BORRADOR' && (
              <button className="boton boton-peligro" type="button" disabled={ocupado} onClick={borrar}>Borrar borrador</button>
            )}
          </div>
        </form>
      </Tarjeta>
    </>
  );
}
