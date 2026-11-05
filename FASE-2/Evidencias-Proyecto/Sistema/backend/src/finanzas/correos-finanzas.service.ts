import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { condicionVigente } from '../common/utils/vigencia';
import { CorreoSaliente, MailService } from '../mail/mail.service';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';

export interface Destinatario {
  idUsuario: number;
  nombre: string;
  correo: string;
  idsUnidad: number[];
}

@Injectable()
export class CorreosFinanzasService {
  private readonly logger = new Logger(CorreosFinanzasService.name);

  constructor(private readonly mailService: MailService) {}

  async destinatarios(
    manager: EntityManager,
    idRed: number,
    idsUnidad: number[],
  ): Promise<Destinatario[]> {
    if (idsUnidad.length === 0) {
      return [];
    }
    const [residencias, membresias] = await Promise.all([
      manager.find(Residencia, {
        where: { idUnidad: In(idsUnidad), ...condicionVigente() },
        relations: { usuario: true },
        order: { idResidencia: 'ASC' },
      }),
      manager.find(Membresia, {
        select: { idUsuario: true },
        where: { idRed, activo: true, ...condicionVigente() },
      }),
    ]);
    const conAcceso = new Set(membresias.map((m) => m.idUsuario));
    const porUsuario = new Map<number, Destinatario>();
    for (const residencia of residencias) {
      if (!residencia.usuario || !conAcceso.has(residencia.idUsuario)) {
        continue;
      }
      const actual = porUsuario.get(residencia.idUsuario) ?? {
        idUsuario: residencia.idUsuario,
        nombre: residencia.usuario.nombre,
        correo: residencia.usuario.correo,
        idsUnidad: [],
      };
      actual.idsUnidad.push(residencia.idUnidad);
      porUsuario.set(residencia.idUsuario, actual);
    }
    return [...porUsuario.values()];
  }

  enviarEnSegundoPlano(correos: CorreoSaliente[]) {
    void (async () => {
      for (const correo of correos) {
        await this.mailService.enviar(correo);
      }
    })().catch((error: unknown) =>
      this.logger.error(
        'Falló el envío de correos de finanzas',
        error instanceof Error ? error.stack : String(error),
      ),
    );
  }
}
