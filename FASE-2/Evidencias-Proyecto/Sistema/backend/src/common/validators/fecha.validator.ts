import { registerDecorator } from 'class-validator';
import { esFechaValida } from '../utils/fechas';
import { fechaHoy } from '../utils/vigencia';

const decoradorDeFecha =
  (nombre: string, mensaje: string, validar: (valor: string) => boolean) =>
  () =>
  (objeto: object, propiedad: string) => {
    registerDecorator({
      name: nombre,
      target: objeto.constructor,
      propertyName: propiedad,
      options: { message: mensaje },
      validator: {
        validate: (valor: unknown) =>
          typeof valor === 'string' && validar(valor),
      },
    });
  };

export const EsFecha = decoradorDeFecha(
  'esFecha',
  'La fecha debe tener el formato AAAA-MM-DD y existir',
  esFechaValida,
);

export const NoFutura = decoradorDeFecha(
  'noFutura',
  'La fecha no puede ser futura',
  (valor) => valor <= fechaHoy(),
);

export const NoPasada = decoradorDeFecha(
  'noPasada',
  'La fecha no puede ser anterior a hoy',
  (valor) => valor >= fechaHoy(),
);
