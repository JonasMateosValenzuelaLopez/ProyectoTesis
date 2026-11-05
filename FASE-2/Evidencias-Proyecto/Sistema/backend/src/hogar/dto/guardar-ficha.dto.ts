import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';
import {
  normalizarTextoLargo,
  quitarEspacios,
  recortar,
  recortarOpcional,
} from '../../common/utils/texto';
import { EsFecha, NoFutura } from '../../common/validators/fecha.validator';
import { EsTelefono } from '../../common/validators/telefono.validator';
import { TipoFicha } from '../entities/hogar-ficha.entity';
import { CamposFicha, errorCamposSegunTipo } from '../reglas-ficha';

function CamposSegunTipo() {
  return function (objeto: object, propiedad: string) {
    registerDecorator({
      name: 'camposSegunTipo',
      target: objeto.constructor,
      propertyName: propiedad,
      options: {
        message: (args: ValidationArguments) =>
          errorCamposSegunTipo(args.object as CamposFicha) ?? '',
      },
      validator: {
        validate: (_valor: unknown, args: ValidationArguments) =>
          errorCamposSegunTipo(args.object as CamposFicha) === null,
      },
    });
  };
}

export class GuardarFichaDto {
  @IsEnum(TipoFicha, {
    message:
      'El tipo debe ser Pintura, Garantía, Mantención, Medida, Técnico u Otro',
  })
  @CamposSegunTipo()
  tipo: TipoFicha;

  @Transform(recortar)
  @IsString({ message: 'El título es obligatorio' })
  @IsNotEmpty({ message: 'El título es obligatorio' })
  @MaxLength(100, { message: 'El título no puede superar 100 caracteres' })
  titulo: string;

  @IsOptional()
  @Transform(normalizarTextoLargo)
  @IsString()
  @MaxLength(2000, { message: 'El detalle no puede superar 2000 caracteres' })
  detalle?: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @IsString()
  @MaxLength(100, {
    message: 'El nombre de contacto no puede superar 100 caracteres',
  })
  contactoNombre?: string;

  @IsOptional()
  @Transform(quitarEspacios)
  @EsTelefono()
  contactoTelefono?: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @EsFecha()
  @NoFutura()
  fecha?: string;

  @IsOptional()
  @Transform(recortarOpcional)
  @EsFecha()
  fechaVence?: string;
}
