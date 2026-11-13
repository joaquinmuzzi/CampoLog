import { Navigate, Route, Routes } from 'react-router-dom';
import { Diseno } from './componentes/Diseno';
import { RutaProtegida } from './componentes/RutaProtegida';
import { Cargando } from './componentes/comunes';
import { Login } from './paginas/Login';
import { Registro } from './paginas/Registro';
import { inicioDe, useSesion } from './sesion/Sesion';

function Proximamente({ titulo }: { titulo: string }) {
  return <h1>{titulo}</h1>;
}

function Raiz() {
  const { usuario, cargando } = useSesion();
  if (cargando) return <Cargando />;
  return <Navigate to={usuario ? inicioDe(usuario.rol) : '/login'} replace />;
}

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Raiz />} />
      <Route path="/login" element={<Login />} />
      <Route path="/registro" element={<Registro />} />

      <Route element={<RutaProtegida roles={['ESTUDIANTE']}><Diseno /></RutaProtegida>}>
        <Route path="/estudiante" element={<Proximamente titulo="Inicio" />} />
      </Route>

      <Route element={<RutaProtegida roles={['DOCENTE']}><Diseno /></RutaProtegida>}>
        <Route path="/docente" element={<Proximamente titulo="Mis comisiones" />} />
      </Route>

      <Route element={<RutaProtegida roles={['ADMIN']}><Diseno /></RutaProtegida>}>
        <Route path="/admin" element={<Proximamente titulo="Comisiones" />} />
      </Route>

      <Route path="*" element={<Raiz />} />
    </Routes>
  );
}
