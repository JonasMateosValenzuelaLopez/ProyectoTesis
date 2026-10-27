import { Injectable, Logger } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import {
  AmbitoBitacora,
  BitacoraAuditoria,
} from './entities/bitacora-auditoria.entity';

export type RegistroBitacora =
  | {
      ambito: AmbitoBitacora.COMUNIDAD;
      idRed: number;
      idUsuario: number;
      accion: string;
      entidad: string;
      idEntidad?: number | null;
      detalle?: Record<string, unknown>;
    }
  | {
      ambito: AmbitoBitacora.PLATAFORMA;
      idRed?: number | null;
      idUsuario: number;
      accion: string;
      entidad: string;
      idEntidad?: number | null;
      detalle?: Record<string, unknown>;
    };

@Injectable()
export class BitacoraService {
  private readonly logger = new Logger(BitacoraService.name);

  constructor(private readonly dataSource: DataSource) {}

  async registrar(
    registro: RegistroBitacora,
    manager: EntityManager,
  ): Promise<void> {
    await manager.save(
      manager.create(BitacoraAuditoria, {
        ambito: registro.ambito,
        idRed: registro.idRed ?? null,
        idUsuario: registro.idUsuario,
        accion: registro.accion,
        entidad: registro.entidad,
        idEntidad: registro.idEntidad ?? null,
        detalle: registro.detalle ?? null,
      }),
    );
  }

  async marcarActividad(idRed: number): Promise<void> {
    try {
      await this.dataSource.manager.update(
        RedVecinal,
        { idRed },
        { ultimaActividad: new Date() },
      );
    } catch (error) {
      this.logger.error(
        `No se pudo actualizar la última actividad de la comunidad ${idRed}`,
        error instanceof Error ? error.stack : String(error),
      );
    }
  }
}
