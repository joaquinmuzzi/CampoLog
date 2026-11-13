import { Navigate, Route, Routes } from 'react-router-dom';
import { Diseno } from './componentes/Diseno';
import { RutaProtegida } from './componentes/RutaProtegida';
import { Cargando } from './componentes/comunes';
import { Login } from './paginas/Login';
import { Registro } from './paginas/Registro';
import { CarpetaEstudiante, ComisionDocente, MisComisiones, RevisarEntrada } from './paginas/docente/Docente';
import { CalendarioEstudiante } from './paginas/estudiante/Calendario';
import { EntradaFormulario } from './paginas/estudiante/EntradaFormulario';
import { InicioEstudiante } from './paginas/estudiante/Inicio';
import { MisEntradas } from './paginas/estudiante/MisEntradas';
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
        <Route path="/estudiante" element={<InicioEstudiante />} />
        <Route path="/estudiante/calendario" element={<CalendarioEstudiante />} />
        <Route path="/estudiante/entradas" element={<MisEntradas />} />
        <Route path="/estudiante/entradas/nueva" element={<EntradaFormulario />} />
        <Route path="/estudiante/entradas/:id" element={<EntradaFormulario />} />
      </Route>

      <Route element={<RutaProtegida roles={['DOCENTE']}><Diseno /></RutaProtegida>}>
        <Route path="/docente" element={<MisComisiones />} />
        <Route path="/docente/comisiones/:id" element={<ComisionDocente />} />
        <Route path="/docente/estudiantes/:id" element={<CarpetaEstudiante />} />
        <Route path="/docente/entradas/:id" element={<RevisarEntrada />} />
      </Route>

      <Route element={<RutaProtegida roles={['ADMIN']}><Diseno /></RutaProtegida>}>
        <Route path="/admin" element={<Proximamente titulo="Comisiones" />} />
      </Route>

      <Route path="*" element={<Raiz />} />
    </Routes>
  );
}
