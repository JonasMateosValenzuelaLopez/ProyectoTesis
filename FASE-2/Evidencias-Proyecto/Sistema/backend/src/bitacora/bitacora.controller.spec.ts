import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Reflector } from '@nestjs/core';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ROLES_KEY } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RolUsuario } from '../common/enums/rol.enum';
import { mensajesDeValidacion } from '../common/utils/validacion';
import { BitacoraController } from './bitacora.controller';
import { ListarBitacoraDto } from './dto/listar-bitacora.dto';

describe('BitacoraController', () => {
  it('debe dejar ver la bitácora de la comunidad solo a la Presidencia y la Administración', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, BitacoraController)).toEqual([
      JwtAuthGuard,
      RolesGuard,
    ]);
    expect(new Reflector().get(ROLES_KEY, BitacoraController)).toEqual([
      RolUsuario.PRESIDENTE,
      RolUsuario.ADMINISTRADOR,
    ]);
  });

  describe('ListarBitacoraDto', () => {
    const validar = async (datos: object) => {
      const dto = plainToInstance(ListarBitacoraDto, datos);
      return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
    };

    it('debe convertir los filtros que llegan como texto', async () => {
      const { dto, mensajes } = await validar({
        rol: '1',
        antesDe: '40',
        limite: '20',
      });

      expect(mensajes).toEqual([]);
      expect(dto).toEqual({
        rol: RolUsuario.ADMINISTRADOR,
        antesDe: 40,
        limite: 20,
      });
    });

    it.each([
      [{ rol: '9' }, 'El cargo indicado no existe'],
      [{ antesDe: 'x' }, 'antesDe debe ser un número entero'],
      [{ limite: '500' }, 'limite debe ser un número entre 1 y 100'],
    ])('con %j debe responder «%s»', async (datos, mensaje) => {
      const { mensajes } = await validar(datos);

      expect(mensajes).toContain(mensaje);
    });
  });
});
