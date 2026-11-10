import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, LessThan, Repository } from 'typeorm';
import {
  AmbitoBitacora,
  BitacoraAuditoria,
} from '../bitacora/entities/bitacora-auditoria.entity';
import { nombreCompleto } from '../common/utils/nombres';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import {
  ListarBitacoraPlataformaDto,
  SIN_COMUNIDAD,
} from './dto/listar-bitacora-plataforma.dto';

const LIMITE_POR_DEFECTO = 50;

@Injectable()
export class BitacoraPlataformaService {
  constructor(
    @InjectRepository(BitacoraAuditoria)
    private readonly bitacoraRepository: Repository<BitacoraAuditoria>,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(RedVecinal)
    private readonly redesRepository: Repository<RedVecinal>,
  ) {}

  async listar(filtro: ListarBitacoraPlataformaDto) {
    const limite = filtro.limite ?? LIMITE_POR_DEFECTO;
    const filas = await this.bitacoraRepository.find({
      where: {
        ambito: AmbitoBitacora.PLATAFORMA,
        ...(filtro.comunidad === SIN_COMUNIDAD
          ? { idRed: IsNull() }
          : filtro.comunidad
            ? { idRed: Number(filtro.comunidad) }
            : {}),
        ...(filtro.antesDe ? { idBitacora: LessThan(filtro.antesDe) } : {}),
      },
      order: { idBitacora: 'DESC' },
      take: limite + 1,
    });
    const registros = filas.slice(0, limite);

    const idsUsuarios = this.idsUnicos(registros.map((r) => r.idUsuario));
    const idsRedes = this.idsUnicos(registros.map((r) => r.idRed));
    const [usuarios, redes] = await Promise.all([
      idsUsuarios.length
        ? this.usuariosRepository.find({
            where: { idUsuario: In(idsUsuarios) },
            withDeleted: true,
          })
        : [],
      idsRedes.length
        ? this.redesRepository.find({
            where: { idRed: In(idsRedes) },
            withDeleted: true,
          })
        : [],
    ]);
    const usuarioPorId = new Map(usuarios.map((u) => [u.idUsuario, u]));
    const redPorId = new Map(redes.map((r) => [r.idRed, r]));

    return {
      registros: registros.map((registro) => {
        const usuario =
          registro.idUsuario !== null
            ? usuarioPorId.get(registro.idUsuario)
            : undefined;
        const red =
          registro.idRed !== null ? redPorId.get(registro.idRed) : undefined;
        return {
          idBitacora: registro.idBitacora,
          fecha: registro.fechaCreacion,
          accion: registro.accion,
          entidad: registro.entidad,
          idEntidad: registro.idEntidad,
          detalle: registro.detalle,
          comunidad: red ? { idRed: red.idRed, nombre: red.nombre } : null,
          usuario: usuario
            ? { idUsuario: usuario.idUsuario, nombre: nombreCompleto(usuario) }
            : null,
        };
      }),
      siguiente:
        filas.length > limite
          ? registros[registros.length - 1].idBitacora
          : null,
    };
  }

  private idsUnicos(ids: (number | null)[]) {
    return [...new Set(ids.filter((id): id is number => id !== null))];
  }
}
