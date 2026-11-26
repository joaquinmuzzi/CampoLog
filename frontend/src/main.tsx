import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { ProveedorSesion } from './sesion/Sesion';
import './estilos.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* En GitHub Pages la app vive en /CampoLog/ (base de Vite); en Railway o en local, en la raíz. */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/+$/, '')}>
      <ProveedorSesion>
        <App />
      </ProveedorSesion>
    </BrowserRouter>
  </StrictMode>,
);
