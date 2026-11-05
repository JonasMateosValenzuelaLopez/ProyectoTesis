import { randomBytes } from 'node:crypto';
import { NextFunction, Request, Response } from 'express';

export const HEADER_ID_SOLICITUD = 'X-Request-Id';

export type SolicitudConId = Request & { idSolicitud?: string };

export const nuevoIdSolicitud = () => randomBytes(6).toString('hex');

export function asignarIdSolicitud(
  solicitud: SolicitudConId,
  respuesta: Response,
  siguiente: NextFunction,
) {
  solicitud.idSolicitud = nuevoIdSolicitud();
  respuesta.setHeader(HEADER_ID_SOLICITUD, solicitud.idSolicitud);
  siguiente();
}
