import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { RolUsuario } from '../../common/enums/rol.enum';
import { mensajesDeValidacion } from '../../common/utils/validacion';
import { TipoResidencia } from '../../usuarios/entities/residencia.entity';
import { AsignarCargoDto, InvitarResidenteDto } from './residentes.dto';

const AHORA = new Date('2026-11-05T15:00:00Z');

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

const invitacion = {
  identificador: '12.345.678-5',
  nombre: ' Ana ',
  primerApellido: 'Soto',
  correo: 'Ana@Correo.cl',
  telefono: '+56 9 1234 5678',
  idUnidad: 12,
  tipoResidencia: TipoResidencia.ARRENDATARIO,
};

describe('DTO de residentes', () => {
  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('InvitarResidenteDto', () => {
    it('debe aceptar una invitación y normalizar RUT, nombre, correo y teléfono', async () => {
      const { dto, mensajes } = await validar(InvitarResidenteDto, invitacion);

      expect(mensajes).toEqual([]);
      expect(dto).toEqual(
        expect.objectContaining({
          identificador: '12345678-5',
          nombre: 'Ana',
          correo: 'ana@correo.cl',
          telefono: '+56912345678',
        }),
      );
    });

    it.each([
      [{ identificador: '12.345.678-9' }, 'El RUT no es válido'],
      [{ nombre: '' }, 'El nombre es obligatorio'],
      [{ correo: 'ana' }, 'El correo no es válido'],
      [
        { telefono: '912345678' },
        'El teléfono debe tener el formato +56912345678',
      ],
      [{ idUnidad: undefined }, 'Indica la unidad'],
      [{ idUnidad: -1 }, 'Indica la unidad'],
      [
        { tipoResidencia: 'Allegado' },
        'La relación con la unidad debe ser Propietario o Arrendatario',
      ],
    ])('con %j debe responder «%s»', async (cambios, mensaje) => {
      const { mensajes } = await validar(InvitarResidenteDto, {
        ...invitacion,
        ...cambios,
      });

      expect(mensajes).toContain(mensaje);
    });
  });

  describe('AsignarCargoDto', () => {
    it.each([
      [RolUsuario.ADMINISTRADOR],
      [RolUsuario.TESORERO],
      [RolUsuario.SECRETARIO],
      [RolUsuario.PRESIDENTE],
      [RolUsuario.CONSERJE],
    ])('debe aceptar el cargo %i', async (idRol) => {
      const { mensajes } = await validar(AsignarCargoDto, { idRol });

      expect(mensajes).toEqual([]);
    });

    it('debe aceptar un hasta de hoy en adelante', async () => {
      const { mensajes } = await validar(AsignarCargoDto, {
        idRol: RolUsuario.CONSERJE,
        hasta: '2026-11-05',
      });

      expect(mensajes).toEqual([]);
    });

    it.each([
      [
        { idRol: RolUsuario.RESIDENTE },
        'El cargo debe ser Administrador, Tesorero, Secretario, Presidente o Conserje',
      ],
      [
        { idRol: 99 },
        'El cargo debe ser Administrador, Tesorero, Secretario, Presidente o Conserje',
      ],
      [
        { idRol: RolUsuario.CONSERJE, hasta: '2026-11-04' },
        'La fecha no puede ser anterior a hoy',
      ],
      [
        { idRol: RolUsuario.CONSERJE, hasta: '2026-02-30' },
        'La fecha debe tener el formato AAAA-MM-DD y existir',
      ],
    ])('con %j debe responder «%s»', async (datos, mensaje) => {
      const { mensajes } = await validar(AsignarCargoDto, datos);

      expect(mensajes).toContain(mensaje);
    });
  });
});
