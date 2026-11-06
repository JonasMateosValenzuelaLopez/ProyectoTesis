import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { BitacoraService } from '../bitacora/bitacora.service';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ActasService } from './actas.service';
import { GuardarActaDto } from './dto/votaciones.dto';
import { Acta, TipoReunion } from './entities/acta.entity';
import { AcuerdoActa } from './entities/acuerdo-acta.entity';

const AHORA = new Date('2026-11-05T15:00:00.000Z');

describe('ActasService', () => {
  let target: ActasService;
  let mockManager: {
    find: jest.Mock;
    findOne: jest.Mock;
    count: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    softDelete: jest.Mock;
  };
  let mockBitacoraService: { registrar: jest.Mock; marcarActividad: jest.Mock };
  let actaEnBd: Acta | null;
  let ultima: Partial<Acta> | null;
  let comunidadEnBd: Partial<RedVecinal> | null;

  const contexto = (roles: RolUsuario[]): ContextoRed => ({
    idRed: 3,
    roles,
    modulos: [],
    idsUnidades: [],
  });
  const secretaria = contexto([RolUsuario.SECRETARIO]);

  const crearActa = (cambios: Partial<Acta> = {}) =>
    ({
      idActa: 8,
      idRed: 3,
      numero: 4,
      titulo: 'Asamblea ordinaria del 05-11-2026',
      tipoReunion: TipoReunion.ORDINARIA,
      fechaAsamblea: '2026-11-05',
      lugar: 'Sede',
      unidadesPresentes: 10,
      asistentes: 'Rosa',
      temas: 'Reja',
      publicada: false,
      publicadaEn: null,
      creadaPor: 9,
      ...cambios,
    }) as Acta;

  const dto = (cambios: Partial<GuardarActaDto> = {}) =>
    ({
      tipo: TipoReunion.ORDINARIA,
      fecha: '2026-11-05',
      lugar: 'Sede',
      unidadesPresentes: 10,
      temas: 'Reja',
      acuerdos: [{ texto: 'Cotizar', responsable: 'Tesorería' }],
      ...cambios,
    }) as GuardarActaDto;

  beforeEach(() => {
    jest.useFakeTimers({ now: AHORA });
    actaEnBd = crearActa();
    ultima = { numero: 3 };
    comunidadEnBd = { idRed: 3 };
    mockManager = {
      find: jest.fn((entidad: unknown) => {
        if (entidad === Acta) {
          return Promise.resolve(actaEnBd ? [actaEnBd] : []);
        }
        if (entidad === Usuario) {
          return Promise.resolve([
            { idUsuario: 9, nombre: 'Sara', primerApellido: 'Paz' },
          ]);
        }
        return Promise.resolve([
          {
            idAcuerdo: 1,
            idActa: 8,
            texto: 'Cotizar',
            responsable: 'Tesorería',
            plazo: null,
          },
        ]);
      }),
      findOne: jest.fn(
        (entidad: unknown, opciones: { withDeleted?: boolean }) =>
          Promise.resolve(
            entidad === RedVecinal
              ? comunidadEnBd
              : opciones.withDeleted
                ? ultima
                : actaEnBd,
          ),
      ),
      count: jest.fn().mockResolvedValue(20),
      insert: jest.fn().mockResolvedValue({ identifiers: [{ idActa: 8 }] }),
      update: jest.fn().mockResolvedValue({ affected: 1 }),
      softDelete: jest.fn().mockResolvedValue({ affected: 1 }),
    };
    mockBitacoraService = {
      registrar: jest.fn().mockResolvedValue(undefined),
      marcarActividad: jest.fn().mockResolvedValue(undefined),
    };
    target = new ActasService(
      {
        manager: mockManager,
        transaction: jest.fn((trabajo: (manager: unknown) => unknown) =>
          trabajo(mockManager),
        ),
      } as never,
      mockBitacoraService as unknown as BitacoraService,
    );
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
  });

  describe('listar', () => {
    it('debe mostrar a la directiva también los borradores', async () => {
      const resultado = await target.listar(secretaria);

      expect(mockManager.find).toHaveBeenCalledWith(Acta, {
        where: { idRed: 3 },
        order: { numero: 'DESC' },
      });
      expect(resultado).toEqual([
        {
          idActa: 8,
          numero: 4,
          titulo: 'Asamblea ordinaria del 05-11-2026',
          tipo: TipoReunion.ORDINARIA,
          fecha: '2026-11-05',
          lugar: 'Sede',
          unidadesPresentes: 10,
          asistentes: 'Rosa',
          temas: 'Reja',
          estado: 'Borrador',
          publicadaEn: null,
          redactor: { idUsuario: 9, nombre: 'Sara Paz' },
          acuerdos: [
            {
              idAcuerdo: 1,
              texto: 'Cotizar',
              responsable: 'Tesorería',
              plazo: null,
            },
          ],
        },
      ]);
    });

    it('debe dejar sin redactor un acta cuyo autor ya no existe', async () => {
      actaEnBd = crearActa({ creadaPor: null });

      const [acta] = await target.listar(secretaria);

      expect(acta.redactor).toBeNull();
    });

    it('debe mostrar a los residentes solo las actas publicadas', async () => {
      await target.listar(contexto([RolUsuario.RESIDENTE]));

      expect(mockManager.find).toHaveBeenCalledWith(Acta, {
        where: { idRed: 3, publicada: true },
        order: { numero: 'DESC' },
      });
    });
  });

  describe('crear', () => {
    it('debe numerar después de la última acta, incluidas las eliminadas, y guardar sus acuerdos', async () => {
      await target.crear(secretaria, 9, dto());

      expect(mockManager.findOne).toHaveBeenCalledWith(RedVecinal, {
        where: { idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
      expect(mockManager.findOne).toHaveBeenCalledWith(Acta, {
        select: { numero: true },
        where: { idRed: 3 },
        order: { numero: 'DESC' },
        withDeleted: true,
      });
      expect(mockManager.insert).toHaveBeenCalledWith(Acta, {
        titulo: 'Asamblea ordinaria del 05-11-2026',
        tipoReunion: TipoReunion.ORDINARIA,
        fechaAsamblea: '2026-11-05',
        lugar: 'Sede',
        unidadesPresentes: 10,
        asistentes: null,
        temas: 'Reja',
        idRed: 3,
        numero: 4,
        publicada: false,
        creadaPor: 9,
      });
      expect(mockManager.insert).toHaveBeenCalledWith(AcuerdoActa, [
        { idActa: 8, texto: 'Cotizar', responsable: 'Tesorería', plazo: null },
      ]);
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'redactar_acta',
          entidad: 'actas',
          idEntidad: 8,
        }),
        mockManager,
      );
    });

    it('debe empezar en el número 1 y no insertar acuerdos vacíos', async () => {
      ultima = null;

      await target.crear(secretaria, 9, dto({ acuerdos: [] }));

      expect(mockManager.insert).toHaveBeenCalledWith(
        Acta,
        expect.objectContaining({ numero: 1 }),
      );
      expect(mockManager.insert).toHaveBeenCalledTimes(1);
    });

    it.each([
      [
        { tipo: TipoReunion.DIRECTIVA },
        'Las unidades presentes solo se registran en asambleas',
      ],
      [
        { unidadesPresentes: 21 },
        'La comunidad tiene 20 unidades; no pueden estar presentes más',
      ],
    ])('con %j debe rechazar «%s»', async (cambios, mensaje) => {
      await expect(target.crear(secretaria, 9, dto(cambios))).rejects.toThrow(
        mensaje,
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it('no debe contar unidades en una asamblea sin unidades presentes', async () => {
      await target.crear(secretaria, 9, dto({ unidadesPresentes: undefined }));

      expect(mockManager.count).not.toHaveBeenCalled();
      expect(mockManager.insert).toHaveBeenCalledWith(
        Acta,
        expect.objectContaining({ unidadesPresentes: null }),
      );
    });

    it('debe responder 404 cuando la comunidad no existe', async () => {
      comunidadEnBd = null;

      await expect(target.crear(secretaria, 9, dto())).rejects.toThrow(
        new NotFoundException('Comunidad no encontrada'),
      );
      expect(mockManager.insert).not.toHaveBeenCalled();
    });
  });

  describe('editar', () => {
    it('debe reemplazar los acuerdos de un borrador', async () => {
      await target.editar(secretaria, 9, 8, dto());

      expect(mockManager.update).toHaveBeenCalledWith(
        Acta,
        { idActa: 8 },
        expect.objectContaining({ lugar: 'Sede' }),
      );
      expect(mockManager.softDelete).toHaveBeenCalledWith(AcuerdoActa, {
        idActa: 8,
      });
      expect(mockManager.insert).toHaveBeenCalledWith(
        AcuerdoActa,
        expect.any(Array),
      );
    });

    it('debe quitar todos los acuerdos cuando se envía la lista vacía', async () => {
      await target.editar(secretaria, 9, 8, dto({ acuerdos: [] }));

      expect(mockManager.softDelete).toHaveBeenCalledWith(AcuerdoActa, {
        idActa: 8,
      });
      expect(mockManager.insert).not.toHaveBeenCalled();
    });

    it.each([
      [
        { tipo: TipoReunion.DIRECTIVA },
        'Las unidades presentes solo se registran en asambleas',
      ],
      [
        { unidadesPresentes: 21 },
        'La comunidad tiene 20 unidades; no pueden estar presentes más',
      ],
    ])(
      'con %j debe rechazar «%s» sin cambiar el borrador',
      async (cambios, mensaje) => {
        await expect(
          target.editar(secretaria, 9, 8, dto(cambios)),
        ).rejects.toThrow(new BadRequestException(mensaje));
        expect(mockManager.update).not.toHaveBeenCalled();
        expect(mockManager.softDelete).not.toHaveBeenCalled();
      },
    );
  });

  describe('publicar', () => {
    it('debe publicar el borrador con su fecha', async () => {
      await target.publicar(secretaria, 9, 8);

      expect(mockManager.update).toHaveBeenCalledWith(
        Acta,
        { idActa: 8 },
        { publicada: true, publicadaEn: AHORA },
      );
      expect(mockBitacoraService.registrar).toHaveBeenCalledWith(
        expect.objectContaining({
          accion: 'publicar_acta',
          detalle: { numero: 4 },
        }),
        mockManager,
      );
    });

    it('debe responder 404 si el acta desaparece antes de leerla', async () => {
      mockManager.findOne
        .mockResolvedValueOnce(actaEnBd)
        .mockResolvedValueOnce(null);

      await expect(target.publicar(secretaria, 9, 8)).rejects.toThrow(
        new NotFoundException('Acta no encontrada'),
      );
    });
  });

  describe('eliminar', () => {
    it('debe borrar con borrado lógico el borrador y sus acuerdos', async () => {
      await target.eliminar(secretaria, 9, 8);

      expect(mockManager.softDelete).toHaveBeenCalledWith(AcuerdoActa, {
        idActa: 8,
      });
      expect(mockManager.softDelete).toHaveBeenCalledWith(Acta, { idActa: 8 });
      expect(mockBitacoraService.marcarActividad).toHaveBeenCalledWith(3);
    });
  });

  describe.each([
    ['editar', (t: ActasService) => t.editar(secretaria, 9, 8, dto())],
    ['publicar', (t: ActasService) => t.publicar(secretaria, 9, 8)],
    ['eliminar', (t: ActasService) => t.eliminar(secretaria, 9, 8)],
  ])('%s', (_nombre, accion) => {
    it('debe rechazar un acta publicada', async () => {
      actaEnBd = crearActa({ publicada: true, publicadaEn: AHORA });

      await expect(accion(target)).rejects.toThrow(
        new ConflictException(
          'Un acta publicada no se puede cambiar; redacta un acta rectificatoria',
        ),
      );
      expect(mockManager.update).not.toHaveBeenCalled();
      expect(mockManager.softDelete).not.toHaveBeenCalled();
    });

    it('debe responder 404 por un acta de otra comunidad', async () => {
      actaEnBd = null;

      await expect(accion(target)).rejects.toThrow(NotFoundException);
      expect(mockManager.findOne).toHaveBeenCalledWith(Acta, {
        where: { idActa: 8, idRed: 3 },
        lock: { mode: 'pessimistic_write' },
      });
    });
  });
});
