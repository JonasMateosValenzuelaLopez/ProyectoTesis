import { Injectable, Logger } from '@nestjs/common';
import { EntityManager, In } from 'typeorm';
import { condicionVigente } from '../common/utils/vigencia';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import { CorreoSaliente, MailService } from './mail.service';

export interface Destinatario {
  idUsuario: number;
  nombre: string;
  correo: string;
  idsUnidad: number[];
}

@Injectable()
export class CorreosComunidadService {
  private readonly logger = new Logger(CorreosComunidadService.name);

  constructor(private readonly mailService: MailService) {}

  async destinatarios(
    manager: EntityManager,
    idRed: number,
    idsUnidad: number[],
    opciones: { soloTitulares?: boolean } = {},
  ): Promise<Destinatario[]> {
    if (idsUnidad.length === 0) {
      return [];
    }
    const [residencias, membresias] = await Promise.all([
      manager.find(Residencia, {
        where: {
          idUnidad: In(idsUnidad),
          ...condicionVigente(),
          ...(opciones.soloTitulares ? { titular: 1 as const } : {}),
        },
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

  async enviar(correos: CorreoSaliente[]): Promise<number> {
    let enviados = 0;
    for (const correo of correos) {
      if (await this.mailService.enviar(correo)) {
        enviados++;
      }
    }
    return enviados;
  }

  enviarEnSegundoPlano(correos: CorreoSaliente[]) {
    void this.enviar(correos)
      .then((enviados) => {
        if (enviados < correos.length) {
          this.logger.warn(
            `No salieron ${correos.length - enviados} de ${correos.length} correos a la comunidad`,
          );
        }
      })
      .catch((error: unknown) =>
        this.logger.error(
          'Falló el envío de correos a la comunidad',
          error instanceof Error ? error.stack : String(error),
        ),
      );
  }
}
