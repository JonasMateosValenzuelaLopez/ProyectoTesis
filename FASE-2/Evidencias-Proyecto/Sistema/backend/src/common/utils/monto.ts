import { ValueTransformer } from 'typeorm';

export const columnaMonto: ValueTransformer = {
  to: (valor: number | null | undefined) => valor,
  from: (valor: string | null) => (valor === null ? null : Number(valor)),
};
