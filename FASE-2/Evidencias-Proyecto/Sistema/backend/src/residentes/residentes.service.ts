import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Not, Repository } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { TipoTokenPassword } from '../auth/entities/token-password.entity';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { NOMBRE_ROL, RolUsuario } from '../common/enums/rol.enum';
import { ContextoRed } from '../common/interfaces/jwt-payload.interface';
import { nombreCompleto } from '../common/utils/nombres';
import { condicionVigente, fechaHoy } from '../common/utils/vigencia';
import { PAIS_POR_DEFECTO } from '../common/validators/identificador.validator';
import { MailService } from '../mail/mail.service';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CuentasService } from '../usuarios/cuentas.service';
import { Membresia } from '../usuarios/entities/membresia.entity';
import { Residencia } from '../usuarios/entities/residencia.entity';
import {
  AsignarCargoDto,
  CARGOS_ASIGNABLES,
  InvitarResidenteDto,
} from './dto/residentes.dto';

export enum EstadoPersona {
  ACTIVO = 'Activo',
  INVITADO = 'Invitado',
  DESACTIVADO = 'Desactivado',
}

const CARGOS_UNICOS = [
  RolUsuario.ADMINISTRADOR,
  RolUsuario.TESORERO,
  RolUsuario.SECRETARIO,
  RolUsuario.PRESIDENTE,
];

const esVigente = (membresia: Membresia, hoy: string) =>
  membresia.activo &&
  membresia.desde <= hoy &&
  (membresia.hasta === null || membresia.hasta >= hoy);

const TERMINAR = () => ({ activo: false, hasta: fechaHoy() });

export const MENSAJE_DATOS_NO_COINCIDEN =
  'Este RUT ya tiene una cuenta en EntreCasas con otro correo. Pídele a la persona el correo con que se registró.';

@Injectable()
export class ResidentesService {
  constructor(
    @InjectRepository(Membresia)
    private readonly membresiasRepository: Repository<Membresia>,
    @InjectRepository(Residencia)
    private readonly residenciasRepository: Repository<Residencia>,
    private readonly dataSource: DataSource,
    private readonly cuentasService: CuentasService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
    private readonly bitacoraService: BitacoraService,
  ) {}

  listar(red: ContextoRed) {
    return this.personas(red);
  }

  async invitar(red: ContextoRed, idActor: number, dto: InvitarResidenteDto) {
    const resultado = await this.dataSource.transaction(async (manager) => {
      const comunidad = await this.bloquearComunidad(manager, red);
      const unidad = await manager.findOneBy(Unidad, {
        idUnidad: dto.idUnidad,
        idRed: red.idRed,
      });
      if (!unidad) {
        throw new BadRequestException(
          'La unidad no pertenece a esta comunidad',
        );
      }
      const { usuario, cuentaNueva } = await this.cuentasService.obtenerOCrear(
        manager,
        { ...dto, pais: dto.pais ?? PAIS_POR_DEFECTO },
        {
          correoAjeno: 'El correo ya está registrado por otra persona',
          bloqueada:
            'La cuenta de esta persona está bloqueada. Debe desbloquearla el equipo EntreCasas.',
        },
      );
      if (!cuentaNueva) {
        const membresias = await this.membresiasDe(
          manager,
          red,
          usuario.idUsuario,
        );
        if (membresias.some((m) => esVigente(m, fechaHoy()))) {
          throw new ConflictException(
            'Esta persona ya es parte de la comunidad. Búscala en la lista.',
          );
        }
        if (usuario.correo.toLowerCase() !== dto.correo.toLowerCase()) {
          throw new ConflictException(MENSAJE_DATOS_NO_COINCIDEN);
        }
      }
      await this.cuentasService.asignarMembresia(
        manager,
        usuario.idUsuario,
        red.idRed,
        RolUsuario.RESIDENTE,
      );
      await this.cuentasService.asignarResidencia(
        manager,
        usuario.idUsuario,
        unidad.idUnidad,
        dto.tipoResidencia,
      );
      const token =
        cuentaNueva ||
        !(await this.cuentasService.tienePassword(manager, usuario.idUsuario))
          ? await this.authService.emitirTokenPassword(
              usuario.idUsuario,
              TipoTokenPassword.ACTIVACION,
              manager,
            )
          : null;
      await this.registrar(manager, red, idActor, 'invitar_residente', {
        idUsuario: usuario.idUsuario,
        idUnidad: unidad.idUnidad,
        tipoResidencia: dto.tipoResidencia,
        cuentaNueva,
      });
      return { usuario, token, comunidad, unidad };
    });

    await this.bitacoraService.marcarActividad(red.idRed);
    const { usuario, token, comunidad, unidad } = resultado;
    const correoEnviado = await this.mailService.enviar({
      para: usuario.correo,
      asunto: `Te invitaron a ${comunidad.nombre} en EntreCasas`,
      texto:
        `Hola ${usuario.nombre}:\n\n` +
        `La administración de ${comunidad.nombre} te registró como residente de la unidad ${unidad.numeroIdentificador}. ` +
        (token
          ? `Para activar tu cuenta, crea tu contraseña en este enlace (válido por 3 días):\n\n` +
            `${this.authService.urlRestablecer(token)}\n\n` +
            `Luego podrás ingresar con tu RUT o documento de identidad, o con un código que te enviaremos por correo.`
          : `Ya puedes entrar con tu cuenta actual y elegir ${comunidad.nombre} en el selector de comunidades.`),
    });
    return { ...(await this.persona(red, usuario.idUsuario)), correoEnviado };
  }

  async reenviarInvitacion(
    red: ContextoRed,
    idActor: number,
    idUsuario: number,
  ) {
    const { token, comunidad } = await this.dataSource.transaction(
      async (manager) => {
        await this.exigirActiva(manager, red, idUsuario);
        if (await this.cuentasService.tienePassword(manager, idUsuario)) {
          throw new ConflictException('Esta persona ya activó su cuenta');
        }
        const token = await this.authService.emitirTokenPassword(
          idUsuario,
          TipoTokenPassword.ACTIVACION,
          manager,
        );
        await this.registrar(manager, red, idActor, 'reenviar_invitacion', {
          idUsuario,
        });
        const comunidad = await manager.findOneByOrFail(RedVecinal, {
          idRed: red.idRed,
        });
        return { token, comunidad };
      },
    );
    const persona = await this.persona(red, idUsuario);
    const correoEnviado = await this.mailService.enviar({
      para: persona.correo,
      asunto: `Tu invitación a ${comunidad.nombre} en EntreCasas`,
      texto:
        `Hola ${persona.nombre}:\n\n` +
        `Te reenviamos el enlace para activar tu cuenta en ${comunidad.nombre}. ` +
        `Crea tu contraseña aquí (válido por 3 días):\n\n` +
        `${this.authService.urlRestablecer(token)}`,
    });
    return { correoEnviado };
  }

  async asignarCargo(
    red: ContextoRed,
    idActor: number,
    idUsuario: number,
    dto: AsignarCargoDto,
  ) {
    await this.dataSource.transaction(async (manager) => {
      await this.bloquearComunidad(manager, red);
      const vigentes = await this.exigirActiva(manager, red, idUsuario);
      if (vigentes.some((m) => m.idRol === dto.idRol)) {
        throw new ConflictException(
          `Esta persona ya es ${NOMBRE_ROL[dto.idRol]}`,
        );
      }
      let reemplaza: number[] = [];
      if (CARGOS_UNICOS.includes(dto.idRol)) {
        const titulares = await manager.find(Membresia, {
          where: {
            idRed: red.idRed,
            idRol: dto.idRol,
            idUsuario: Not(idUsuario),
            activo: true,
            ...condicionVigente(),
          },
        });
        reemplaza = titulares.map((m) => m.idUsuario);
        if (titulares.length) {
          await manager.update(
            Membresia,
            { idMembresia: In(titulares.map((m) => m.idMembresia)) },
            TERMINAR(),
          );
        }
      }
      await this.cuentasService.asignarMembresia(
        manager,
        idUsuario,
        red.idRed,
        dto.idRol,
        dto.hasta ?? null,
      );
      await this.registrar(manager, red, idActor, 'asignar_cargo', {
        idUsuario,
        cargo: NOMBRE_ROL[dto.idRol],
        hasta: dto.hasta ?? null,
        reemplaza,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.persona(red, idUsuario);
  }

  async quitarCargo(
    red: ContextoRed,
    idActor: number,
    idUsuario: number,
    idRol: number,
  ) {
    if (!CARGOS_ASIGNABLES.includes(idRol)) {
      throw new BadRequestException(
        'Ese cargo no se puede quitar. Para quitarle el acceso, desactiva la cuenta.',
      );
    }
    await this.dataSource.transaction(async (manager) => {
      const vigentes = await this.exigirActiva(manager, red, idUsuario);
      const cargo = vigentes.find((m) => m.idRol === idRol);
      if (!cargo) {
        throw new NotFoundException('Esta persona no tiene ese cargo vigente');
      }
      await manager.update(
        Membresia,
        { idMembresia: cargo.idMembresia },
        TERMINAR(),
      );
      await this.registrar(manager, red, idActor, 'quitar_cargo', {
        idUsuario,
        cargo: NOMBRE_ROL[idRol as RolUsuario],
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.persona(red, idUsuario);
  }

  async desactivar(red: ContextoRed, idActor: number, idUsuario: number) {
    if (idUsuario === idActor) {
      throw new BadRequestException('No puedes desactivar tu propia cuenta');
    }
    await this.dataSource.transaction(async (manager) => {
      const vigentes = await this.exigirActiva(manager, red, idUsuario);
      await manager.update(
        Membresia,
        { idMembresia: In(vigentes.map((m) => m.idMembresia)) },
        TERMINAR(),
      );
      const nuevosTitulares = await this.asegurarTitulares(
        manager,
        red,
        idUsuario,
      );
      await this.registrar(manager, red, idActor, 'desactivar_persona', {
        idUsuario,
        cargos: vigentes
          .filter((m) => m.idRol !== RolUsuario.RESIDENTE)
          .map((m) => NOMBRE_ROL[m.idRol]),
        nuevosTitulares,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.persona(red, idUsuario);
  }

  async reactivar(red: ContextoRed, idActor: number, idUsuario: number) {
    await this.dataSource.transaction(async (manager) => {
      const membresias = await this.exigirPersona(manager, red, idUsuario);
      if (membresias.some((m) => esVigente(m, fechaHoy()))) {
        throw new ConflictException(
          'La cuenta ya está activa en esta comunidad',
        );
      }
      const tieneVivienda = await manager.exists(Residencia, {
        where: {
          idUsuario,
          unidad: { idRed: red.idRed },
          ...condicionVigente(),
        },
      });
      if (!tieneVivienda) {
        throw new ConflictException(
          'No tiene una vivienda vigente en la comunidad. Invítala de nuevo indicando su unidad.',
        );
      }
      await this.cuentasService.asignarMembresia(
        manager,
        idUsuario,
        red.idRed,
        RolUsuario.RESIDENTE,
      );
      const nuevosTitulares = await this.asegurarTitulares(
        manager,
        red,
        idUsuario,
      );
      await this.registrar(manager, red, idActor, 'reactivar_persona', {
        idUsuario,
        nuevosTitulares,
      });
    });
    await this.bitacoraService.marcarActividad(red.idRed);
    return this.persona(red, idUsuario);
  }

  private async asegurarTitulares(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
  ) {
    const residencias = await manager.find(Residencia, {
      select: { idUnidad: true },
      where: { idUsuario, unidad: { idRed: red.idRed }, ...condicionVigente() },
    });
    const nuevosTitulares: { idUnidad: number; idUsuario: number }[] = [];
    for (const { idUnidad } of residencias) {
      const idTitular = await this.cuentasService.asegurarTitular(
        manager,
        red.idRed,
        idUnidad,
      );
      if (idTitular !== null) {
        nuevosTitulares.push({ idUnidad, idUsuario: idTitular });
      }
    }
    return nuevosTitulares;
  }

  private async persona(red: ContextoRed, idUsuario: number) {
    const [persona] = await this.personas(red, idUsuario);
    if (!persona) {
      throw new NotFoundException('Persona no encontrada');
    }
    return persona;
  }

  private async personas(red: ContextoRed, idUsuario?: number) {
    const membresias = await this.membresiasRepository.find({
      where: { idRed: red.idRed, ...(idUsuario ? { idUsuario } : {}) },
      relations: { usuario: true },
      order: { idMembresia: 'ASC' },
    });
    const porUsuario = new Map<number, Membresia[]>();
    for (const membresia of membresias) {
      if (membresia.usuario) {
        porUsuario.set(membresia.idUsuario, [
          ...(porUsuario.get(membresia.idUsuario) ?? []),
          membresia,
        ]);
      }
    }
    const ids = [...porUsuario.keys()];
    if (ids.length === 0) {
      return [];
    }
    const [residencias, conPassword] = await Promise.all([
      this.residenciasRepository.find({
        where: {
          idUsuario: In(ids),
          unidad: { idRed: red.idRed },
          ...condicionVigente(),
        },
        relations: { unidad: true },
        order: { idResidencia: 'ASC' },
      }),
      this.cuentasService.conPassword(this.dataSource.manager, ids),
    ]);
    const hoy = fechaHoy();

    return ids
      .map((id) => {
        const propias = porUsuario.get(id) ?? [];
        const usuario = propias[0].usuario;
        const vigentes = propias.filter((m) => esVigente(m, hoy));
        const estado =
          vigentes.length === 0
            ? EstadoPersona.DESACTIVADO
            : conPassword.has(id)
              ? EstadoPersona.ACTIVO
              : EstadoPersona.INVITADO;
        return {
          idUsuario: id,
          nombre: usuario.nombre,
          primerApellido: usuario.primerApellido,
          segundoApellido: usuario.segundoApellido,
          pais: usuario.pais,
          identificador: usuario.identificador,
          correo: usuario.correo,
          telefono: usuario.telefono,
          estado,
          enComunidadDesde: propias
            .map((m) => m.desde)
            .reduce((a, b) => (a < b ? a : b)),
          viviendas: residencias
            .filter((r) => r.idUsuario === id && r.unidad)
            .map((r) => ({
              idResidencia: r.idResidencia,
              idUnidad: r.idUnidad,
              numeroIdentificador: r.unidad.numeroIdentificador,
              callePasaje: r.unidad.callePasaje,
              tipoResidencia: r.tipo,
            })),
          cargos: vigentes
            .filter((m) => m.idRol !== RolUsuario.RESIDENTE)
            .map((m) => ({
              idRol: m.idRol,
              cargo: NOMBRE_ROL[m.idRol],
              desde: m.desde,
              hasta: m.hasta,
            })),
        };
      })
      .sort((a, b) => nombreCompleto(a).localeCompare(nombreCompleto(b), 'es'));
  }

  private membresiasDe(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
  ) {
    return manager.find(Membresia, {
      where: { idRed: red.idRed, idUsuario },
      lock: { mode: 'pessimistic_write' },
    });
  }

  private async exigirPersona(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
  ) {
    const membresias = await this.membresiasDe(manager, red, idUsuario);
    if (membresias.length === 0) {
      throw new NotFoundException('Persona no encontrada');
    }
    return membresias;
  }

  private async exigirActiva(
    manager: EntityManager,
    red: ContextoRed,
    idUsuario: number,
  ) {
    const membresias = await this.exigirPersona(manager, red, idUsuario);
    const vigentes = membresias.filter((m) => esVigente(m, fechaHoy()));
    if (vigentes.length === 0) {
      throw new ConflictException(
        'La cuenta de esta persona está desactivada en esta comunidad',
      );
    }
    return vigentes;
  }

  private async bloquearComunidad(manager: EntityManager, red: ContextoRed) {
    const comunidad = await manager.findOne(RedVecinal, {
      where: { idRed: red.idRed },
      lock: { mode: 'pessimistic_write' },
    });
    if (!comunidad) {
      throw new NotFoundException('Comunidad no encontrada');
    }
    return comunidad;
  }

  private registrar(
    manager: EntityManager,
    red: ContextoRed,
    idActor: number,
    accion: string,
    detalle: Record<string, unknown>,
  ) {
    return this.bitacoraService.registrar(
      {
        ambito: AmbitoBitacora.COMUNIDAD,
        idRed: red.idRed,
        idUsuario: idActor,
        accion,
        entidad: 'usuarios',
        idEntidad: detalle.idUsuario as number,
        detalle,
      },
      manager,
    );
  }
}
