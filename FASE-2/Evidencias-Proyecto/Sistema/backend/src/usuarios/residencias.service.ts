import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente, fechaHoy } from '../common/utils/vigencia';
import { Residencia } from './entities/residencia.entity';

@Injectable()
export class ResidenciasService {
  constructor(
    @InjectRepository(Residencia)
    private readonly residenciasRepository: Repository<Residencia>,
  ) {}

  async marcarGuiaVista(
    idResidencia: number,
    idUsuario: number,
    red: ContextoRed,
  ): Promise<void> {
    if (red.idsUnidades.length === 0) {
      throw new NotFoundException('Residencia no encontrada');
    }
    const propia = {
      idResidencia,
      idUsuario,
      idUnidad: In(red.idsUnidades),
      fechaEliminacion: IsNull(),
      ...condicionVigente(fechaHoy()),
    };

    const { affected } = await this.residenciasRepository.update(
      { ...propia, fechaGuiaVista: IsNull() },
      { fechaGuiaVista: new Date() },
    );
    if (affected) {
      return;
    }
    if (!(await this.residenciasRepository.exists({ where: propia }))) {
      throw new NotFoundException('Residencia no encontrada');
    }
  }
}
