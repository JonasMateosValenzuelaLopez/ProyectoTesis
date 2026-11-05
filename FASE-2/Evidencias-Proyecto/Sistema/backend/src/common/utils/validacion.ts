import { BadRequestException } from '@nestjs/common';
import { ValidationError } from 'class-validator';

export const mensajesDeValidacion = (errores: ValidationError[]): string[] =>
  errores.flatMap((error) => [
    ...Object.values(error.constraints ?? {}),
    ...mensajesDeValidacion(error.children ?? []),
  ]);

export const errorDeValidacion = (errores: ValidationError[]) =>
  new BadRequestException([...new Set(mensajesDeValidacion(errores))]);
