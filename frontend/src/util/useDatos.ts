import { DependencyList, useCallback, useEffect, useState } from 'react';
import { ErrorApi } from '../api/cliente';

/** Carga datos de la API y expone su estado (cargando, error) y una función para recargar. */
export function useDatos<T>(cargar: () => Promise<T>, dependencias: DependencyList) {
  const [datos, setDatos] = useState<T | null>(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const recargar = useCallback(async () => {
    setCargando(true);
    setError('');
    try {
      setDatos(await cargar());
    } catch (e) {
      setError(e instanceof ErrorApi ? e.message : 'No se pudieron cargar los datos');
    } finally {
      setCargando(false);
    }
  }, dependencias);

  useEffect(() => { recargar(); }, [recargar]);
  return { datos, error, cargando, recargar, setDatos };
}
