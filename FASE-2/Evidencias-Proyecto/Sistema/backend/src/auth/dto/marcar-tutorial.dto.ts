import { IsEnum } from 'class-validator';

export enum LadoTutorial {
  APP = 'app',
  PANEL = 'panel',
}

export class MarcarTutorialDto {
  @IsEnum(LadoTutorial, { message: "El lado debe ser 'app' o 'panel'" })
  lado: LadoTutorial;
}
