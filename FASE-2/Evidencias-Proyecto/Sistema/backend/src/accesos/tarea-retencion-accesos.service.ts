import {
  Injectable,
  Logger,
  OnApplicationBootstrap,
  OnApplicationShutdown,
} from '@nestjs/common';
import { RetencionAccesosService } from './retencion-accesos.service';

export const ESPERA_INICIAL_MS = 60 * 1000;
export const INTERVALO_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class TareaRetencionAccesos
  implements OnApplicationBootstrap, OnApplicationShutdown
{
  private readonly logger = new Logger(TareaRetencionAccesos.name);
  private inicial?: NodeJS.Timeout;
  private diaria?: NodeJS.Timeout;
  private enCurso = false;

  constructor(private readonly retencionService: RetencionAccesosService) {}

  onApplicationBootstrap() {
    this.inicial = setTimeout(() => void this.ejecutar(), ESPERA_INICIAL_MS);
    this.diaria = setInterval(() => void this.ejecutar(), INTERVALO_MS);
    this.inicial.unref();
    this.diaria.unref();
  }

  onApplicationShutdown() {
    clearTimeout(this.inicial);
    clearInterval(this.diaria);
  }

  async ejecutar() {
    if (this.enCurso) {
      return;
    }
    this.enCurso = true;
    try {
      const resultado = await this.retencionService.anonimizarVencidos();
      if (resultado.accesos + resultado.invitaciones + resultado.visitantes) {
        this.logger.log(
          `Datos de visitas anteriores a ${resultado.limite.toISOString()} anonimizados: ${resultado.accesos} accesos, ${resultado.invitaciones} invitaciones, ${resultado.visitantes} visitantes`,
        );
      }
    } catch (error) {
      this.logger.error(
        'No se pudieron anonimizar los datos de visitas vencidos; se reintentará en la próxima ejecución',
        error instanceof Error ? error.stack : String(error),
      );
    } finally {
      this.enCurso = false;
    }
  }
}
