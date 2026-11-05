import { Transform } from 'class-transformer';
import {
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  registerDecorator,
  ValidationArguments,
} from 'class-validator';
import { esFechaValida } from '../../common/utils/fechas';
import {
  normalizarTextoLargo,
  recortar,
  recortarOpcional,
} from '../../common/utils/texto';
import { fechaHoy } from '../../common/utils/vigencia';
import { TipoFicha } from '../entities/hogar-ficha.entity';
import { CamposFicha, errorCamposSegunTipo } from '../reglas-ficha';

const quitarEspacios = ({ value }: { value: unknown }) => {
  const limpio = typeof value === 'string' ? value.replace(/\s/g, '') : value;
  return limpio === '' ? undefined : limpio;
};

function EsFecha() {
  return function (objeto: object, propiedad: string) {
    registerDecorator({
      name: 'esFecha',
      target: objeto.constructor,
      propertyName: propiedad,
      options: {
        message: 'La fecha debe tener el formato AAAA-MM-DD y existir',
      },
      validator: { validate: (valor: unknown) => esFechaValida(valor) },
    });
  };
}

function NoFutura() {
  return function (objeto: object, propiedad: string) {
    registerDecorator({
      name: 'noFutura',
      target: objeto.constructor,
      propertyName: propiedad,
      options: { message: 'La fecha no puede ser futura' },
      validator: {
        validate: (valor: unknown) =>
          typeof valor === 'string' && valor <= fechaHoy(),
      },
    });
  };
}

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
  @Matches(/^\+\d{8,14}$/, {
    message: 'El teléfono debe tener el formato +56912345678',
  })
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
