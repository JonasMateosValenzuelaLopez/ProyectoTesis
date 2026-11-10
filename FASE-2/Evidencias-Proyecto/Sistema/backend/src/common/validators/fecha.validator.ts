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

const FECHA_HORA_CON_ZONA =
  /^\d{4}-\d{2}-\d{2}T([01]\d|2[0-3]):[0-5]\d(:[0-5]\d(\.\d{1,3})?)?(Z|[+-](0\d|1[0-4]):[0-5]\d)$/;

export const esFechaHoraConZona = (valor: string) =>
  FECHA_HORA_CON_ZONA.test(valor) &&
  !Number.isNaN(new Date(valor).getTime()) &&
  esFechaValida(valor.slice(0, 10));

export const EsFechaHora = decoradorDeFecha(
  'esFechaHora',
  'La fecha y hora debe venir en formato ISO 8601 con zona, por ejemplo 2026-11-06T18:00:00Z',
  esFechaHoraConZona,
);
