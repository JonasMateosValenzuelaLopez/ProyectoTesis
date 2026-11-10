// Estado conjunto de varias consultas de una pantalla (los Inicio juntan datos de varios módulos).
// `consultas`: [{ nombre, consulta }] solo con las que de verdad se piden (las de módulos apagados no van).
// - `fallidas`: las que respondieron con error;
// - `pendientes`: las que todavía no traen su primera respuesta;
// - `completo`: todas respondieron bien, así que «nada pendiente» es cierto.
export function estadoConsultas(consultas) {
  const fallidas = consultas.filter((c) => c.consulta.error);
  const pendientes = consultas.filter((c) => !c.consulta.error && c.consulta.datos == null);
  return { fallidas, pendientes, completo: fallidas.length === 0 && pendientes.length === 0 };
}
