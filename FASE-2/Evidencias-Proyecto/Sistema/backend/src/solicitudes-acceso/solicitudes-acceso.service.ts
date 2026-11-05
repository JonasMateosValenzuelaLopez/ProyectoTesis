import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { TipoTokenPassword } from '../auth/entities/token-password.entity';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { condicionVigente } from '../common/utils/vigencia';
import { PAIS_POR_DEFECTO } from '../common/validators/identificador.validator';
import { MailService } from '../mail/mail.service';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import {
  EstadoRedVecinal,
  RedVecinal,
} from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CuentasService } from '../usuarios/cuentas.service';
import { Membresia } from '../usuarios/entities/membresia.entity';
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
    @InjectRepository(RedModulo)
    private readonly redModulosRepository: Repository<RedModulo>,
    @InjectRepository(Unidad)
    private readonly unidadesRepository: Repository<Unidad>,
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
    private readonly authService: AuthService,
    private readonly bitacoraService: BitacoraService,
    private readonly mailService: MailService,
    private readonly cuentasService: CuentasService,
    private readonly dataSource: DataSource,
  ) {}

  async listarComunidades() {
    const redes = await this.redesRepository.find({
      select: { idRed: true, nombre: true, tipo: true },
      where: { estado: EstadoRedVecinal.ACTIVA },
      order: { nombre: 'ASC' },
    });
    const conAdministrador = new Set(
      (
        await this.redModulosRepository.find({
          where: {
            codigoModulo: CodigoModulo.ADMINISTRADOR_EXTERNO,
            activo: true,
          },
        })
      ).map((redModulo) => redModulo.idRed),
    );
    return redes.map((red) => ({
      idRed: red.idRed,
      nombre: red.nombre,
      tipo: red.tipo,
      administracionExterna: conAdministrador.has(red.idRed),
    }));
  }

  async crear(dto: CrearSolicitudAccesoDto) {
    const red = await this.redesRepository.findOneBy({
      idRed: dto.idRed,
      estado: EstadoRedVecinal.ACTIVA,
    });
    if (!red) {
      throw new NotFoundException('La comunidad no existe');
    }
    const pais = dto.pais ?? PAIS_POR_DEFECTO;
    const { identificador } = dto;

    const yaPendiente = await this.solicitudesRepository.existsBy({
      idRed: red.idRed,
      pais,
      identificador,
      estado: EstadoSolicitudAcceso.PENDIENTE,
    });
    const yaMiembro = await this.membresiasRepository.exists({
      where: {
        idRed: red.idRed,
        activo: true,
        ...condicionVigente(),
        usuario: { pais, identificador },
      },
    });

    if (!yaPendiente && !yaMiembro) {
      const coincidencias = await this.unidadesRepository.find({
        where: { idRed: red.idRed, numeroIdentificador: dto.numeroUnidad },
        take: 2,
      });
      await this.solicitudesRepository.insert({
        idRed: red.idRed,
        idUnidad: coincidencias.length === 1 ? coincidencias[0].idUnidad : null,
        numeroUnidad: dto.numeroUnidad,
        tipoResidencia: dto.tipoResidencia,
        identificador,
        pais,
        nombre: dto.nombre,
        primerApellido: dto.primerApellido,
        segundoApellido: dto.segundoApellido ?? null,
        correo: dto.correo,
        telefono: dto.telefono ?? null,
        mensaje: dto.mensaje ?? null,
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
          `No se pudo identificar la unidad "${solicitud.numeroUnidad}" en esta comunidad: no existe o el número se repite entre torres. Indica idUnidad para aprobar.`,
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

      const { usuario, cuentaNueva: esNuevo } =
        await this.cuentasService.obtenerOCrear(manager, solicitud, {
          correoAjeno:
            'El correo de la solicitud ya está registrado por otra persona',
          bloqueada:
            'La cuenta de esta persona está bloqueada. Debe desbloquearla el equipo EntreCasas antes de aprobar.',
        });

      await this.cuentasService.asignarMembresia(
        manager,
        usuario.idUsuario,
        red.idRed,
        RolUsuario.RESIDENTE,
      );
      const tipoResidencia = dto.tipoResidencia ?? solicitud.tipoResidencia;
      await this.cuentasService.asignarResidencia(
        manager,
        usuario.idUsuario,
        idUnidad,
        tipoResidencia,
      );

      solicitud.estado = EstadoSolicitudAcceso.APROBADA;
      solicitud.idUnidad = idUnidad;
      solicitud.tipoResidencia = tipoResidencia;
      solicitud.fechaResolucion = new Date();
      solicitud.idUsuarioResolutor = idResolutor;
      solicitud.idUsuarioCreado = usuario.idUsuario;
      await manager.save(solicitud);

      await this.bitacoraService.registrar(
        {
          ambito: AmbitoBitacora.COMUNIDAD,
          idRed: red.idRed,
          idUsuario: idResolutor,
          accion: 'aprobar_solicitud_acceso',
          entidad: 'solicitudes_acceso',
          idEntidad: solicitud.idSolicitud,
          detalle: {
            idUsuario: usuario.idUsuario,
            idUnidad,
            tipoResidencia,
            cuentaNueva: esNuevo,
          },
        },
        manager,
      );

      const requiereActivacion =
        esNuevo ||
        !(await this.cuentasService.tienePassword(manager, usuario.idUsuario));
      const tokenActivacion = requiereActivacion
        ? await this.authService.emitirTokenPassword(
            usuario.idUsuario,
            TipoTokenPassword.ACTIVACION,
            manager,
          )
        : null;
      const nombreRed = await this.nombreRed(manager, red.idRed);
      return { solicitud, usuario, tokenActivacion, nombreRed };
    });

    const { solicitud, usuario, tokenActivacion, nombreRed } = resultado;
    await this.bitacoraService.marcarActividad(red.idRed);
    const correoEnviado = await this.mailService.enviar({
      para: usuario.correo,
      asunto: `Tu acceso a ${nombreRed} fue aprobado`,
      texto: tokenActivacion
        ? `Hola ${usuario.nombre}:\n\n` +
          `La administración de ${nombreRed} aprobó tu solicitud. ` +
          `Para activar tu cuenta, crea tu contraseña en este enlace (válido por 3 días):\n\n` +
          `${this.authService.urlRestablecer(tokenActivacion)}\n\n` +
          `Luego podrás ingresar con tu RUT o documento de identidad, o con un código que te enviaremos por correo.`
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
    const { solicitud, nombreRed } = await this.dataSource.transaction(
      async (manager) => {
        const pendiente = await this.buscarPendiente(manager, idSolicitud, red);
        pendiente.estado = EstadoSolicitudAcceso.RECHAZADA;
        pendiente.motivoRechazo = dto.motivo || null;
        pendiente.fechaResolucion = new Date();
        pendiente.idUsuarioResolutor = idResolutor;
        const guardada = await manager.save(pendiente);
        await this.bitacoraService.registrar(
          {
            ambito: AmbitoBitacora.COMUNIDAD,
            idRed: red.idRed,
            idUsuario: idResolutor,
            accion: 'rechazar_solicitud_acceso',
            entidad: 'solicitudes_acceso',
            idEntidad: guardada.idSolicitud,
            detalle: { motivo: guardada.motivoRechazo },
          },
          manager,
        );
        const nombreRed = await this.nombreRed(manager, red.idRed);
        return { solicitud: guardada, nombreRed };
      },
    );

    await this.bitacoraService.marcarActividad(red.idRed);
    const correoEnviado = await this.mailService.enviar({
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

    return { ...solicitud, correoEnviado };
  }

  private async nombreRed(manager: EntityManager, idRed: number) {
    const red = await manager.findOneBy(RedVecinal, { idRed });
    if (!red) {
      throw new NotFoundException('La comunidad no existe');
    }
    return red.nombre;
  }

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
