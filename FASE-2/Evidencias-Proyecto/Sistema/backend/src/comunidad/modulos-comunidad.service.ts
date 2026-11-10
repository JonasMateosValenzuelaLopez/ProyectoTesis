import { ForbiddenException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { aplicarCambioModulo } from '../redes-vecinales/cambiar-modulo';
import { Modulo } from '../redes-vecinales/entities/modulo.entity';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';

export const MODULOS_SOLO_PLATAFORMA: readonly CodigoModulo[] = [
  CodigoModulo.ADMINISTRADOR_EXTERNO,
];

export const MENSAJE_MODULO_SOLO_PLATAFORMA =
  'Este módulo solo lo cambia el equipo EntreCasas';

@Injectable()
export class ModulosComunidadService {
  constructor(
    @InjectRepository(Modulo)
    private readonly modulosRepository: Repository<Modulo>,
    @InjectRepository(RedModulo)
    private readonly redModulosRepository: Repository<RedModulo>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
  ) {}

  async listar(idRed: number) {
    const [catalogo, activos] = await Promise.all([
      this.modulosRepository.find({ order: { codigo: 'ASC' } }),
      this.redModulosRepository.find({ where: { idRed, activo: true } }),
    ]);
    const encendidos = new Set(activos.map((modulo) => modulo.codigoModulo));
    return catalogo.map((modulo) => ({
      codigo: modulo.codigo,
      nombre: modulo.nombre,
      descripcion: modulo.descripcion,
      activo: encendidos.has(modulo.codigo),
      editable: !MODULOS_SOLO_PLATAFORMA.includes(modulo.codigo),
    }));
  }

  async cambiar(
    idRed: number,
    idUsuario: number,
    codigoModulo: CodigoModulo,
    activo: boolean,
  ) {
    if (MODULOS_SOLO_PLATAFORMA.includes(codigoModulo)) {
      throw new ForbiddenException(MENSAJE_MODULO_SOLO_PLATAFORMA);
    }
    const cambio = await this.dataSource.transaction(async (manager) => {
      await manager.findOne(RedVecinal, {
        where: { idRed },
        lock: { mode: 'pessimistic_write' },
      });
      const aplicado = await aplicarCambioModulo(
        manager,
        idRed,
        codigoModulo,
        activo,
        idUsuario,
      );
      if (aplicado) {
        await this.bitacoraService.registrar(
          {
            ambito: AmbitoBitacora.COMUNIDAD,
            idRed,
            idUsuario,
            accion: activo ? 'activar_modulo' : 'desactivar_modulo',
            entidad: 'red_modulos',
            detalle: { modulo: codigoModulo },
          },
          manager,
        );
      }
      return aplicado;
    });
    if (cambio) {
      await this.bitacoraService.marcarActividad(idRed);
    }
    return this.listar(idRed);
  }
}
