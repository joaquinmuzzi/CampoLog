import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ErrorApi } from '../../api/cliente';
import { Comision, Entrada, Resumen } from '../../api/tipos';
import { DetalleEntrada } from '../../componentes/DetalleEntrada';
import { Recesos } from '../../componentes/Recesos';
import { TablaEstudiantes } from '../../componentes/TablaEstudiantes';
import { Aviso, Cargando, Tarjeta, Vacio } from '../../componentes/comunes';
import { diasDeSemana, fechaCorta, fechaHora } from '../../util/formato';
import { useDatos } from '../../util/useDatos';
import { TarjetaResumen } from '../estudiante/Inicio';
import { ListaDeEntradas } from '../estudiante/MisEntradas';

function DatosComision({ c }: { c: Comision }) {
  return (
    <>
      {diasDeSemana(c.diasSemana)} · {c.horasJornada} h por jornada · del {fechaCorta(c.fechaInicio)} al {fechaCorta(c.fechaFin)}
    </>
  );
}

/** HU13 — Mis comisiones (RN24: el docente solo ve las suyas). */
export function MisComisiones() {
  const { datos, error, cargando } = useDatos(() => api.get<Comision[]>('/comisiones'), []);
  if (cargando) return <Cargando />;
  return (
    <>
      <div className="encabezado"><h1>Mis comisiones</h1></div>
      <Aviso>{error}</Aviso>
      {datos && datos.length === 0 && <Vacio>Todavía no tenés comisiones asignadas. La administración te asigna como docente a cargo.</Vacio>}
      <ul className="lista">
        {datos?.map((c) => (
          <li key={c.id}>
            <Link to={`/docente/comisiones/${c.id}`} className="item" style={{ textDecoration: 'none', color: 'inherit' }}>
              <div>
                <div className="item-titulo">{c.nombre}</div>
                <div className="item-detalle"><DatosComision c={c} /></div>
              </div>
              <span className="codigo" title="Código de inscripción">{c.codigoInscripcion}</span>
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

/** HU13 y HU6 — Estudiantes de la comisión con su situación y recesos. */
export function ComisionDocente() {
  const id = Number(useParams().id);
  const { datos, error, cargando } = useDatos(
    () => Promise.all([api.get<Comision>(`/comisiones/${id}`), api.get<Resumen[]>(`/comisiones/${id}/estudiantes`)]),
    [id],
  );
  if (cargando) return <Cargando />;
  if (error || !datos) return <Aviso>{error}</Aviso>;
  const [c, estudiantes] = datos;
  const enRiesgo = estudiantes.filter((e) => e.enRiesgo).length;
  const porRevisar = estudiantes.reduce((t, e) => t + e.enviadasPorRevisar, 0);

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>{c.nombre}</h1>
          <p className="subtitulo"><DatosComision c={c} /></p>
        </div>
        <Link to="/docente">← Mis comisiones</Link>
      </div>
      <Aviso tipo="info">Código de inscripción para tus estudiantes: <span className="codigo">{c.codigoInscripcion}</span></Aviso>
      {enRiesgo > 0 && <Aviso tipo="alerta">{enRiesgo} {enRiesgo === 1 ? 'estudiante tiene' : 'estudiantes tienen'} la asistencia por debajo del 75 %.</Aviso>}
      <Tarjeta titulo={`Estudiantes (${estudiantes.length})`} acciones={porRevisar > 0 ? <span className="badge badge-enviada">{porRevisar} por revisar</span> : undefined}>
        <TablaEstudiantes estudiantes={estudiantes} enlace={(e) => `/docente/estudiantes/${e}`} />
      </Tarjeta>
      <Recesos comisionId={c.id} />
    </>
  );
}

/** HU11 y HU15 — Carpeta de un estudiante: resumen, entradas y exportación. */
export function CarpetaEstudiante() {
  const id = Number(useParams().id);
  const { datos: r, error, cargando } = useDatos(() => api.get<Resumen>(`/estudiantes/${id}/resumen`), [id]);
  const [errorDescarga, setErrorDescarga] = useState('');

  async function exportar() {
    setErrorDescarga('');
    try { await api.descargar(`/estudiantes/${id}/exportacion`, 'carpeta.csv'); } catch (e) {
      setErrorDescarga(e instanceof ErrorApi ? e.message : 'No se pudo descargar la carpeta');
    }
  }

  if (cargando) return <Cargando />;
  if (error || !r) return <Aviso>{error}</Aviso>;

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>{r.estudiante.nombre} {r.estudiante.apellido}</h1>
          <p className="subtitulo">{r.estudiante.email} · {r.comision.nombre}</p>
        </div>
        <div className="acciones">
          <Link to={`/docente/comisiones/${r.comision.id}`}>← Volver a la comisión</Link>
          <button className="boton boton-secundario" onClick={exportar}>Descargar carpeta (CSV)</button>
        </div>
      </div>
      <Aviso>{errorDescarga}</Aviso>
      {r.enRiesgo && <Aviso tipo="alerta">La asistencia está por debajo del 75 %: el estudiante está en riesgo.</Aviso>}
      <TarjetaResumen r={r} titulo="Situación" />
      <Tarjeta titulo="Entradas">
        <ListaDeEntradas ruta={`/estudiantes/${id}/entradas`} enlace={(e) => `/docente/entradas/${e}`} />
      </Tarjeta>
    </>
  );
}

/** HU11 — Revisar una entrada enviada: validar u observar con comentario (RN19, RN22, RN23). */
export function RevisarEntrada() {
  const id = Number(useParams().id);
  const { datos: entrada, error, cargando, setDatos, recargar } = useDatos(() => api.get<Entrada>(`/entradas/${id}`), [id]);
  const [comentario, setComentario] = useState('');
  const [problema, setProblema] = useState('');
  const [exito, setExito] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function revisar(accion: 'validar' | 'observar', ev?: FormEvent) {
    ev?.preventDefault();
    if (!entrada) return;
    setProblema('');
    setExito('');
    const texto = comentario.trim();
    if (accion === 'observar' && (texto.length < 10 || texto.length > 500)) {
      setProblema('Para observar una entrada tenés que escribir un comentario de 10 a 500 caracteres');
      return;
    }
    setOcupado(true);
    try {
      const actualizada = await api.post<Entrada>(`/entradas/${entrada.id}/${accion}`, { version: entrada.version, ...(texto && { comentario: texto }) });
      setDatos(actualizada);
      setComentario('');
      setExito(accion === 'validar' ? 'La entrada quedó validada.' : 'La entrada quedó observada: el estudiante tiene 7 días para corregirla.');
    } catch (e) {
      setProblema(e instanceof ErrorApi ? e.message : 'No se pudo guardar la revisión');
      if (e instanceof ErrorApi && e.status === 409) await recargar(); // RN23: alguien más la cambió
    } finally {
      setOcupado(false);
    }
  }

  if (cargando && !entrada) return <Cargando />;
  if (!entrada) return <Aviso>{error}</Aviso>;

  return (
    <>
      <div className="encabezado">
        <h1>Revisar jornada</h1>
        <Link to={`/docente/estudiantes/${entrada.estudianteId}`}>← Volver a la carpeta</Link>
      </div>
      <Aviso>{problema}</Aviso>
      <Aviso tipo="exito">{exito}</Aviso>
      <Tarjeta><DetalleEntrada entrada={entrada} /></Tarjeta>
      {entrada.estado === 'ENVIADA' ? (
        <Tarjeta titulo="Tu revisión">
          {entrada.enviadaEn && <p className="subtitulo">Enviada el {fechaHora(entrada.enviadaEn)}.</p>}
          <form className="formulario" onSubmit={(ev) => revisar('validar', ev)}>
            <div className="campo">
              <label htmlFor="comentario">Comentario (obligatorio para observar, de 10 a 500 caracteres)</label>
              <textarea id="comentario" maxLength={500} value={comentario} onChange={(e) => setComentario(e.target.value)}
                placeholder="Ej.: Falta el link al commit de esta jornada." />
              <small>{comentario.trim().length}/500</small>
            </div>
            <div className="acciones">
              <button className="boton" type="submit" disabled={ocupado}>Validar</button>
              <button className="boton boton-peligro" type="button" disabled={ocupado} onClick={() => revisar('observar')}>Observar</button>
            </div>
          </form>
        </Tarjeta>
      ) : (
        <Aviso tipo="info">
          {entrada.estado === 'VALIDADA' && 'Esta entrada ya está validada.'}
          {entrada.estado === 'OBSERVADA' && 'Esta entrada está observada: esperando la corrección del estudiante.'}
          {entrada.estado === 'BORRADOR' && 'El estudiante todavía no envió esta entrada.'}
        </Aviso>
      )}
    </>
  );
}
