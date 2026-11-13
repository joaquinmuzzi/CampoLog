import { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { Rol } from '../api/tipos';
import { inicioDe, useSesion } from '../sesion/Sesion';
import { Cargando } from './comunes';

/** Solo deja pasar a usuarios con sesión y con uno de los roles indicados. */
export function RutaProtegida({ roles, children }: { roles: Rol[]; children: ReactNode }) {
  const { usuario, cargando } = useSesion();
  const ubicacion = useLocation();
  if (cargando) return <Cargando />;
  if (!usuario) return <Navigate to="/login" replace state={{ desde: ubicacion.pathname }} />;
  if (!roles.includes(usuario.rol)) return <Navigate to={inicioDe(usuario.rol)} replace />;
  return <>{children}</>;
}
