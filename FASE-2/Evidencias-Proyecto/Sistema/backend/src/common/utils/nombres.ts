export const nombreCompleto = (persona: {
  nombre: string;
  primerApellido: string;
  segundoApellido: string | null;
}) =>
  [persona.nombre, persona.primerApellido, persona.segundoApellido]
    .filter(Boolean)
    .join(' ');
