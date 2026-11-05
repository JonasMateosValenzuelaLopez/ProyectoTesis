import { BadRequestException, Injectable, ParseIntPipe } from '@nestjs/common';

@Injectable()
export class ParseIdPipe extends ParseIntPipe {
  constructor() {
    super({
      exceptionFactory: () =>
        new BadRequestException(
          'El identificador de la ruta debe ser un número entero',
        ),
    });
  }
}
