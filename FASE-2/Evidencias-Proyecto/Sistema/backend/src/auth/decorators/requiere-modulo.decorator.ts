import { SetMetadata } from '@nestjs/common';
import { CodigoModulo } from '../../common/enums/modulo.enum';

export const MODULO_KEY = 'modulo';

export const RequiereModulo = (modulo: CodigoModulo) =>
  SetMetadata(MODULO_KEY, modulo);
