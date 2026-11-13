import { RequestHandler } from 'express';
import type { Servicios } from '../app';
import { usuarioDe } from '../middlewares/autenticacion';
import { idDeRuta } from './parametros';

export function controladorEntradas({ entradas }: Servicios) {
  const crear: RequestHandler = async (req, res) => {
    res.status(201).json(await entradas.crear(usuarioDe(res), req.body));
  };
  const listarPropias: RequestHandler = async (req, res) => {
    res.json(await entradas.listarDeEstudiante(usuarioDe(res).id, req.query));
  };
  const obtener: RequestHandler = async (req, res) => {
    res.json(await entradas.obtener(usuarioDe(res), idDeRuta(req.params.id, 'Entrada')));
  };
  const editar: RequestHandler = async (req, res) => {
    res.json(await entradas.editar(usuarioDe(res), idDeRuta(req.params.id, 'Entrada'), req.body));
  };
  const borrar: RequestHandler = async (req, res) => {
    await entradas.borrar(usuarioDe(res), idDeRuta(req.params.id, 'Entrada'), req.query);
    res.status(204).end();
  };
  return { crear, listarPropias, obtener, editar, borrar };
}
