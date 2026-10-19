import { PartialType } from '@nestjs/mapped-types';
import { CreateUnidadeDto } from './create-unidad.dto';

export class UpdateUnidadeDto extends PartialType(CreateUnidadeDto) {}
