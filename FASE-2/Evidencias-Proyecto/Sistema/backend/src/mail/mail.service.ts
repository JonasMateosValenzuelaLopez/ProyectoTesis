import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

export interface CorreoSaliente {
  para: string;
  asunto: string;
  texto: string;
}

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

  async enviar(correo: CorreoSaliente): Promise<boolean> {
    if (!this.transporter) {
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
