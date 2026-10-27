import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NOMBRE_ROL, RolUsuario } from '../common/enums/rol.enum';
import { Rol } from './entities/rol.entity';

@Injectable()
export class RolesService implements OnModuleInit {
  constructor(
    @InjectRepository(Rol)
    private readonly rolesRepository: Repository<Rol>,
  ) {}

  // RolUsuario usa los ids autoincrementales de `roles`. Si en otra BD se
  // sembraron en otro orden, Residente podría quedar con el id de
  // Administración; mejor no arrancar que repartir permisos equivocados.
  async onModuleInit() {
    const roles = await this.rolesRepository.find();
    const nombrePorId = new Map(roles.map((rol) => [rol.idRol, rol.nombreRol]));
    const diferencias = Object.entries(NOMBRE_ROL)
      .filter(([id, nombre]) => nombrePorId.get(Number(id)) !== nombre)
      .map(
        ([id, nombre]) =>
          `id ${id} (${RolUsuario[Number(id)]}): se esperaba "${nombre}" y la BD tiene "${nombrePorId.get(Number(id)) ?? 'nada'}"`,
      );
    if (diferencias.length > 0) {
      throw new Error(
        `La tabla roles no coincide con RolUsuario (src/common/enums/rol.enum.ts):\n${diferencias.join('\n')}`,
      );
    }
  }
}
