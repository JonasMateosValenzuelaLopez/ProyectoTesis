// Ids de la tabla `roles` (ver bd/entrecasas_db.sql).
export enum RolUsuario {
  ADMINISTRACION = 1,
  TESORERO = 2,
  SECRETARIO = 3,
  PRESIDENTE = 4,
  CONSERJE = 5,
  RESIDENTE = 6,
  VISITANTE = 7,
}

// Nombre esperado de cada id en la tabla `roles`. RolesService lo compara al
// arrancar: si los ids no coinciden, los permisos quedarían cruzados.
export const NOMBRE_ROL: Record<RolUsuario, string> = {
  [RolUsuario.ADMINISTRACION]: 'Administración',
  [RolUsuario.TESORERO]: 'Tesorero Vecinos',
  [RolUsuario.SECRETARIO]: 'Secretario Vecinos',
  [RolUsuario.PRESIDENTE]: 'Presidente Vecinos',
  [RolUsuario.CONSERJE]: 'Conserje',
  [RolUsuario.RESIDENTE]: 'Residente',
  [RolUsuario.VISITANTE]: 'Visitante',
};
