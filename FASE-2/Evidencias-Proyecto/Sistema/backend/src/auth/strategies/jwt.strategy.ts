import {
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import {
  JwtPayload,
  UsuarioAutenticado,
} from '../../common/interfaces/jwt-payload.interface';
import { Usuario } from '../../usuarios/entities/usuario.entity';
import { MENSAJE_CUENTA_BLOQUEADA } from '../auth.constantes';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuariosRepository: Repository<Usuario>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow<string>('JWT_SECRET'),
    });
  }

  async validate(payload: JwtPayload): Promise<UsuarioAutenticado> {
    if (!Number.isInteger(payload.sub) || payload.sub <= 0) {
      throw new UnauthorizedException('Sesión inválida');
    }
    const usuario = await this.usuariosRepository.findOneBy({
      idUsuario: payload.sub,
    });

    if (!usuario) {
      throw new UnauthorizedException('Sesión inválida');
    }
    if (usuario.bloqueado) {
      throw new ForbiddenException(MENSAJE_CUENTA_BLOQUEADA);
    }
    if (
      usuario.passwordActualizadaEn &&
      (payload.iat ?? 0) <
        Math.floor(usuario.passwordActualizadaEn.getTime() / 1000)
    ) {
      throw new UnauthorizedException(
        'Tu contraseña cambió. Inicia sesión nuevamente.',
      );
    }

    return { idUsuario: usuario.idUsuario, esPlataforma: usuario.esPlataforma };
  }
}
