import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  DataSource,
  EntityManager,
  FindOptionsWhere,
  In,
  LessThan,
  Like,
  Repository,
} from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { TipoTokenPassword } from '../auth/entities/token-password.entity';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { NOMBRE_ROL } from '../common/enums/rol.enum';
import { nombreCompleto } from '../common/utils/nombres';
import { escaparLike } from '../common/utils/texto';
import { condicionVigente } from '../common/utils/vigencia';
import { MailService } from '../mail/mail.service';
import { CuentasService } from '../usuarios/cuentas.service';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { ListarPersonasDto } from './dto/personas-plataforma.dto';

const LIMITE_POR_DEFECTO = 50;

export const MENSAJE_PERSONA_NO_ENCONTRADA = 'Persona no encontrada';
export const MENSAJE_BLOQUEO_PROPIO = 'No puedes bloquear tu propia cuenta';
export const MENSAJE_YA_BLOQUEADA = 'La cuenta ya está bloqueada';
export const MENSAJE_NO_BLOQUEADA = 'La cuenta no está bloqueada';
export const MENSAJE_REENVIO_BLOQUEADA =
  'La cuenta está bloqueada. Desbloquéala antes de reenviar el acceso';

@Injectable()
export class PersonasPlataformaService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
    private readonly cuentasService: CuentasService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
  ) {}

  async listar(filtro: ListarPersonasDto) {
    const limite = filtro.limite ?? LIMITE_POR_DEFECTO;
    const base: FindOptionsWhere<Usuario> = {
      ...(filtro.filtro === 'bloqueadas' ? { bloqueado: true } : {}),
      ...(filtro.filtro === 'plataforma' ? { esPlataforma: true } : {}),
      ...(filtro.antesDe ? { idUsuario: LessThan(filtro.antesDe) } : {}),
    };
    const filas = await this.usuariosRepository.find({
      where: filtro.buscar
        ? this.condicionesBusqueda(base, filtro.buscar)
        : base,
      order: { idUsuario: 'DESC' },
      take: limite + 1,
    });
    const usuarios = filas.slice(0, limite);

    return {
      personas: await this.armar(usuarios),
      siguiente:
        filas.length > limite ? usuarios[usuarios.length - 1].idUsuario : null,
    };
  }

  async bloquear(idUsuario: number, idPlataforma: number, motivo: string) {
    if (idUsuario === idPlataforma) {
      throw new ConflictException(MENSAJE_BLOQUEO_PROPIO);
    }
    await this.dataSource.transaction(async (manager) => {
      const usuario = await this.bloquearFila(manager, idUsuario);
      if (usuario.bloqueado) {
        throw new ConflictException(MENSAJE_YA_BLOQUEADA);
      }
      await manager.update(
        Usuario,
        { idUsuario },
        { bloqueado: true, motivoBloqueo: motivo },
      );
      await this.registrar(
        manager,
        idPlataforma,
        idUsuario,
        'bloquear_cuenta',
        {
          motivo,
        },
      );
    });
    return this.persona(idUsuario);
  }

  async desbloquear(idUsuario: number, idPlataforma: number) {
    await this.dataSource.transaction(async (manager) => {
      const usuario = await this.bloquearFila(manager, idUsuario);
      if (!usuario.bloqueado) {
        throw new ConflictException(MENSAJE_NO_BLOQUEADA);
      }
      await manager.update(
        Usuario,
        { idUsuario },
        { bloqueado: false, motivoBloqueo: null },
      );
      await this.registrar(
        manager,
        idPlataforma,
        idUsuario,
        'desbloquear_cuenta',
        { motivoAnterior: usuario.motivoBloqueo },
      );
    });
    return this.persona(idUsuario);
  }

  async reenviarAcceso(idUsuario: number, idPlataforma: number) {
    const { usuario, tipo, token } = await this.dataSource.transaction(
      async (manager) => {
        const usuario = await this.bloquearFila(manager, idUsuario);
        if (usuario.bloqueado) {
          throw new ConflictException(MENSAJE_REENVIO_BLOQUEADA);
        }
        const tipo = (await this.cuentasService.tienePassword(
          manager,
          idUsuario,
        ))
          ? TipoTokenPassword.RECUPERACION
          : TipoTokenPassword.ACTIVACION;
        const token = await this.authService.emitirTokenPassword(
          idUsuario,
          tipo,
          manager,
        );
        await this.registrar(
          manager,
          idPlataforma,
          idUsuario,
          'reenviar_acceso',
          {
            tipo,
          },
        );
        return { usuario, tipo, token };
      },
    );

    const enlace = this.authService.urlRestablecer(token);
    const correoEnviado = await this.mailService.enviar(
      tipo === TipoTokenPassword.ACTIVACION
        ? {
            para: usuario.correo,
            asunto: 'Activa tu cuenta de EntreCasas',
            texto:
              `Hola ${usuario.nombre}:\n\n` +
              `El equipo EntreCasas te reenvió el acceso a tu cuenta. ` +
              `Para activarla, crea tu contraseña en este enlace (válido por 3 días):\n\n` +
              `${enlace}\n\n` +
              `Luego podrás ingresar con tu RUT o documento de identidad, o con un código que te enviaremos por correo.`,
          }
        : {
            para: usuario.correo,
            asunto: 'Recupera el acceso a tu cuenta de EntreCasas',
            texto:
              `Hola ${usuario.nombre}:\n\n` +
              `El equipo EntreCasas te reenvió el acceso a tu cuenta. ` +
              `Para crear una nueva contraseña, abre este enlace (válido por 1 hora):\n\n` +
              `${enlace}\n\n` +
              `Si no la necesitas, ignora este correo; tu contraseña actual seguirá funcionando.`,
          },
    );
    return { tipo, correoEnviado };
  }

  private condicionesBusqueda(base: FindOptionsWhere<Usuario>, buscar: string) {
    const patron = `%${escaparLike(buscar)}%`;
    const compacto = buscar.toUpperCase().replace(/[\s.-]/g, '');
    const patronesRut =
      compacto.length >= 2
        ? new Set([
            `%${escaparLike(compacto)}%`,
            ...(/^\d+[0-9K]$/.test(compacto)
              ? [`%${compacto.slice(0, -1)}-${compacto.slice(-1)}%`]
              : []),
          ])
        : new Set<string>();
    return [
      { ...base, nombre: Like(patron) },
      { ...base, primerApellido: Like(patron) },
      { ...base, segundoApellido: Like(patron) },
      { ...base, correo: Like(patron) },
      ...[...patronesRut].map((patronRut) => ({
        ...base,
        identificador: Like(patronRut),
      })),
    ];
  }

  private async persona(idUsuario: number) {
    const usuario = await this.usuariosRepository.findOne({
      where: { idUsuario },
    });
    if (!usuario) {
      throw new NotFoundException(MENSAJE_PERSONA_NO_ENCONTRADA);
    }
    const [persona] = await this.armar([usuario]);
    return persona;
  }

  private async armar(usuarios: Usuario[]) {
    if (usuarios.length === 0) {
      return [];
    }
    const ids = usuarios.map((usuario) => usuario.idUsuario);
    const [conPassword, membresias] = await Promise.all([
      this.cuentasService.conPassword(this.dataSource.manager, ids),
      this.membresiasRepository.find({
        where: { idUsuario: In(ids), activo: true, ...condicionVigente() },
        relations: { red: true },
        order: { idRed: 'ASC', idRol: 'ASC' },
      }),
    ]);

    return usuarios.map((usuario) => {
      const comunidades = new Map<
        number,
        { idRed: number; nombre: string; estado: string; cargos: string[] }
      >();
      for (const membresia of membresias) {
        if (membresia.idUsuario !== usuario.idUsuario || !membresia.red) {
          continue;
        }
        const comunidad = comunidades.get(membresia.idRed) ?? {
          idRed: membresia.idRed,
          nombre: membresia.red.nombre,
          estado: membresia.red.estado,
          cargos: [],
        };
        comunidad.cargos.push(NOMBRE_ROL[membresia.idRol]);
        comunidades.set(membresia.idRed, comunidad);
      }
      return {
        idUsuario: usuario.idUsuario,
        identificador: usuario.identificador,
        pais: usuario.pais,
        nombre: nombreCompleto(usuario),
        correo: usuario.correo,
        telefono: usuario.telefono,
        esPlataforma: usuario.esPlataforma,
        bloqueado: usuario.bloqueado,
        motivoBloqueo: usuario.motivoBloqueo,
        accesoActivado: conPassword.has(usuario.idUsuario),
        fechaCreacion: usuario.fechaCreacion,
        comunidades: [...comunidades.values()],
      };
    });
  }

  private async bloquearFila(manager: EntityManager, idUsuario: number) {
    const usuario = await manager.findOne(Usuario, {
      where: { idUsuario },
      lock: { mode: 'pessimistic_write' },
    });
    if (!usuario) {
      throw new NotFoundException(MENSAJE_PERSONA_NO_ENCONTRADA);
    }
    return usuario;
  }

  private registrar(
    manager: EntityManager,
    idPlataforma: number,
    idUsuario: number,
    accion: string,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.PLATAFORMA,
        idRed: null,
        idUsuario: idPlataforma,
        accion,
        entidad: 'usuarios',
        idEntidad: idUsuario,
        detalle,
      },
      manager,
    );
  }
}
