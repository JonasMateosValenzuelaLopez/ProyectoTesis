import { IsBoolean, IsEnum } from 'class-validator';
import { TipoRedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';

export class CambiarModuloDto {
  @IsBoolean({ message: 'activo debe ser true o false' })
  activo: boolean;
}

export class CambiarTipoDto {
  @IsEnum(TipoRedVecinal, {
    message: 'El tipo debe ser Villa, Condominio o Edificio',
  })
  tipo: TipoRedVecinal;
}
