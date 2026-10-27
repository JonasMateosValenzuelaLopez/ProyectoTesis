import { Injectable } from '@nestjs/common';
import { CreateUnidadeDto } from './dto/create-unidad.dto';
import { UpdateUnidadeDto } from './dto/update-unidad.dto';

@Injectable()
export class UnidadesService {
  create(createUnidadeDto: CreateUnidadeDto) {
    return 'This action adds a new unidade';
  }

  findAll() {
    return `This action returns all unidades`;
  }

  findOne(id: number) {
    return `This action returns a #${id} unidade`;
  }

  update(id: number, updateUnidadeDto: UpdateUnidadeDto) {
    return `This action updates a #${id} unidade`;
  }

  remove(id: number) {
    return `This action removes a #${id} unidade`;
  }
}
