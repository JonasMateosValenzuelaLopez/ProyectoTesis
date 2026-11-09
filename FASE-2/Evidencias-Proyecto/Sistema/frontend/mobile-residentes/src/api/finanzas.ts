import { api } from './cliente';
import type { MiCuenta } from './tipos';

// Finanzas del residente (finanzas.controller.ts y egresos-exenciones.controller.ts). Exigen el módulo «cobros».

// Cuenta de cada vivienda de la persona en la comunidad elegida, con los datos para transferir
export const miCuenta = () => api<MiCuenta>('/finanzas/mi-cuenta');

// «Ya transferí»: el backend reparte el monto entre los cobros pendientes sin aviso, del más antiguo al más nuevo.
// La fecha no puede ser futura y el monto es un entero entre 1 y 99.999.999.
export type DatosAviso = { idUnidad: number; monto: number; fechaPago: string; observacion?: string };
export const avisarTransferencia = (datos: DatosAviso) => api<{ avisos: number }>('/finanzas/avisos', { metodo: 'POST', cuerpo: datos });

// Pedir que no se cobre un cobro pendiente: primero lo revisa Tesorería y después decide la Presidencia
export const solicitarExencion = (idCobroUnidad: number, motivo: string) =>
  api<{ idExencion: number; estado: string }>('/finanzas/mi-cuenta/exenciones', { metodo: 'POST', cuerpo: { idCobroUnidad, motivo } });

export const MAX_MONTO = 99_999_999;
export const MAX_TEXTO = 255;
