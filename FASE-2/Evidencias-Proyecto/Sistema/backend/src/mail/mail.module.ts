import { Global, Module } from '@nestjs/common';
import { CorreosComunidadService } from './correos-comunidad.service';
import { MailService } from './mail.service';

@Global()
@Module({
  providers: [MailService, CorreosComunidadService],
  exports: [MailService, CorreosComunidadService],
})
export class MailModule {}
