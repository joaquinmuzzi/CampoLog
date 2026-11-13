import { crearApp } from './app';

const puerto = Number(process.env.PORT ?? 3000);
crearApp().listen(puerto, () => {
  console.log(`CampoLog API escuchando en el puerto ${puerto}`);
});
