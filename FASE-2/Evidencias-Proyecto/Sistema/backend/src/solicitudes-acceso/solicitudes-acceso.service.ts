import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { randomBytes } from 'node:crypto';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { TipoTokenPassword } from '../auth/entities/token-password.entity';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { normalizarRut } from '../common/validators/rut.validator';
import { MailService } from '../mail/mail.service';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Rol } from '../roles/entities/rol.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Usuario } from '../usuarios/entities/usuario.entity';
import { CrearSolicitudAccesoDto } from './dto/crear-solicitud-acceso.dto';
import {
  AprobarSolicitudAccesoDto,
  RechazarSolicitudAccesoDto,
} from './dto/resolver-solicitud-acceso.dto';
import {
  EstadoSolicitudAcceso,
  SolicitudAcceso,
} from './entities/solicitud-acceso.entity';

@Injectable()
export class SolicitudesAccesoService {
  constructor(
    @InjectRepository(SolicitudAcceso)
    private readonly solicitudesRepository: Repository<SolicitudAcceso>,
    @InjectRepository(RedVecinal)
    private readonly redesRepository: Repository<RedVecinal>,
    @InjectRepository(Unidad)
    private readonly unidadesRepository: Repository<Unidad>,
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
    private readonly dataSource: DataSource,
  ) {}

  // Datos mínimos para que el formulario público muestre un selector.
  listarComunidades() {
    return this.redesRepository.find({
      select: { idRed: true, nombre: true, tipo: true },
      order: { nombre: 'ASC' },
    });
  }

  async crear(dto: CrearSolicitudAccesoDto) {
    const red = await this.redesRepository.findOneBy({ idRed: dto.idRed });
    if (!red) {
      throw new NotFoundException('La comunidad no existe');
    }
    const rut = normalizarRut(dto.rut) as string;

    // Si ya hay una solicitud pendiente o la persona ya es miembro, no se crea
    // otra, pero se responde igual para no revelar quién pertenece a la comunidad.
    const yaPendiente = await this.solicitudesRepository.existsBy({
      idRed: red.idRed,
      rut,
      estado: EstadoSolicitudAcceso.PENDIENTE,
    });
    const yaMiembro = await this.membresiasRepository.exists({
      where: { idRed: red.idRed, estado: true, usuario: { rut } },
    });

    if (!yaPendiente && !yaMiembro) {
      // La colación de la BD no distingue mayúsculas ni tildes ("a-101" = "A-101").
      const unidad = await this.unidadesRepository.findOneBy({
        idRed: red.idRed,
        numeroIdentificador: dto.numeroUnidad,
      });
      await this.solicitudesRepository.insert({
        idRed: red.idRed,
        idUnidad: unidad?.idUnidad ?? null,
        numeroUnidad: dto.numeroUnidad,
        rut,
        nombre: dto.nombre,
        apellidoPaterno: dto.apellidoPaterno,
        apellidoMaterno: dto.apellidoMaterno,
        correo: dto.correo,
        telefono: dto.telefono ?? null,
      });
    }

    return {
      mensaje:
        'Recibimos tu solicitud. La administración validará tus datos y te avisará por correo.',
    };
  }

  listar(red: ContextoRed, estado?: EstadoSolicitudAcceso) {
    return this.solicitudesRepository.find({
      where: { idRed: red.idRed, ...(estado && { estado }) },
      relations: { unidad: true },
      order: { fechaSolicitud: 'DESC' },
    });
  }

  async aprobar(
    idSolicitud: number,
    red: ContextoRed,
    idResolutor: number,
    dto: AprobarSolicitudAccesoDto,
  ) {
    const resultado = await this.dataSource.transaction(async (manager) => {
      const solicitud = await this.buscarPendiente(manager, idSolicitud, red);

      const idUnidad = dto.idUnidad ?? solicitud.idUnidad;
      if (!idUnidad) {
        throw new BadRequestException(
          `No existe la unidad "${solicitud.numeroUnidad}" en esta comunidad. Indica idUnidad para aprobar.`,
        );
      }
      const unidad = await manager.findOneBy(Unidad, {
        idUnidad,
        idRed: red.idRed,
      });
      if (!unidad) {
        throw new BadRequestException(
          'La unidad no pertenece a esta comunidad',
        );
      }

      // withDeleted: el RUT y el correo son únicos también entre usuarios
      // eliminados (borrado lógico), así que hay que verlos para no chocar.
      const porRut = await manager.findOne(Usuario, {
        where: { rut: solicitud.rut },
        withDeleted: true,
      });
      const porCorreo = await manager.findOne(Usuario, {
        where: { correo: solicitud.correo },
        withDeleted: true,
      });
      if (porCorreo && porCorreo.idUsuario !== porRut?.idUsuario) {
        throw new ConflictException(
          'El correo de la solicitud ya está registrado por otra persona',
        );
      }

      // Si la persona ya tiene cuenta (por ejemplo, en otra comunidad), se
      // reutiliza; si no, se crea con una contraseña aleatoria inutilizable
      // hasta que la defina con el enlace de activación.
      // Una cuenta eliminada se restaura al aprobar una nueva solicitud.
      let usuario = porRut;
      const esNuevo = !usuario;
      // Aprobar no reactiva una cuenta desactivada: el login la seguiría
      // rechazando y el correo de aprobación sería falso.
      if (usuario && !usuario.estado) {
        throw new ConflictException(
          'La cuenta de esta persona está desactivada. Reactívala antes de aprobar la solicitud.',
        );
      }
      if (usuario?.fechaEliminacion) {
        await manager.restore(Usuario, { idUsuario: usuario.idUsuario });
      }
      if (!usuario) {
        usuario = await manager.save(
          manager.create(Usuario, {
            rut: solicitud.rut,
            nombre: solicitud.nombre,
            apellidoPaterno: solicitud.apellidoPaterno,
            apellidoMaterno: solicitud.apellidoMaterno,
            correo: solicitud.correo,
            telefono: solicitud.telefono,
            passwordHash: await bcrypt.hash(
              randomBytes(32).toString('hex'),
              10,
            ),
            estado: true,
          }),
        );
      }

      const rolResidente = await manager.findOneByOrFail(Rol, {
        idRol: RolUsuario.RESIDENTE,
      });
      // (usuario, red) es único también entre membresías eliminadas: si existe
      // una eliminada, se restaura en vez de crear otra. El borrado lógico no
      // toca membresias_roles, así que se descartan los roles que tenía: la
      // membresía restaurada vuelve solo como Residente.
      const existente = await manager.findOne(Membresia, {
        where: { idUsuario: usuario.idUsuario, idRed: red.idRed },
        relations: { roles: true },
        withDeleted: true,
      });
      if (existente?.fechaEliminacion) {
        await manager.restore(Membresia, {
          idMembresia: existente.idMembresia,
        });
        existente.fechaEliminacion = null;
        existente.roles = [];
      }
      const membresia =
        existente ??
        manager.create(Membresia, {
          idUsuario: usuario.idUsuario,
          idRed: red.idRed,
          roles: [],
        });
      membresia.estado = true;
      membresia.idUnidad = idUnidad;
      if (!membresia.roles.some((rol) => rol.idRol === rolResidente.idRol)) {
        membresia.roles.push(rolResidente);
      }
      await manager.save(membresia);

      solicitud.estado = EstadoSolicitudAcceso.APROBADA;
      solicitud.idUnidad = idUnidad;
      solicitud.fechaResolucion = new Date();
      solicitud.idUsuarioResolutor = idResolutor;
      solicitud.idUsuarioCreado = usuario.idUsuario;
      await manager.save(solicitud);

      const tokenActivacion = esNuevo
        ? await this.authService.emitirTokenPassword(
            usuario.idUsuario,
            TipoTokenPassword.ACTIVACION,
            manager,
          )
        : null;
      const { nombre: nombreRed } = await manager.findOneByOrFail(RedVecinal, {
        idRed: red.idRed,
      });
      return { solicitud, usuario, tokenActivacion, nombreRed };
    });

    const { solicitud, usuario, tokenActivacion, nombreRed } = resultado;
    // Se espera el envío para que la administración sepa si el vecino recibió
    // el enlace; si falló, puede usar "¿Olvidaste tu contraseña?".
    const correoEnviado = await this.mailService.enviar({
      para: usuario.correo,
      asunto: `Tu acceso a ${nombreRed} fue aprobado`,
      texto: tokenActivacion
        ? `Hola ${usuario.nombre}:\n\n` +
          `La administración de ${nombreRed} aprobó tu solicitud. ` +
          `Para activar tu cuenta, crea tu contraseña en este enlace (válido por 3 días):\n\n` +
          `${this.authService.urlRestablecer(tokenActivacion)}\n\n` +
          `Luego podrás ingresar con tu RUT.`
        : `Hola ${usuario.nombre}:\n\n` +
          `La administración de ${nombreRed} aprobó tu solicitud. ` +
          `Ya puedes acceder a esta comunidad con tu cuenta actual de EntreCasas. ` +
          `Si no recuerdas tu contraseña, usa "¿Olvidaste tu contraseña?" al iniciar sesión.`,
    });

    return { ...solicitud, correoEnviado };
  }

  async rechazar(
    idSolicitud: number,
    red: ContextoRed,
    idResolutor: number,
    dto: RechazarSolicitudAccesoDto,
  ) {
    // El nombre de la red se lee dentro de la transacción: si fallara después
    // del commit, el rechazo quedaría guardado pero el cliente vería un error.
    const { solicitud, nombreRed } = await this.dataSource.transaction(
      async (manager) => {
        const pendiente = await this.buscarPendiente(manager, idSolicitud, red);
        pendiente.estado = EstadoSolicitudAcceso.RECHAZADA;
        pendiente.motivoRechazo = dto.motivo || null;
        pendiente.fechaResolucion = new Date();
        pendiente.idUsuarioResolutor = idResolutor;
        const { nombre } = await manager.findOneByOrFail(RedVecinal, {
          idRed: red.idRed,
        });
        return { solicitud: await manager.save(pendiente), nombreRed: nombre };
      },
    );

    void this.mailService.enviar({
      para: solicitud.correo,
      asunto: `Tu solicitud de acceso a ${nombreRed}`,
      texto:
        `Hola ${solicitud.nombre}:\n\n` +
        `La administración de ${nombreRed} no aprobó tu solicitud de acceso.` +
        (solicitud.motivoRechazo
          ? `\n\nMotivo: ${solicitud.motivoRechazo}`
          : '') +
        `\n\nSi crees que es un error, contacta a la administración de tu comunidad.`,
    });

    return solicitud;
  }

  // Filtra por la red del administrador: una solicitud de otra comunidad
  // simplemente "no existe" para él. Bloquea la fila para que dos
  // administradores no la resuelvan a la vez (llamar dentro de una transacción).
  private async buscarPendiente(
    manager: EntityManager,
    idSolicitud: number,
    red: ContextoRed,
  ) {
    const solicitud = await manager.findOne(SolicitudAcceso, {
      where: { idSolicitud, idRed: red.idRed },
      lock: { mode: 'pessimistic_write' },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    if (solicitud.estado !== EstadoSolicitudAcceso.PENDIENTE) {
      throw new ConflictException('Esta solicitud ya fue resuelta');
    }
    return solicitud;
  }
}
