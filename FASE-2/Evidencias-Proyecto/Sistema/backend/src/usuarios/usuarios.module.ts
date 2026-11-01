import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Modulo } from '../redes-vecinales/entities/modulo.entity';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from './entities/membresia.entity';
import { Residencia } from './entities/residencia.entity';
import { Usuario } from './entities/usuario.entity';
import { UsuariosService } from './usuarios.service';
import { UsuariosController } from './usuarios.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Usuario,
      Membresia,
      Residencia,
      Unidad,
      RedVecinal,
      Modulo,
      RedModulo,
    ]),
  ],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [TypeOrmModule],
})
export class UsuariosModule {}
