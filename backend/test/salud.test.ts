import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { crearApp } from '../src/app';

describe('T01 — /api/salud', () => {
  it('responde 200 con estado ok', async () => {
    const res = await request(crearApp()).get('/api/salud');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ estado: 'ok' });
  });
});
