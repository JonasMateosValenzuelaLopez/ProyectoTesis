// Igual al enum `RolUsuario` del backend (common/enums/rol.enum.ts): el panel trabaja con `idRol`.
export const RolUsuario = {
  ADMINISTRADOR: 1,
  TESORERO: 2,
  SECRETARIO: 3,
  PRESIDENTE: 4,
  CONSERJE: 5,
  RESIDENTE: 6,
};

// Cargos con los que se trabaja en el panel. Residente usa la app.
export const ROLES_PANEL = [RolUsuario.ADMINISTRADOR, RolUsuario.PRESIDENTE, RolUsuario.TESORERO, RolUsuario.SECRETARIO, RolUsuario.CONSERJE];

// Plataforma no es un rol del backend (es `usuario.esPlataforma`): esta clave solo elige el sello y el tutorial.
export const PLATAFORMA = 'plataforma';

// Cargos del panel que tiene la persona en una comunidad del perfil (`comunidades[].roles`)
export const rolesPanel = (comunidad) => (comunidad?.roles ?? [])
  .map((r) => r.idRol)
  .filter((idRol) => ROLES_PANEL.includes(idRol))
  .sort((a, b) => ROLES_PANEL.indexOf(a) - ROLES_PANEL.indexOf(b));

// Como el backend (roles.guard.ts): sin administrador externo, el Presidente también administra.
// El perfil lo trae calculado en `presidenteAdministra`.
export const rolesEfectivos = (idRol, comunidad) => (
  idRol === RolUsuario.PRESIDENTE && comunidad?.presidenteAdministra
    ? [RolUsuario.PRESIDENTE, RolUsuario.ADMINISTRADOR]
    : [idRol]
);

// Comunidades del perfil donde la persona tiene un cargo del panel, con esos cargos
export const comunidadesPanel = (usuario) => (usuario?.comunidades ?? [])
  .map((comunidad) => ({ comunidad, roles: rolesPanel(comunidad) }))
  .filter((g) => g.roles.length > 0);
