import { ConflictException } from '@nestjs/common';
import { EntityManager, In, IsNull, Not } from 'typeorm';
import { RolUsuario } from '../common/enums/rol.enum';
import { CuentasService } from './cuentas.service';
import { Membresia } from './entities/membresia.entity';
import { Residencia, TipoResidencia } from './entities/residencia.entity';
import { Usuario } from './entities/usuario.entity';

const AHORA = new Date('2026-11-05T15:00:00Z');
const MENSAJES = { correoAjeno: 'Correo ajeno', bloqueada: 'Bloqueada' };
const DATOS = {
  pais: 'CL',
  identificador: '12345678-5',
  nombre: 'Ana',
  primerApellido: 'Soto',
  correo: 'ana@correo.cl',
};

describe('CuentasService', () => {
  const target = new CuentasService();
  let manager: {
    findOne: jest.Mock;
    find: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    restore: jest.Mock;
    save: jest.Mock;
    create: jest.Mock;
    exists: jest.Mock;
  };
  const comoManager = () => manager as unknown as EntityManager;

  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
    manager = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
      insert: jest.fn().mockResolvedValue({}),
      update: jest.fn().mockResolvedValue({}),
      restore: jest.fn().mockResolvedValue({}),
      create: jest.fn((_entidad: unknown, datos: object) => datos),
      save: jest.fn((datos: object) =>
        Promise.resolve({ ...datos, idUsuario: 50 }),
      ),
      exists: jest.fn().mockResolvedValue(true),
    };
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('obtenerOCrear', () => {
    const cuenta = (cambios: Partial<Usuario> = {}) =>
      ({
        idUsuario: 40,
        correo: 'ana@correo.cl',
        esPlataforma: false,
        bloqueado: false,
        fechaEliminacion: null,
        ...cambios,
      }) as Usuario;

    it('debe crear la cuenta sin contraseña cuando el RUT y el correo son nuevos', async () => {
      const resultado = await target.obtenerOCrear(
        comoManager(),
        DATOS,
        MENSAJES,
      );

      expect(manager.create).toHaveBeenCalledWith(Usuario, {
        ...DATOS,
        segundoApellido: null,
        telefono: null,
        passwordHash: null,
      });
      expect(resultado).toEqual({
        usuario: expect.objectContaining({ idUsuario: 50 }),
        cuentaNueva: true,
      });
    });

    it('debe reutilizar la cuenta del mismo RUT sin cambiar sus datos', async () => {
      manager.findOne.mockResolvedValue(cuenta());

      const resultado = await target.obtenerOCrear(
        comoManager(),
        DATOS,
        MENSAJES,
      );

      expect(manager.save).not.toHaveBeenCalled();
      expect(resultado).toEqual({ usuario: cuenta(), cuentaNueva: false });
    });

    it('debe restaurar una cuenta eliminada', async () => {
      manager.findOne.mockResolvedValue(cuenta({ fechaEliminacion: AHORA }));

      await target.obtenerOCrear(comoManager(), DATOS, MENSAJES);

      expect(manager.restore).toHaveBeenCalledWith(Usuario, { idUsuario: 40 });
    });

    it('debe rechazar un correo que pertenece a otra persona', async () => {
      manager.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce(cuenta({ idUsuario: 41 }));

      await expect(
        target.obtenerOCrear(comoManager(), DATOS, MENSAJES),
      ).rejects.toThrow(new ConflictException('Correo ajeno'));
    });

    it.each([
      [
        { esPlataforma: true },
        'Una cuenta del equipo EntreCasas no puede tener cargos ni viviendas en una comunidad',
      ],
      [{ bloqueado: true }, 'Bloqueada'],
    ])('con %j debe rechazar la cuenta', async (cambios, mensaje) => {
      manager.findOne.mockResolvedValue(cuenta(cambios));

      await expect(
        target.obtenerOCrear(comoManager(), DATOS, MENSAJES),
      ).rejects.toThrow(new ConflictException(mensaje));
    });
  });

  describe('asignarMembresia', () => {
    const membresia = (cambios: Partial<Membresia> = {}) =>
      ({
        idMembresia: 8,
        activo: true,
        desde: '2026-01-01',
        hasta: null,
        fechaEliminacion: null,
        ...cambios,
      }) as Membresia;

    it('debe crear la membresía desde hoy cuando no existe', async () => {
      await target.asignarMembresia(
        comoManager(),
        7,
        3,
        RolUsuario.TESORERO,
        '2026-12-31',
      );

      expect(manager.insert).toHaveBeenCalledWith(Membresia, {
        idUsuario: 7,
        idRed: 3,
        idRol: RolUsuario.TESORERO,
        activo: true,
        desde: '2026-11-05',
        hasta: '2026-12-31',
      });
    });

    it('debe reactivar una membresía terminada hoy sin cambiar su inicio', async () => {
      manager.findOne.mockResolvedValue(
        membresia({ activo: false, hasta: '2026-11-05' }),
      );

      await target.asignarMembresia(comoManager(), 7, 3, RolUsuario.RESIDENTE);

      expect(manager.update).toHaveBeenCalledWith(
        Membresia,
        { idMembresia: 8 },
        { activo: true, hasta: null },
      );
    });

    it.each([
      ['vencida', { hasta: '2026-03-01' }],
      ['eliminada', { fechaEliminacion: AHORA }],
    ])(
      'debe reiniciar el inicio de una membresía %s',
      async (_caso, cambios: Partial<Membresia>) => {
        manager.findOne.mockResolvedValue(membresia(cambios));

        await target.asignarMembresia(
          comoManager(),
          7,
          3,
          RolUsuario.RESIDENTE,
        );

        expect(manager.update).toHaveBeenCalledWith(
          Membresia,
          { idMembresia: 8 },
          { activo: true, hasta: null, desde: '2026-11-05' },
        );
      },
    );
  });

  describe('asignarResidencia', () => {
    it('debe crear la residencia cuando no hay una vigente en esa unidad', async () => {
      await target.asignarResidencia(
        comoManager(),
        7,
        12,
        TipoResidencia.ARRENDATARIO,
      );

      expect(manager.insert).toHaveBeenCalledWith(Residencia, {
        idUsuario: 7,
        idUnidad: 12,
        tipo: TipoResidencia.ARRENDATARIO,
        desde: '2026-11-05',
        hasta: null,
      });
    });

    it('debe actualizar solo el tipo de una residencia vigente', async () => {
      manager.findOne.mockResolvedValue({
        idResidencia: 4,
        tipo: TipoResidencia.PROPIETARIO,
      });

      await target.asignarResidencia(
        comoManager(),
        7,
        12,
        TipoResidencia.ARRENDATARIO,
      );

      expect(manager.update).toHaveBeenCalledWith(
        Residencia,
        { idResidencia: 4 },
        { tipo: TipoResidencia.ARRENDATARIO },
      );
      expect(manager.insert).not.toHaveBeenCalled();
    });
  });

  describe('conPassword', () => {
    it('debe devolver en una sola consulta quiénes ya tienen contraseña', async () => {
      manager.find.mockResolvedValue([{ idUsuario: 7 }]);

      const resultado = await target.conPassword(comoManager(), [7, 8]);

      expect(manager.find).toHaveBeenCalledWith(Usuario, {
        select: { idUsuario: true },
        where: { idUsuario: In([7, 8]), passwordHash: Not(IsNull()) },
        withDeleted: true,
      });
      expect([...resultado]).toEqual([7]);
    });

    it('no debe consultar cuando no hay personas', async () => {
      const resultado = await target.conPassword(comoManager(), []);

      expect(manager.find).not.toHaveBeenCalled();
      expect(resultado.size).toBe(0);
    });
  });
});
