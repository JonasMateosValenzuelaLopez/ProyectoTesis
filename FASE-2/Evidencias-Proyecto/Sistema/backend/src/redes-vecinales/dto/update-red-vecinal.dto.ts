import { PartialType } from '@nestjs/mapped-types';
import { CreateRedesVecinaleDto } from './create-red-vecinal.dto';

export class UpdateRedesVecinaleDto extends PartialType(
  CreateRedesVecinaleDto,
) {}
