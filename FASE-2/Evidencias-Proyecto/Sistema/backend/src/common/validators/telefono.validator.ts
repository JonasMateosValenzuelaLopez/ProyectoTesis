import { Matches } from 'class-validator';

export const EsTelefono = () =>
  Matches(/^\+\d{8,14}$/, {
    message: 'El teléfono debe tener el formato +56912345678',
  });
