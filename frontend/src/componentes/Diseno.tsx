import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Rol } from '../api/tipos';
import { useSesion } from '../sesion/Sesion';

const MENU: Record<Rol, { a: string; texto: string; fin?: boolean }[]> = {
  ESTUDIANTE: [
    { a: '/estudiante', texto: 'Inicio', fin: true },
    { a: '/estudiante/calendario', texto: 'Calendario' },
    { a: '/estudiante/entradas', texto: 'Mis entradas' },
  ],
  DOCENTE: [{ a: '/docente', texto: 'Mis comisiones' }],
  ADMIN: [
    { a: '/admin', texto: 'Comisiones', fin: true },
    { a: '/admin/docentes', texto: 'Docentes' },
    { a: '/admin/feriados', texto: 'Feriados' },
  ],
};

const NOMBRE_ROL: Record<Rol, string> = { ESTUDIANTE: 'Estudiante', DOCENTE: 'Docente', ADMIN: 'Administración' };

export function Diseno() {
  const { usuario, comision, cerrar } = useSesion();
  const navegar = useNavigate();
  if (!usuario) return null;

  return (
    <div className="app">
      <header className="barra">
        <div className="barra-interior">
          <span className="marca" aria-label="CampoLog">Campo<strong>Log</strong></span>
          <nav className="menu" aria-label="Principal">
            {MENU[usuario.rol].map((item) => (
              <NavLink key={item.a} to={item.a} end={item.fin} className={({ isActive }) => (isActive ? 'activo' : undefined)}>
                {item.texto}
              </NavLink>
            ))}
          </nav>
          <div className="usuario">
            <span className="usuario-nombre">{usuario.nombre} {usuario.apellido}</span>
            <span className="usuario-rol">{NOMBRE_ROL[usuario.rol]}{comision ? ` · ${comision.nombre}` : ''}</span>
            <button className="boton-enlace" onClick={() => { cerrar(); navegar('/login'); }}>Salir</button>
          </div>
        </div>
      </header>
      <main className="contenido">
        <Outlet />
      </main>
    </div>
  );
}
