import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

@Injectable()
export class ZonaHorariaBdService implements OnModuleInit {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async onModuleInit() {
    const [fila] = await this.dataSource.query<
      { zona: string; diferencia: number | string }[]
    >(
      'SELECT @@session.time_zone AS zona, TIMESTAMPDIFF(SECOND, UTC_TIMESTAMP(), NOW()) AS diferencia',
    );
    if (Number(fila?.diferencia) !== 0) {
      throw new Error(
        `La sesión de MariaDB no está en UTC (time_zone = ${fila?.zona ?? 'desconocida'}). ` +
          "Configura el servidor con default-time-zone='+00:00' (en Laragon, my.ini en [mysqld]) y reinícialo.",
      );
    }
  }
}
