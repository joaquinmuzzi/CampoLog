import { FormEvent, useState } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { api, ErrorApi } from '../api/cliente';
import { Sesion } from '../api/tipos';
import { Aviso } from '../componentes/comunes';
import { inicioDe, useSesion } from '../sesion/Sesion';

/** HU2 — Iniciar sesión. */
export function Login() {
  const { usuario, iniciar } = useSesion();
  const navegar = useNavigate();
  const ubicacion = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={inicioDe(usuario.rol)} replace />;

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    setEnviando(true);
    try {
      const sesion = await api.post<Sesion>('/auth/login', { email, password });
      await iniciar(sesion);
      const desde = (ubicacion.state as { desde?: string } | null)?.desde;
      navegar(desde ?? inicioDe(sesion.usuario.rol), { replace: true });
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo iniciar sesión');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="acceso">
      <div className="acceso-caja">
        <div className="acceso-marca">Campo<strong>Log</strong></div>
        <p className="acceso-lema">La carpeta de campo de tus Prácticas Profesionalizantes, al día.</p>
        <section className="tarjeta">
          <h1>Iniciar sesión</h1>
          <Aviso>{error}</Aviso>
          <form className="formulario" onSubmit={enviar}>
            <div className="campo">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <button className="boton" type="submit" disabled={enviando}>{enviando ? 'Ingresando…' : 'Ingresar'}</button>
          </form>
        </section>
        <p className="acceso-pie">¿Sos estudiante y todavía no tenés cuenta? <Link to="/registro">Creala con el código de tu comisión</Link></p>
      </div>
    </div>
  );
}
