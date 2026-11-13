import { ReactNode } from 'react';
import { EstadoEntrada } from '../api/tipos';
import { NOMBRE_ESTADO } from '../util/formato';

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return <p className="cargando" role="status">{texto}</p>;
}

export function Aviso({ tipo = 'error', children }: { tipo?: 'error' | 'exito' | 'info' | 'alerta'; children: ReactNode }) {
  if (!children) return null;
  return <div className={`aviso aviso-${tipo}`} role={tipo === 'error' ? 'alert' : 'status'}>{children}</div>;
}

export function EstadoBadge({ estado }: { estado: EstadoEntrada }) {
  return <span className={`badge badge-${estado.toLowerCase()}`}>{NOMBRE_ESTADO[estado]}</span>;
}

export function Tarjeta({ titulo, children, acciones }: { titulo?: ReactNode; children: ReactNode; acciones?: ReactNode }) {
  return (
    <section className="tarjeta">
      {(titulo || acciones) && (
        <header className="tarjeta-cabecera">
          {titulo && <h2>{titulo}</h2>}
          {acciones && <div className="tarjeta-acciones">{acciones}</div>}
        </header>
      )}
      {children}
    </section>
  );
}

export function Dato({ etiqueta, valor, destacado }: { etiqueta: string; valor: ReactNode; destacado?: 'bien' | 'mal' }) {
  return (
    <div className={`dato ${destacado ? `dato-${destacado}` : ''}`}>
      <span className="dato-valor">{valor}</span>
      <span className="dato-etiqueta">{etiqueta}</span>
    </div>
  );
}

export function Paginacion({ pagina, paginas, alCambiar }: { pagina: number; paginas: number; alCambiar: (p: number) => void }) {
  if (paginas <= 1) return null;
  return (
    <nav className="paginacion" aria-label="Paginación">
      <button className="boton boton-secundario" disabled={pagina <= 1} onClick={() => alCambiar(pagina - 1)}>Anterior</button>
      <span>Página {pagina} de {paginas}</span>
      <button className="boton boton-secundario" disabled={pagina >= paginas} onClick={() => alCambiar(pagina + 1)}>Siguiente</button>
    </nav>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return <p className="vacio">{children}</p>;
}
