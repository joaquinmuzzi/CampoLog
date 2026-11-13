import express from 'express';
import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { crearApp } from '../src/app';
import { ErrorNegocio } from '../src/errores';
import { manejarErrores } from '../src/middlewares/errores';

function appDePrueba() {
  const app = express();
  app.use(express.json());
  app.get('/negocio', () => { throw new ErrorNegocio(409, 'Ya existe una entrada para ese día', { version: 3 }); });
  app.post('/zod', (req) => { z.object({ actividad: z.string().min(5, { error: 'La actividad tiene que tener entre 5 y 120 caracteres' }) }).parse(req.body); });
  app.get('/interno', () => { throw new Error('connect ECONNREFUSED 10.0.0.1:5432'); });
  app.use(manejarErrores);
  return app;
}

describe('T03 — errores de negocio', () => {
  it('responde el status y el mensaje de un ErrorNegocio, con detalle', async () => {
    const res = await request(appDePrueba()).get('/negocio');
    expect(res.status).toBe(409);
    expect(res.body).toEqual({ error: 'Ya existe una entrada para ese día', detalle: { version: 3 } });
  });

  it('traduce un error de validación de zod a 400 con el mensaje en español', async () => {
    const res = await request(appDePrueba()).post('/zod').send({ actividad: 'abc' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('La actividad tiene que tener entre 5 y 120 caracteres');
  });

  it('un error interno responde 500 genérico y no filtra el mensaje interno', async () => {
    const espia = vi.spyOn(console, 'error').mockImplementation(() => {});
    const res = await request(appDePrueba()).get('/interno');
    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Ocurrió un error inesperado. Intentá de nuevo en unos minutos.');
    expect(JSON.stringify(res.body)).not.toContain('ECONNREFUSED');
    espia.mockRestore();
  });

  it('un JSON mal formado responde 400', async () => {
    const res = await request(crearApp()).post('/api/salud').set('Content-Type', 'application/json').send('{malo');
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('El cuerpo del pedido no es un JSON válido');
  });

  it('una ruta de la API que no existe responde 404', async () => {
    const res = await request(crearApp()).get('/api/no-existe');
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Recurso no encontrado');
  });
});
