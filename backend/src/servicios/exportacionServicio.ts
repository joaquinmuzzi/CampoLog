import { generarCsvCarpeta, nombreDeArchivo } from '../dominio/csv';
import { Usuario } from '../dominio/tipos';
import { Repos } from '../repositorios/tipos';

/** HU15 — Exportar la carpeta validada (RN28). Los permisos se controlan antes (RN24). */
export class ExportacionServicio {
  constructor(private readonly repos: Repos) {}

  async carpeta(estudiante: Usuario): Promise<{ nombreArchivo: string; contenido: string }> {
    const entradas = await this.repos.entradas.todasDeEstudiante(estudiante.id);
    return { nombreArchivo: nombreDeArchivo(estudiante.apellido, estudiante.nombre), contenido: generarCsvCarpeta(entradas) };
  }
}
