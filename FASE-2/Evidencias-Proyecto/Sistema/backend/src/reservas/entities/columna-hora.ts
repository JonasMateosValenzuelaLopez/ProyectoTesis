import { ValueTransformer } from 'typeorm';

export const columnaHora: ValueTransformer = {
  to: (valor: string | null | undefined) => valor,
  from: (valor: string | null) => (valor === null ? null : valor.slice(0, 5)),
};
