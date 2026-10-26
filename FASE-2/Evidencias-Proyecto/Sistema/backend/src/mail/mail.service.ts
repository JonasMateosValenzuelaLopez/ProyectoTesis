import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface CorreoSaliente {
  para: string;
  asunto: string;
  texto: string;
}

// Para los logs: deja ver a quién era el correo sin guardar el dato completo
// ("ana@correo.cl" -> "a***@correo.cl").
export function enmascararCorreo(correo: string): string {
  const [usuario, dominio] = correo.split('@');
  return dominio ? `${usuario.slice(0, 1)}***@${dominio}` : '***';
}

@Injectable()
export class MailService implements OnModuleInit {
  private readonly logger = new Logger(MailService.name);
  private readonly transporter: Transporter | null;
  private readonly remitente: string;
  private readonly frontendUrl: string;

  constructor(configService: ConfigService) {
    // Sin FRONTEND_URL todos los enlaces de los correos quedarían rotos.
    const frontendUrl = configService.get<string>('FRONTEND_URL')?.trim();
    if (!frontendUrl) {
      throw new Error('FRONTEND_URL no está configurada (ver .env.example).');
    }
    this.frontendUrl = frontendUrl.replace(/\/$/, '');

    const host = configService.get<string>('SMTP_HOST');
    this.remitente = configService.get<string>(
      'MAIL_FROM',
      'EntreCasas <no-responder@entrecasas.cl>',
    );
    this.transporter = host
      ? createTransport({
          host,
          port: Number(configService.get<string>('SMTP_PORT', '587')),
          secure: configService.get<string>('SMTP_SECURE') === 'true',
          auth: {
            user: configService.get<string>('SMTP_USER'),
            pass: configService.get<string>('SMTP_PASS'),
          },
        })
      : null;
  }

  // Detecta al arrancar credenciales o host SMTP malos, que de otro modo solo
  // aparecerían al fallar el primer correo. No detiene la app: un SMTP caído
  // un momento no debe impedir el login.
  async onModuleInit() {
    if (!this.transporter) {
      return;
    }
    try {
      await this.transporter.verify();
    } catch (error) {
      this.logger.error(
        'No se pudo conectar al servidor SMTP; los correos no se enviarán.',
        error instanceof Error ? error.stack : String(error),
      );
    }
  }

  urlFrontend(ruta: string): string {
    return `${this.frontendUrl}${ruta}`;
  }

  // Nunca lanza: un fallo de correo no debe romper la operación que lo origina.
  // Devuelve true solo si el correo se entregó al servidor SMTP.
  async enviar(correo: CorreoSaliente): Promise<boolean> {
    if (!this.transporter) {
      // El contenido puede traer enlaces para cambiar contraseñas: solo se
      // imprime si NODE_ENV=development está declarado explícitamente.
      if (process.env.NODE_ENV !== 'development') {
        this.logger.error(
          `SMTP_HOST no configurado; no se envió "${correo.asunto}".`,
        );
        return false;
      }
      this.logger.warn(
        `SMTP_HOST no configurado; correo no enviado.\n` +
          `Para: ${correo.para}\nAsunto: ${correo.asunto}\n\n${correo.texto}`,
      );
      return false;
    }
    try {
      await this.transporter.sendMail({
        from: this.remitente,
        to: correo.para,
        subject: correo.asunto,
        text: correo.texto,
      });
      return true;
    } catch (error) {
      this.logger.error(
        `No se pudo enviar el correo "${correo.asunto}" a ${enmascararCorreo(correo.para)}`,
        error instanceof Error ? error.stack : String(error),
      );
      return false;
    }
  }
}
