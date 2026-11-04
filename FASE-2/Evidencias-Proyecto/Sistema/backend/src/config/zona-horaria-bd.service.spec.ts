import { Test } from '@nestjs/testing';
import { getDataSourceToken } from '@nestjs/typeorm';
import { ZonaHorariaBdService } from './zona-horaria-bd.service';

describe('ZonaHorariaBdService', () => {
  let target: ZonaHorariaBdService;
  let mockDataSource: { query: jest.Mock };

  beforeEach(async () => {
    mockDataSource = { query: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        ZonaHorariaBdService,
        { provide: getDataSourceToken(), useValue: mockDataSource },
      ],
    }).compile();

    target = module.get(ZonaHorariaBdService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('onModuleInit', () => {
    it('debe arrancar cuando la sesión de MariaDB está en UTC', async () => {
      mockDataSource.query.mockResolvedValue([
        { zona: '+00:00', diferencia: '0' },
      ]);

      await expect(target.onModuleInit()).resolves.toBeUndefined();
    });

    it('debe impedir el arranque cuando la sesión está en la hora de Chile', async () => {
      mockDataSource.query.mockResolvedValue([
        { zona: 'SYSTEM', diferencia: '-10800' },
      ]);

      await expect(target.onModuleInit()).rejects.toThrow(
        "La sesión de MariaDB no está en UTC (time_zone = SYSTEM). Configura el servidor con default-time-zone='+00:00'",
      );
    });

    it('debe impedir el arranque cuando la consulta no devuelve filas', async () => {
      mockDataSource.query.mockResolvedValue([]);

      await expect(target.onModuleInit()).rejects.toThrow(
        'time_zone = desconocida',
      );
    });
  });
});
