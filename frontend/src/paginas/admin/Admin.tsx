import { FormEvent, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, ErrorApi } from '../../api/cliente';
import { Comision, DiaNoLaborable, Resumen, Usuario } from '../../api/tipos';
import { Recesos } from '../../componentes/Recesos';
import { TablaEstudiantes } from '../../componentes/TablaEstudiantes';
import { Aviso, Cargando, Tarjeta, Vacio } from '../../componentes/comunes';
import { DIAS_SEMANA, diasDeSemana, fechaConDia, fechaCorta, hoyArgentina } from '../../util/formato';
import { useDatos } from '../../util/useDatos';

const MAX_FECHA = '2099-12-31';

export interface DatosComision {
  nombre: string;
  diasSemana: number[];
  fechaInicio: string;
  fechaFin: string;
  horasJornada: number;
  docenteId: number;
}

const VACIA: DatosComision = { nombre: '', diasSemana: [], fechaInicio: '', fechaFin: '', horasJornada: 4, docenteId: 0 };

const mensaje = (e: unknown, porDefecto: string) => (e instanceof ErrorApi ? e.message : porDefecto);

/** HU3 — Formulario de comisión (RN7). Si la comisión ya empezó, el calendario queda bloqueado (RN11). */
export function FormularioComision({ inicial = VACIA, docentes, calendarioBloqueado = false, textoBoton, alGuardar }: {
  inicial?: DatosComision;
  docentes: Usuario[];
  calendarioBloqueado?: boolean;
  textoBoton: string;
  alGuardar: (datos: DatosComision) => Promise<void>;
}) {
  const [d, setD] = useState<DatosComision>(inicial);
  const [problema, setProblema] = useState('');
  const [ocupado, setOcupado] = useState(false);

  function alternarDia(dia: number) {
    setD({ ...d, diasSemana: d.diasSemana.includes(dia) ? d.diasSemana.filter((x) => x !== dia) : [...d.diasSemana, dia].sort() });
  }

  async function enviar(ev: FormEvent) {
    ev.preventDefault();
    setProblema('');
    if (d.diasSemana.length === 0) { setProblema('Elegí entre 1 y 5 días de práctica'); return; }
    if (!d.docenteId) { setProblema('Elegí el docente a cargo'); return; }
    setOcupado(true);
    try { await alGuardar(d); } catch (e) { setProblema(mensaje(e, 'No se pudo guardar la comisión')); } finally { setOcupado(false); }
  }

  return (
    <form className="formulario" onSubmit={enviar}>
      <Aviso>{problema}</Aviso>
      {calendarioBloqueado && (
        <Aviso tipo="info">La comisión ya empezó: sus días, fechas y horas por jornada no se pueden modificar. Podés cambiar el nombre y el docente.</Aviso>
      )}
      <div className="fila">
        <div className="campo">
          <label htmlFor="com-nombre">Nombre</label>
          <input id="com-nombre" required minLength={3} maxLength={80} placeholder="Ej.: 6° 2° Computación — PP 2026" value={d.nombre}
            onChange={(e) => setD({ ...d, nombre: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="com-docente">Docente a cargo</label>
          <select id="com-docente" required value={d.docenteId || ''} onChange={(e) => setD({ ...d, docenteId: Number(e.target.value) })}>
            <option value="" disabled>Elegí un docente</option>
            {docentes.map((u) => <option key={u.id} value={u.id}>{u.apellido}, {u.nombre}</option>)}
          </select>
        </div>
      </div>
      <fieldset className="campo" disabled={calendarioBloqueado} style={{ border: 0, padding: 0, margin: 0 }}>
        <legend className="etiqueta">Días de práctica</legend>
        <div className="casillas">
          {DIAS_SEMANA.map((nombre, i) => (
            <label key={nombre}>
              <input type="checkbox" checked={d.diasSemana.includes(i + 1)} onChange={() => alternarDia(i + 1)} /> {nombre}
            </label>
          ))}
        </div>
      </fieldset>
      <div className="fila">
        <div className="campo">
          <label htmlFor="com-inicio">Fecha de inicio</label>
          <input id="com-inicio" type="date" required max={MAX_FECHA} disabled={calendarioBloqueado} value={d.fechaInicio}
            onChange={(e) => setD({ ...d, fechaInicio: e.target.value })} />
        </div>
        <div className="campo">
          <label htmlFor="com-fin">Fecha de fin</label>
          <input id="com-fin" type="date" required min={d.fechaInicio || undefined} max={MAX_FECHA} disabled={calendarioBloqueado} value={d.fechaFin}
            onChange={(e) => setD({ ...d, fechaFin: e.target.value })} />
          <small>Como máximo 270 días después del inicio.</small>
        </div>
        <div className="campo">
          <label htmlFor="com-horas">Horas por jornada</label>
          <select id="com-horas" disabled={calendarioBloqueado} value={d.horasJornada} onChange={(e) => setD({ ...d, horasJornada: Number(e.target.value) })}>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((h) => <option key={h} value={h}>{h} h</option>)}
          </select>
        </div>
      </div>
      <div className="acciones"><button className="boton" type="submit" disabled={ocupado}>{textoBoton}</button></div>
    </form>
  );
}

/** HU3 — Comisiones: lista y alta. */
export function ComisionesAdmin() {
  const { datos, error, cargando, recargar } = useDatos(
    () => Promise.all([api.get<Comision[]>('/comisiones'), api.get<Usuario[]>('/docentes')]),
    [],
  );
  const [creando, setCreando] = useState(false);
  const [exito, setExito] = useState('');

  if (cargando && !datos) return <Cargando />;
  if (!datos) return <Aviso>{error}</Aviso>;
  const [comisiones, docentes] = datos;

  async function crear(d: DatosComision) {
    const nueva = await api.post<Comision>('/comisiones', d);
    setCreando(false);
    setExito(`Se creó la comisión «${nueva.nombre}». Código de inscripción: ${nueva.codigoInscripcion}`);
    await recargar();
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Comisiones</h1>
          <p className="subtitulo">Cada comisión tiene su calendario de práctica, su docente a cargo y un código para que se inscriban los estudiantes.</p>
        </div>
        {!creando && <button className="boton" onClick={() => { setCreando(true); setExito(''); }}>Nueva comisión</button>}
      </div>
      <Aviso>{error}</Aviso>
      <Aviso tipo="exito">{exito}</Aviso>
      {creando && (
        <Tarjeta titulo="Nueva comisión" acciones={<button className="boton-enlace" onClick={() => setCreando(false)}>Cancelar</button>}>
          {docentes.length === 0
            ? <Aviso tipo="alerta">Primero <Link to="/admin/docentes">creá un docente</Link> para poder asignarlo.</Aviso>
            : <FormularioComision docentes={docentes} textoBoton="Crear comisión" alGuardar={crear} />}
        </Tarjeta>
      )}
      <Tarjeta>
        {comisiones.length === 0 ? <Vacio>Todavía no hay comisiones.</Vacio> : (
          <div className="tabla-contenedor">
            <table>
              <thead><tr><th>Nombre</th><th>Docente</th><th>Calendario</th><th>Código</th><th aria-label="Acciones" /></tr></thead>
              <tbody>
                {comisiones.map((c) => (
                  <tr key={c.id}>
                    <td>{c.nombre}</td>
                    <td>{c.docente ? `${c.docente.nombre} ${c.docente.apellido}` : '—'}</td>
                    <td>{diasDeSemana(c.diasSemana)} · {c.horasJornada} h<br /><small className="subtitulo">{fechaCorta(c.fechaInicio)} al {fechaCorta(c.fechaFin)}</small></td>
                    <td><span className="codigo">{c.codigoInscripcion}</span></td>
                    <td><Link className="boton boton-secundario boton-chico" to={`/admin/comisiones/${c.id}`}>Editar</Link></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Tarjeta>
    </>
  );
}

/** HU3 y HU6 — Editar una comisión, sus recesos y ver sus estudiantes. */
export function ComisionAdmin() {
  const id = Number(useParams().id);
  const { datos, error, cargando, setDatos } = useDatos(
    () => Promise.all([api.get<Comision>(`/comisiones/${id}`), api.get<Usuario[]>('/docentes'), api.get<Resumen[]>(`/comisiones/${id}/estudiantes`)]),
    [id],
  );
  const [exito, setExito] = useState('');

  if (cargando && !datos) return <Cargando />;
  if (!datos) return <Aviso>{error}</Aviso>;
  const [c, docentes, estudiantes] = datos;

  async function guardar(d: DatosComision) {
    setExito('');
    const actualizada = await api.patch<Comision>(`/comisiones/${id}`, d);
    setDatos([actualizada, docentes, estudiantes]);
    setExito('Los cambios se guardaron.');
  }

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>{c.nombre}</h1>
          <p className="subtitulo">Código de inscripción: <span className="codigo">{c.codigoInscripcion}</span></p>
        </div>
        <Link to="/admin">← Comisiones</Link>
      </div>
      <Aviso tipo="exito">{exito}</Aviso>
      <Tarjeta titulo="Datos de la comisión">
        <FormularioComision
          key={`${c.id}-${c.nombre}-${c.docenteId}`}
          inicial={{ nombre: c.nombre, diasSemana: c.diasSemana, fechaInicio: c.fechaInicio, fechaFin: c.fechaFin, horasJornada: c.horasJornada, docenteId: c.docenteId }}
          docentes={docentes}
          calendarioBloqueado={hoyArgentina() >= c.fechaInicio}
          textoBoton="Guardar cambios"
          alGuardar={guardar}
        />
      </Tarjeta>
      <Recesos comisionId={c.id} />
      <Tarjeta titulo={`Estudiantes (${estudiantes.length})`}>
        <TablaEstudiantes estudiantes={estudiantes} />
      </Tarjeta>
    </>
  );
}

/** HU4 — Docentes: lista y alta (RN4). */
export function DocentesAdmin() {
  const { datos, error, cargando, recargar } = useDatos(() => api.get<Usuario[]>('/docentes'), []);
  const [d, setD] = useState({ nombre: '', apellido: '', email: '', password: '' });
  const [problema, setProblema] = useState('');
  const [exito, setExito] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function crear(ev: FormEvent) {
    ev.preventDefault();
    setProblema('');
    setExito('');
    setOcupado(true);
    try {
      const nuevo = await api.post<Usuario>('/docentes', d);
      setExito(`Se creó la cuenta de ${nuevo.nombre} ${nuevo.apellido}. Pasale su email y la contraseña inicial.`);
      setD({ nombre: '', apellido: '', email: '', password: '' });
      await recargar();
    } catch (e) {
      setProblema(mensaje(e, 'No se pudo crear el docente'));
    } finally {
      setOcupado(false);
    }
  }

  return (
    <>
      <div className="encabezado"><h1>Docentes</h1></div>
      <Tarjeta titulo="Nuevo docente">
        <form className="formulario" onSubmit={crear}>
          <Aviso>{problema}</Aviso>
          <Aviso tipo="exito">{exito}</Aviso>
          <div className="fila">
            <div className="campo"><label htmlFor="doc-nombre">Nombre</label>
              <input id="doc-nombre" required minLength={2} maxLength={60} value={d.nombre} onChange={(e) => setD({ ...d, nombre: e.target.value })} /></div>
            <div className="campo"><label htmlFor="doc-apellido">Apellido</label>
              <input id="doc-apellido" required minLength={2} maxLength={60} value={d.apellido} onChange={(e) => setD({ ...d, apellido: e.target.value })} /></div>
          </div>
          <div className="fila">
            <div className="campo"><label htmlFor="doc-email">Email</label>
              <input id="doc-email" type="email" required value={d.email} onChange={(e) => setD({ ...d, email: e.target.value })} /></div>
            <div className="campo"><label htmlFor="doc-password">Contraseña inicial</label>
              <input id="doc-password" type="password" required minLength={8} maxLength={72} autoComplete="new-password" value={d.password}
                onChange={(e) => setD({ ...d, password: e.target.value })} />
              <small>Al menos 8 caracteres, con una letra y un número.</small></div>
          </div>
          <div className="acciones"><button className="boton" type="submit" disabled={ocupado}>Crear docente</button></div>
        </form>
      </Tarjeta>
      <Tarjeta titulo={`Docentes (${datos?.length ?? 0})`}>
        <Aviso>{error}</Aviso>
        {cargando && !datos ? <Cargando /> : datos?.length === 0 ? <Vacio>Todavía no hay docentes.</Vacio> : (
          <ul className="lista">
            {datos?.map((u) => (
              <li key={u.id} className="item">
                <div><div className="item-titulo">{u.apellido}, {u.nombre}</div><div className="item-detalle">{u.email}</div></div>
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}

/** HU5 — Feriados (RN9, RN10): los carga solo la administración y valen para todas las comisiones. */
export function FeriadosAdmin() {
  const hoy = hoyArgentina();
  const { datos, error, cargando, recargar } = useDatos(() => api.get<DiaNoLaborable[]>('/dias-no-laborables'), []);
  const [fecha, setFecha] = useState('');
  const [motivo, setMotivo] = useState('');
  const [verPasados, setVerPasados] = useState(false);
  const [problema, setProblema] = useState('');
  const [ocupado, setOcupado] = useState(false);

  async function ejecutar(accion: () => Promise<unknown>) {
    setOcupado(true);
    setProblema('');
    try { await accion(); await recargar(); return true; } catch (e) { setProblema(mensaje(e, 'No se pudo guardar el feriado')); return false; } finally { setOcupado(false); }
  }

  async function agregar(ev: FormEvent) {
    ev.preventDefault();
    if (await ejecutar(() => api.post('/dias-no-laborables', { fecha, motivo, tipo: 'FERIADO' }))) { setFecha(''); setMotivo(''); }
  }

  function quitar(dia: DiaNoLaborable) {
    if (window.confirm(`¿Quitar el feriado del ${fechaConDia(dia.fecha)}?`)) ejecutar(() => api.borrar(`/dias-no-laborables/${dia.id}`));
  }

  const feriados = (datos ?? []).filter((d) => d.tipo === 'FERIADO').sort((a, b) => a.fecha.localeCompare(b.fecha));
  const visibles = verPasados ? feriados : feriados.filter((d) => d.fecha >= hoy);

  return (
    <>
      <div className="encabezado">
        <div>
          <h1>Feriados</h1>
          <p className="subtitulo">Los feriados no cuentan como días de práctica en ninguna comisión. Se cargan y se quitan solo desde hoy en adelante.</p>
        </div>
      </div>
      <Tarjeta titulo="Agregar feriado">
        <form className="fila" onSubmit={agregar} style={{ alignItems: 'end' }}>
          <div className="campo"><label htmlFor="fer-fecha">Fecha</label>
            <input id="fer-fecha" type="date" required min={hoy} max={MAX_FECHA} value={fecha} onChange={(e) => setFecha(e.target.value)} /></div>
          <div className="campo"><label htmlFor="fer-motivo">Motivo</label>
            <input id="fer-motivo" required minLength={3} maxLength={80} placeholder="Ej.: Día de la Soberanía Nacional" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></div>
          <button className="boton" type="submit" disabled={ocupado}>Agregar feriado</button>
        </form>
      </Tarjeta>
      <Tarjeta titulo={verPasados ? 'Todos los feriados' : 'Próximos feriados'}
        acciones={<button className="boton-enlace" onClick={() => setVerPasados(!verPasados)}>{verPasados ? 'Ver solo los próximos' : 'Ver también los pasados'}</button>}>
        <Aviso>{error || problema}</Aviso>
        {cargando && !datos ? <Cargando /> : visibles.length === 0 ? <Vacio>No hay feriados para mostrar.</Vacio> : (
          <ul className="lista">
            {visibles.map((d) => (
              <li key={d.id} className="item">
                <div><div className="item-titulo">{fechaConDia(d.fecha)} de {d.fecha.slice(0, 4)}</div><div className="item-detalle">{d.motivo}</div></div>
                {d.fecha >= hoy && <button className="boton boton-peligro boton-chico" disabled={ocupado} onClick={() => quitar(d)}>Quitar</button>}
              </li>
            ))}
          </ul>
        )}
      </Tarjeta>
    </>
  );
}
