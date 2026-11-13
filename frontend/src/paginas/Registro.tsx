import { ChangeEvent, FormEvent, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { api, ErrorApi } from '../api/cliente';
import { Sesion } from '../api/tipos';
import { Aviso } from '../componentes/comunes';
import { inicioDe, useSesion } from '../sesion/Sesion';

/** HU1 — Registro de estudiantes con el código de inscripción (RN2, RN3). */
export function Registro() {
  const { usuario, iniciar } = useSesion();
  const navegar = useNavigate();
  const [form, setForm] = useState({ nombre: '', apellido: '', email: '', password: '', codigoInscripcion: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (usuario) return <Navigate to={inicioDe(usuario.rol)} replace />;
  const cambiar = (campo: keyof typeof form) => (e: ChangeEvent<HTMLInputElement>) => setForm({ ...form, [campo]: e.target.value });

  async function enviar(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (form.password.length < 8 || !/\d/.test(form.password) || !/[a-zA-Z]/.test(form.password)) {
      setError('La contraseña tiene que tener al menos 8 caracteres, con al menos una letra y un número');
      return;
    }
    setEnviando(true);
    try {
      const sesion = await api.post<Sesion>('/auth/registro', form);
      await iniciar(sesion);
      navegar('/estudiante', { replace: true });
    } catch (err) {
      setError(err instanceof ErrorApi ? err.message : 'No se pudo crear la cuenta');
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="acceso">
      <div className="acceso-caja">
        <div className="acceso-marca">Campo<strong>Log</strong></div>
        <p className="acceso-lema">Creá tu cuenta con el código que te dio tu docente.</p>
        <section className="tarjeta">
          <h1>Crear cuenta de estudiante</h1>
          <Aviso>{error}</Aviso>
          <form className="formulario" onSubmit={enviar}>
            <div className="campo">
              <label htmlFor="codigo">Código de inscripción</label>
              <input id="codigo" required maxLength={6} placeholder="Ej.: DEMO26" value={form.codigoInscripcion}
                onChange={(e) => setForm({ ...form, codigoInscripcion: e.target.value.toUpperCase() })} />
              <small>6 caracteres. Te lo da el docente de tu comisión.</small>
            </div>
            <div className="fila">
              <div className="campo">
                <label htmlFor="nombre">Nombre</label>
                <input id="nombre" required minLength={2} maxLength={60} autoComplete="given-name" value={form.nombre} onChange={cambiar('nombre')} />
              </div>
              <div className="campo">
                <label htmlFor="apellido">Apellido</label>
                <input id="apellido" required minLength={2} maxLength={60} autoComplete="family-name" value={form.apellido} onChange={cambiar('apellido')} />
              </div>
            </div>
            <div className="campo">
              <label htmlFor="email">Email</label>
              <input id="email" type="email" required autoComplete="email" value={form.email} onChange={cambiar('email')} />
            </div>
            <div className="campo">
              <label htmlFor="password">Contraseña</label>
              <input id="password" type="password" required autoComplete="new-password" value={form.password} onChange={cambiar('password')} />
              <small>Al menos 8 caracteres, con una letra y un número.</small>
            </div>
            <button className="boton" type="submit" disabled={enviando}>{enviando ? 'Creando cuenta…' : 'Crear cuenta'}</button>
          </form>
        </section>
        <p className="acceso-pie">¿Ya tenés cuenta? <Link to="/login">Iniciá sesión</Link></p>
      </div>
    </div>
  );
}
