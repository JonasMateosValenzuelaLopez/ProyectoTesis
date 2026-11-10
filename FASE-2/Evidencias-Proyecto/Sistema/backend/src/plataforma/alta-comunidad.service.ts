import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AuthService } from '../auth/auth.service';
import { TipoTokenPassword } from '../auth/entities/token-password.entity';
import { BitacoraService } from '../bitacora/bitacora.service';
import { AmbitoBitacora } from '../bitacora/entities/bitacora-auditoria.entity';
import { CodigoModulo } from '../common/enums/modulo.enum';
import { NOMBRE_ROL, RolUsuario } from '../common/enums/rol.enum';
import { PAIS_POR_DEFECTO } from '../common/validators/identificador.validator';
import { MailService } from '../mail/mail.service';
import { RedModulo } from '../redes-vecinales/entities/red-modulo.entity';
import { RedVecinal } from '../redes-vecinales/entities/red-vecinal.entity';
import { EspacioComun } from '../reservas/entities/espacio-comun.entity';
import { Unidad } from '../unidades/entities/unidad.entity';
import { CuentasService } from '../usuarios/cuentas.service';
import { CrearComunidadDto } from './dto/crear-comunidad.dto';
import { generarUnidades } from './estructura-unidades';
import { PlataformaService } from './plataforma.service';

const UNIDADES_POR_INSERCION = 500;

@Injectable()
export class AltaComunidadService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly bitacoraService: BitacoraService,
    private readonly authService: AuthService,
    private readonly mailService: MailService,
    private readonly plataformaService: PlataformaService,
    private readonly cuentasService: CuentasService,
  ) {}

  async crear(idUsuarioPlataforma: number, dto: CrearComunidadDto) {
    const unidades = generarUnidades(dto.tipo, dto.estructura);
    const espacios = dto.espacios ?? [];
    const cargo = dto.modulos.includes(CodigoModulo.ADMINISTRADOR_EXTERNO)
      ? RolUsuario.ADMINISTRADOR
      : RolUsuario.PRESIDENTE;

    const { idRed, responsable, tokenActivacion } =
      await this.dataSource.transaction(async (manager) => {
        const { identifiers } = await manager.insert(RedVecinal, {
          nombre: dto.nombre,
          direccion: dto.direccion,
          tipo: dto.tipo,
          creadaPor: idUsuarioPlataforma,
        });
        const idRed = identifiers[0].idRed as number;

        for (let i = 0; i < unidades.length; i += UNIDADES_POR_INSERCION) {
          await manager.insert(
            Unidad,
            unidades
              .slice(i, i + UNIDADES_POR_INSERCION)
              .map((unidad) => ({ ...unidad, idRed })),
          );
        }
        if (dto.modulos.length) {
          await manager.insert(
            RedModulo,
            dto.modulos.map((codigoModulo) => ({
              idRed,
              codigoModulo,
              activo: true,
              actualizadoPor: idUsuarioPlataforma,
            })),
          );
        }
        if (espacios.length) {
          await manager.insert(
            EspacioComun,
            espacios.map((nombre) => ({ idRed, nombre, estado: true })),
          );
        }

        const { usuario, cuentaNueva } =
          await this.cuentasService.obtenerOCrear(
            manager,
            {
              ...dto.responsable,
              pais: dto.responsable.pais ?? PAIS_POR_DEFECTO,
            },
            {
              correoAjeno:
                'El correo del responsable ya está registrado por otra persona',
              bloqueada:
                'La cuenta del responsable está bloqueada. Desbloquéala antes de asignarle una comunidad.',
            },
          );
        await this.cuentasService.asignarMembresia(
          manager,
          usuario.idUsuario,
          idRed,
          cargo,
        );
        const requiereActivacion =
          cuentaNueva ||
          !(await this.cuentasService.tienePassword(
            manager,
            usuario.idUsuario,
          ));
        const tokenActivacion = requiereActivacion
          ? await this.authService.emitirTokenPassword(
              usuario.idUsuario,
              TipoTokenPassword.ACTIVACION,
              manager,
            )
          : null;

        await this.bitacoraService.registrar(
          {
            ambito: AmbitoBitacora.PLATAFORMA,
            idRed,
            idUsuario: idUsuarioPlataforma,
            accion: 'crear_comunidad',
            entidad: 'redes_vecinales',
            idEntidad: idRed,
            detalle: {
              nombre: dto.nombre,
              tipo: dto.tipo,
              unidades: unidades.length,
              modulos: dto.modulos,
              espacios,
              responsable: {
                idUsuario: usuario.idUsuario,
                cargo: NOMBRE_ROL[cargo],
                cuentaNueva,
              },
            },
          },
          manager,
        );
        return { idRed, responsable: usuario, tokenActivacion };
      });

    const correoEnviado = await this.mailService.enviar({
      para: responsable.correo,
      asunto: `Tu comunidad ${dto.nombre} ya está en EntreCasas`,
      texto:
        `Hola ${responsable.nombre}:\n\n` +
        `El equipo EntreCasas creó la comunidad ${dto.nombre} y te asignó como ${NOMBRE_ROL[cargo]}. ` +
        (tokenActivacion
          ? `Para activar tu cuenta, crea tu contraseña en este enlace (válido por 3 días):\n\n` +
            `${this.authService.urlRestablecer(tokenActivacion)}\n\n` +
            `Luego podrás ingresar con tu RUT o documento de identidad, o con un código que te enviaremos por correo.`
          : `Ya puedes entrar con tu cuenta actual y elegir ${dto.nombre} en el selector de comunidades. ` +
            `Si no recuerdas tu contraseña, usa "¿Olvidaste tu contraseña?" al iniciar sesión.`),
    });

    return {
      ...(await this.plataformaService.resumenDe(idRed)),
      correoEnviado,
    };
  }
}
