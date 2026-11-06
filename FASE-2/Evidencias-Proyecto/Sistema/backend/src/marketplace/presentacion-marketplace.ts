import { Unidad } from '../unidades/entities/unidad.entity';
import { MarketplacePublicacion } from './entities/marketplace-publicacion.entity';

export const persona = (
  nombres: Map<number, string>,
  idUsuario: number | null,
) =>
  idUsuario === null
    ? null
    : { idUsuario, nombre: nombres.get(idUsuario) ?? null };

export const vivienda = (unidad: Unidad | null | undefined) =>
  unidad
    ? {
        idUnidad: unidad.idUnidad,
        numeroIdentificador: unidad.numeroIdentificador,
        torre: unidad.torre,
      }
    : null;

export const serializarAviso = (
  aviso: MarketplacePublicacion,
  nombres: Map<number, string>,
) => ({
  idProducto: aviso.idProducto,
  tipo: aviso.tipo,
  titulo: aviso.titulo,
  descripcion: aviso.descripcion,
  precio: aviso.precio,
  fecha: aviso.fechaPublicacion ?? aviso.fechaCreacion,
  cerradoEn: aviso.cerradoEn,
  autor: persona(nombres, aviso.idUsuario),
  unidad: vivienda(aviso.unidad),
  estadoModeracion: aviso.estadoModeracion,
  moderadoEn: aviso.moderadoEn,
});
