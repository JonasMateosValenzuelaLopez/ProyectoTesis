import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { MisDatosService } from './mis-datos.service';

export const ESPERA_INICIAL_MS = 60 * 1000;
export const INTERVALO_MS = 60 * 60 * 1000;

@Injectable()
export class TareaCambiosCorreo
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TareaCambiosCorreo.name);
  private inicial?: NodeJS.Timeout;
  private periodica?: NodeJS.Timeout;
  private enCurso = false;

  constructor(private readonly misDatosService: MisDatosService) {}

  onApplicationBootstrap() {
    this.inicial = setTimeout(() => void this.ejecutar(), ESPERA_INICIAL_MS);
    this.periodica = setInterval(() => void this.ejecutar(), INTERVALO_MS);
    this.inicial.unref();
    this.periodica.unref();
  }

  onApplicationShutdown() {
    clearTimeout(this.inicial);
    clearInterval(this.periodica);
  }

  async ejecutar() {
    if (this.enCurso) {
      return;
    }
    this.enCurso = true;
    try {
      const anulados = await this.misDatosService.anularVencidos();
      if (anulados) {
        this.logger.log(
          `Pedidos de cambio de correo vencidos anulados: ${anulados}`,
        );
      }
    } catch (error) {
      this.logger.error(
        'No se pudieron anular los pedidos de cambio de correo vencidos; se reintentará en la próxima ejecución',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.enCurso = false;
    }
  }
}
