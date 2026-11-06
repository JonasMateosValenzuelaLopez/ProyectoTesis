import { BadRequestException, ConflictException } from '@nestjs/common';
import { EntityManager, In, Repository } from 'typeorm';
import { condicionVigente } from '../common/utils/vigencia';
import { Residencia } from '../usuarios/entities/residencia.entity';
import {
  EstadoReporte,
  LugarPublicacion,
  MuroReporte,
} from './entities/muro-reporte.entity';

export interface NuevoReporte {
  idRed: number;
  lugar: LugarPublicacion;
  idPublicacion: number;
  idAutor: number;
  idUsuario: number;
  motivo: string;
}

export async function registrarReporte(
  reportesRepository: Repository<MuroReporte>,
  reporte: NuevoReporte,
) {
  if (reporte.idAutor === reporte.idUsuario) {
    throw new BadRequestException('No puedes reportar tu propia publicación');
  }
  const yaReportada = await reportesRepository.exists({
    where: {
      tipoPublicacion: reporte.lugar,
      idPublicacion: reporte.idPublicacion,
      idUsuario: reporte.idUsuario,
    },
    withDeleted: true,
  });
  if (yaReportada) {
    throw new ConflictException('Ya reportaste esta publicación');
  }
  const { identifiers } = await reportesRepository.insert({
    idRed: reporte.idRed,
    tipoPublicacion: reporte.lugar,
    idPublicacion: reporte.idPublicacion,
    idUsuario: reporte.idUsuario,
    motivo: reporte.motivo,
  });
  return { idReporte: identifiers[0].idReporte as number };
}

export async function idsReportadasPor(
  reportesRepository: Repository<MuroReporte>,
  lugar: LugarPublicacion,
  ids: number[],
  idUsuario: number,
): Promise<Set<number>> {
  if (ids.length === 0) {
    return new Set();
  }
  const reportes = await reportesRepository.find({
    select: { idPublicacion: true },
    where: { tipoPublicacion: lugar, idPublicacion: In(ids), idUsuario },
    withDeleted: true,
  });
  return new Set(reportes.map((r) => r.idPublicacion));
}

export async function resolverReportesPendientes(
  manager: EntityManager,
  lugar: LugarPublicacion,
  idPublicacion: number,
  estado: EstadoReporte.ATENDIDO | EstadoReporte.DESCARTADO,
  idUsuario: number,
  ahora: Date,
) {
  const { affected } = await manager.update(
    MuroReporte,
    { tipoPublicacion: lugar, idPublicacion, estado: EstadoReporte.PENDIENTE },
    { estado, resueltoPor: idUsuario, resueltoEn: ahora },
  );
  return affected ?? 0;
}

export async function reportesPendientesDe(
  manager: EntityManager,
  lugar: LugarPublicacion,
  ids: number[],
): Promise<MuroReporte[]> {
  if (ids.length === 0) {
    return [];
  }
  return manager.find(MuroReporte, {
    where: {
      tipoPublicacion: lugar,
      idPublicacion: In(ids),
      estado: EstadoReporte.PENDIENTE,
    },
    order: { idReporte: 'ASC' },
  });
}

export async function viviendasPorUsuario(
  manager: EntityManager,
  idRed: number,
  idsUsuario: number[],
): Promise<Map<number, string>> {
  const viviendaDe = new Map<number, string>();
  if (idsUsuario.length === 0) {
    return viviendaDe;
  }
  const residencias = await manager.find(Residencia, {
    where: {
      idUsuario: In(idsUsuario),
      unidad: { idRed },
      ...condicionVigente(),
    },
    relations: { unidad: true },
    order: { idResidencia: 'ASC' },
  });
  for (const residencia of residencias) {
    if (residencia.unidad && !viviendaDe.has(residencia.idUsuario)) {
      viviendaDe.set(
        residencia.idUsuario,
        residencia.unidad.numeroIdentificador,
      );
    }
  }
  return viviendaDe;
}
