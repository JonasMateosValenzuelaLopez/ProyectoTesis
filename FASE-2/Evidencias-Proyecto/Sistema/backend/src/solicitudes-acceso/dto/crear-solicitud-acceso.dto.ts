import { Transform } from 'class-transformer';
import {
  IsEmail,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsPositive,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';
import { EsRut, NormalizarRut } from '../../common/validators/rut.validator';

const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CrearSolicitudAccesoDto {
  @IsInt({ message: 'Debes seleccionar tu comunidad' })
  @IsPositive({ message: 'Debes seleccionar tu comunidad' })
  idRed: number;

  @NormalizarRut()
  @IsString()
  @EsRut()
  rut: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El nombre es obligatorio' })
  @MaxLength(50)
  nombre: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El apellido paterno es obligatorio' })
  @MaxLength(50)
  apellidoPaterno: string;

  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El apellido materno es obligatorio' })
  @MaxLength(50)
  apellidoMaterno: string;

  @Transform(({ value }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  )
  @IsEmail({}, { message: 'El correo no es válido' })
  @MaxLength(100)
  correo: string;

  // Un campo vacío del formulario ("") se trata como no informado.
  @IsOptional()
  @Transform(({ value }) => {
    const recortado = recortar({ value });
    return recortado === '' ? undefined : recortado;
  })
  @Matches(/^\+?\d{8,14}$/, { message: 'El teléfono no es válido' })
  telefono?: string;

  // Lo que la persona escribe en "Número de Casa/Depto".
  @Transform(recortar)
  @IsString()
  @IsNotEmpty({ message: 'El número de casa o depto es obligatorio' })
  @MaxLength(20)
  numeroUnidad: string;
}
