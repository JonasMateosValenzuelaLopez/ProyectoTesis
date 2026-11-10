import { Response } from 'express';
import {
  asignarIdSolicitud,
  HEADER_ID_SOLICITUD,
  SolicitudConId,
} from './id-solicitud.middleware';

describe('asignarIdSolicitud', () => {
  it('debe asignar un id nuevo a la solicitud, devolverlo en el header y continuar', () => {
    const solicitud = {} as SolicitudConId;
    const respuesta = { setHeader: jest.fn() };
    const siguiente = jest.fn();

    asignarIdSolicitud(solicitud, respuesta as unknown as Response, siguiente);

    expect(solicitud.idSolicitud).toMatch(/^[0-9a-f]{12}$/);
    expect(respuesta.setHeader).toHaveBeenCalledWith(
      HEADER_ID_SOLICITUD,
      solicitud.idSolicitud,
    );
    expect(siguiente).toHaveBeenCalled();
  });

  it('debe generar un id distinto en cada solicitud', () => {
    const ids = new Set(
      Array.from({ length: 50 }, () => {
        const solicitud = {} as SolicitudConId;
        asignarIdSolicitud(
          solicitud,
          { setHeader: jest.fn() } as unknown as Response,
          jest.fn(),
        );
        return solicitud.idSolicitud;
      }),
    );

    expect(ids.size).toBe(50);
  });
});
