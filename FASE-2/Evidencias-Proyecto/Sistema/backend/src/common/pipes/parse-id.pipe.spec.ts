import { BadRequestException } from '@nestjs/common';
import { ParseIdPipe } from './parse-id.pipe';

describe('ParseIdPipe', () => {
  const target = new ParseIdPipe();
  const metadata = { type: 'param' as const, data: 'idUnidad' };

  it('debe convertir el id de la ruta en número', async () => {
    await expect(target.transform('42', metadata)).resolves.toBe(42);
  });

  it.each([['abc'], ['4.5'], ['1 OR 1=1']])(
    'debe rechazar %j con un mensaje en español',
    async (valor) => {
      await expect(target.transform(valor, metadata)).rejects.toThrow(
        new BadRequestException(
          'El identificador de la ruta debe ser un número entero',
        ),
      );
    },
  );
});
