import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api, configurarAlVencerSesion, token } from '../api/cliente';
import { Comision, Sesion as DatosSesion, Usuario } from '../api/tipos';

interface EstadoSesion {
  usuario: Usuario | null;
  comision: Comision | null;
  cargando: boolean;
  iniciar: (datos: DatosSesion) => Promise<void>;
  cerrar: () => void;
}

const ContextoSesion = createContext<EstadoSesion | null>(null);

export function ProveedorSesion({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [comision, setComision] = useState<Comision | null>(null);
  const [cargando, setCargando] = useState(true);

  const cerrar = useCallback(() => {
    token.borrar();
    setUsuario(null);
    setComision(null);
  }, []);

  const cargarYo = useCallback(async () => {
    const yo = await api.get<{ usuario: Usuario; comision: Comision | null }>('/auth/yo');
    setUsuario(yo.usuario);
    setComision(yo.comision);
  }, []);

  useEffect(() => {
    configurarAlVencerSesion(cerrar);
    if (!token.leer()) { setCargando(false); return; }
    cargarYo().catch(cerrar).finally(() => setCargando(false));
  }, [cargarYo, cerrar]);

  const iniciar = useCallback(async (datos: DatosSesion) => {
    token.guardar(datos.token);
    await cargarYo();
  }, [cargarYo]);

  const valor = useMemo(() => ({ usuario, comision, cargando, iniciar, cerrar }), [usuario, comision, cargando, iniciar, cerrar]);
  return <ContextoSesion.Provider value={valor}>{children}</ContextoSesion.Provider>;
}

export function useSesion(): EstadoSesion {
  const valor = useContext(ContextoSesion);
  if (!valor) throw new Error('useSesion se usa dentro de ProveedorSesion');
  return valor;
}

/** Pantalla de inicio de cada rol. */
export function inicioDe(rol: Usuario['rol']): string {
  return rol === 'ADMIN' ? '/admin' : rol === 'DOCENTE' ? '/docente' : '/estudiante';
}
