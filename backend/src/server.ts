import { prepararServidor } from './arranque';

prepararServidor()
  .then(({ app, pool, puerto }) => {
    const servidor = app.listen(puerto, () => console.log(`CampoLog API escuchando en el puerto ${puerto}`));
    const apagar = () => servidor.close(() => pool.end().finally(() => process.exit(0)));
    process.on('SIGTERM', apagar);
    process.on('SIGINT', apagar);
  })
  .catch((error: Error) => {
    // Solo el mensaje: nunca se imprimen variables de entorno ni cadenas de conexión.
    console.error(`No se pudo iniciar CampoLog: ${error.message}`);
    process.exit(1);
  });
