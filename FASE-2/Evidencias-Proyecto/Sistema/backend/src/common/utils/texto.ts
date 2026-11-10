export const recortar = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export const recortarOpcional = ({ value }: { value: unknown }) => {
  const recortado = recortar({ value });
  return recortado === '' ? undefined : recortado;
};

export const quitarEspacios = ({ value }: { value: unknown }) => {
  const limpio = typeof value === 'string' ? value.replace(/\s/g, '') : value;
  return limpio === '' ? undefined : limpio;
};

export const limpiarTelefono = ({ value }: { value: unknown }) => {
  const limpio =
    typeof value === 'string' ? value.replace(/[\s()-]/g, '') : value;
  return limpio === '' ? undefined : limpio;
};

export const escaparLike = (texto: string) => texto.replace(/[\\%_]/g, '\\$&');

export const normalizarTextoLargo = ({ value }: { value: unknown }) =>
  recortarOpcional({
    value: typeof value === 'string' ? value.replace(/\r\n?/g, '\n') : value,
  });
