import { Injectable } from '@nestjs/common';
import { CreateRedesVecinaleDto } from './dto/create-red-vecinal.dto';
import { UpdateRedesVecinaleDto } from './dto/update-red-vecinal.dto';

@Injectable()
export class RedesVecinalesService {
  create(createRedesVecinaleDto: CreateRedesVecinaleDto) {
    return 'This action adds a new redesVecinale';
  }

  findAll() {
    return `This action returns all redesVecinales`;
  }

  findOne(id: number) {
    return `This action returns a #${id} redesVecinale`;
  }

  update(id: number, updateRedesVecinaleDto: UpdateRedesVecinaleDto) {
    return `This action updates a #${id} redesVecinale`;
  }

  remove(id: number) {
    return `This action removes a #${id} redesVecinale`;
  }
}
