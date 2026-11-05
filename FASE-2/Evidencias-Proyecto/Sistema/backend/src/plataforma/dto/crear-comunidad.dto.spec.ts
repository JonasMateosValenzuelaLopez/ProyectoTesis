import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CodigoModulo } from '../../common/enums/modulo.enum';
import { mensajesDeValidacion } from '../../common/utils/validacion';
import { TipoRedVecinal } from '../../redes-vecinales/entities/red-vecinal.entity';
import { CrearComunidadDto } from './crear-comunidad.dto';

const validar = async (datos: object) => {
  const dto = plainToInstance(CrearComunidadDto, datos);
  return { dto, mensajes: mensajesDeValidacion(await validate(dto)) };
};

const valido = {
  nombre: 'Condominio Los Robles',
  direccion: 'Av. Los Robles 1200, Temuco',
  tipo: TipoRedVecinal.CONDOMINIO,
  estructura: { norte: 10, sur: 10 },
  modulos: [CodigoModulo.MURO, CodigoModulo.COBROS],
  espacios: ['Quincho'],
  responsable: {
    identificador: '12.345.678-5',
    nombre: 'Ana',
    primerApellido: 'Soto',
    correo: 'Ana@Correo.cl',
  },
};

describe('CrearComunidadDto', () => {
  it('debe aceptar una comunidad completa y normalizar el RUT y el correo', async () => {
    const { dto, mensajes } = await validar(valido);

    expect(mensajes).toEqual([]);
    expect(dto.responsable.identificador).toBe('12345678-5');
    expect(dto.responsable.correo).toBe('ana@correo.cl');
  });

  it('debe aceptar una comunidad sin módulos ni espacios', async () => {
    const { mensajes } = await validar({
      ...valido,
      modulos: [],
      espacios: undefined,
    });

    expect(mensajes).toEqual([]);
  });

  it('debe recortar los nombres de los espacios', async () => {
    const { dto } = await validar({ ...valido, espacios: ['  Quincho  '] });

    expect(dto.espacios).toEqual(['Quincho']);
  });

  it('debe pasar la torre a mayúsculas', async () => {
    const { dto, mensajes } = await validar({
      ...valido,
      tipo: TipoRedVecinal.EDIFICIO,
      estructura: { torre: ' b ', pisos: 8, porPiso: 4 },
    });

    expect(mensajes).toEqual([]);
    expect(dto.estructura.torre).toBe('B');
  });

  it.each([
    [{ nombre: '  ' }, 'El nombre de la comunidad es obligatorio'],
    [{ direccion: '' }, 'La dirección es obligatoria'],
    [{ tipo: 'Parcela' }, 'El tipo debe ser Villa, Condominio o Edificio'],
    [{ estructura: undefined }, 'Indica la estructura de las unidades'],
    [{ estructura: { sur: 3 } }, 'Indica las casas del lado norte'],
    [
      { estructura: { norte: 3, manzanas: 2 } },
      'manzanas no corresponde a una comunidad de tipo Condominio',
    ],
    [
      { estructura: { norte: 201 } },
      'Las casas del lado norte deben ser entre 1 y 200',
    ],
    [
      { estructura: { norte: 1.5 } },
      'Las casas del lado norte deben ser entre 1 y 200',
    ],
    [{ modulos: ['pagos'] }, 'Hay un módulo que no existe'],
    [{ modulos: ['muro', 'muro'] }, 'No repitas módulos'],
    [{ modulos: undefined }, 'Los módulos deben ser una lista'],
    [{ espacios: ['Quincho', 'quincho '] }, 'No repitas espacios comunes'],
    [{ espacios: ['  '] }, 'Un espacio común no tiene nombre'],
    [
      { espacios: Array.from({ length: 21 }, (_, i) => `Sala ${i}`) },
      'Puedes crear hasta 20 espacios comunes',
    ],
    [{ responsable: undefined }, 'Indica los datos del responsable'],
    [
      { responsable: { ...valido.responsable, identificador: '12.345.678-9' } },
      'El RUT no es válido',
    ],
    [
      { responsable: { ...valido.responsable, correo: 'ana' } },
      'El correo del responsable no es válido',
    ],
    [
      { responsable: { ...valido.responsable, nombre: '' } },
      'El nombre del responsable es obligatorio',
    ],
  ])('con %j debe responder «%s»', async (cambios, mensaje) => {
    const { mensajes } = await validar({ ...valido, ...cambios });

    expect(mensajes).toContain(mensaje);
  });

  it.each([
    [{ pisos: 61, porPiso: 4 }, 'Los pisos deben ser un número entre 1 y 60'],
    [
      { pisos: 8, porPiso: 31 },
      'Los departamentos por piso deben ser entre 1 y 30',
    ],
    [
      { torre: 'ABCD', pisos: 8, porPiso: 4 },
      'La torre debe tener de 1 a 3 letras o números',
    ],
  ])(
    'en un edificio con %j debe responder «%s»',
    async (estructura, mensaje) => {
      const { mensajes } = await validar({
        ...valido,
        tipo: TipoRedVecinal.EDIFICIO,
        estructura,
      });

      expect(mensajes).toContain(mensaje);
    },
  );

  it('en una villa con más de 26 manzanas debe rechazarla', async () => {
    const { mensajes } = await validar({
      ...valido,
      tipo: TipoRedVecinal.VILLA,
      estructura: { manzanas: 27, casasPorManzana: 10 },
    });

    expect(mensajes).toContain('Las manzanas deben ser entre 1 y 26');
  });
});
