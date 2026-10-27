export enum RolUsuario {
  ADMINISTRADOR = 1,
  TESORERO = 2,
  SECRETARIO = 3,
  PRESIDENTE = 4,
  CONSERJE = 5,
  RESIDENTE = 6,
}

export const NOMBRE_ROL: Record<RolUsuario, string> = {
  [RolUsuario.ADMINISTRADOR]: 'Administrador',
  [RolUsuario.TESORERO]: 'Tesorero',
  [RolUsuario.SECRETARIO]: 'Secretario',
  [RolUsuario.PRESIDENTE]: 'Presidente',
  [RolUsuario.CONSERJE]: 'Conserje',
  [RolUsuario.RESIDENTE]: 'Residente',
};
