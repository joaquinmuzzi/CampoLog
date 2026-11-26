import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Rol } from '../api/tipos';
import { inicioDe, useSesion } from '../sesion/Sesion';
import { Aviso } from './comunes';

// Modo demo (GitHub Pages): entrar con un clic con cualquiera de los tres roles, sin escribir contraseñas.
const ROLES: { rol: Rol; email: string; titulo: string; detalle: string }[] = [
  { rol: 'ESTUDIANTE', email: 'ana@campolog.demo', titulo: 'Estudiante', detalle: 'Ana Pérez: pendientes, calendario, cargar y enviar jornadas, corregir una observada, exportar CSV.' },
  { rol: 'DOCENTE', email: 'docente@campolog.demo', titulo: 'Docente', detalle: 'Laura Gómez: estudiantes en riesgo, validar u observar entradas, cargar recesos.' },
  { rol: 'ADMIN', email: 'admin@campolog.demo', titulo: 'Administración', detalle: 'Crear comisiones y docentes, y administrar los feriados.' },
];

function useEntrarDemo() {
  const { iniciar } = useSesion();
  const navegar = useNavigate();
  const [entrando, setEntrando] = useState<Rol | null>(null);
  const [error, setError] = useState('');

  async function entrar(rol: Rol) {
    const cuenta = ROLES.find((r) => r.rol === rol)!;
    setError('');
    setEntrando(rol);
    try {
      const { sesionDemo } = await import('@campolog/demo');
      const sesion = await sesionDemo(cuenta.email);
      await iniciar(sesion);
      navegar(inicioDe(sesion.usuario.rol), { replace: true });
    } catch {
      setError('No se pudo abrir la demo. Recargá la página e intentá de nuevo.');
    } finally {
      setEntrando(null);
    }
  }
  return { entrar, entrando, error };
}

/** Tarjeta de la pantalla de inicio de sesión: elegir un rol y entrar directo. */
export function AccesoDemo() {
  const { entrar, entrando, error } = useEntrarDemo();
  return (
    <section className="tarjeta demo-acceso">
      <h1>Probá la demo</h1>
      <p className="subtitulo">Sin cuenta y sin contraseña: elegí un rol. Los datos son de ejemplo, viven solo en tu navegador y se reinician al recargar.</p>
      <Aviso>{error}</Aviso>
      <div className="demo-roles">
        {ROLES.map((r) => (
          <button key={r.rol} className="demo-rol" disabled={entrando !== null} onClick={() => entrar(r.rol)}>
            <strong>{entrando === r.rol ? 'Entrando…' : `Entrar como ${r.titulo.toLowerCase()}`}</strong>
            <span>{r.detalle}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Franja sobre la barra en el modo demo: aviso y cambio de rol. */
export function BarraDemo({ rol }: { rol: Rol }) {
  const { entrar, entrando } = useEntrarDemo();
  return (
    <div className="demo-barra" role="note">
      <span><strong>Modo demo</strong> · datos de ejemplo que se reinician al recargar la página</span>
      <label>
        Ver como{' '}
        <select value={entrando ?? rol} disabled={entrando !== null} onChange={(e) => entrar(e.target.value as Rol)}>
          {ROLES.map((r) => <option key={r.rol} value={r.rol}>{r.titulo}</option>)}
        </select>
      </label>
    </div>
  );
}
