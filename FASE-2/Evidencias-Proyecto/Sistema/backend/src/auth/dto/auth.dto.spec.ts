import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IdentificadorUsuarioDto } from './identificador-usuario.dto';
import { LoginDto } from './login.dto';
import { RestablecerPasswordDto } from './restablecer-password.dto';
import { VerificarCodigoDto } from './verificar-codigo.dto';

const validar = async <T extends object>(clase: new () => T, datos: object) => {
  const dto = plainToInstance(clase, datos);
  const errores = await validate(dto);
  return {
    dto,
    mensajes: errores.flatMap((error) =>
      Object.values(error.constraints ?? {}),
    ),
  };
};

const TOKEN_VALIDO = 'a'.repeat(40) + '_-9';

describe('IdentificadorUsuarioDto', () => {
  it('debe normalizar el RUT al formato de la BD', async () => {
    const { dto, mensajes } = await validar(IdentificadorUsuarioDto, {
      identificador: '12.345.678-5',
    });

    expect(mensajes).toEqual([]);
    expect(dto.identificador).toBe('12345678-5');
  });

  it('debe aceptar el país en minúsculas y normalizarlo', async () => {
    const { dto, mensajes } = await validar(IdentificadorUsuarioDto, {
      identificador: '12.345.678-5',
      pais: ' cl ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.pais).toBe('CL');
  });

  it('debe validar el identificador según el país (no exige DV fuera de Chile)', async () => {
    const { dto, mensajes } = await validar(IdentificadorUsuarioDto, {
      identificador: '30.123.456',
      pais: 'AR',
    });

    expect(mensajes).toEqual([]);
    expect(dto.identificador).toBe('30123456');
  });

  it('debe rechazar un identificador extranjero con caracteres no permitidos', async () => {
    const { mensajes } = await validar(IdentificadorUsuarioDto, {
      identificador: '30/12',
      pais: 'AR',
    });

    expect(mensajes).toEqual(['El identificador no es válido']);
  });

  it('debe rechazar un país que no sea un código de 2 letras', async () => {
    const { mensajes } = await validar(IdentificadorUsuarioDto, {
      identificador: '12345678-5',
      pais: 'CHL',
    });

    expect(mensajes).toEqual(['El país no es válido']);
  });

  it('debe rechazar un RUT con dígito verificador incorrecto', async () => {
    const { mensajes } = await validar(IdentificadorUsuarioDto, {
      identificador: '12.345.678-9',
    });

    expect(mensajes).toEqual(['El RUT no es válido']);
  });

  it('debe normalizar el correo a minúsculas sin espacios', async () => {
    const { dto, mensajes } = await validar(IdentificadorUsuarioDto, {
      correo: '  Ana@Correo.CL ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.correo).toBe('ana@correo.cl');
  });

  it('debe rechazar un correo más largo que la columna', async () => {
    const { mensajes } = await validar(IdentificadorUsuarioDto, {
      correo: `${'a'.repeat(95)}@correo.cl`,
    });

    expect(mensajes).toContain(
      'correo must be shorter than or equal to 100 characters',
    );
  });

  it('debe exigir RUT o correo', async () => {
    const { mensajes } = await validar(IdentificadorUsuarioDto, {});

    expect(mensajes).toContain(
      'Debes ingresar tu RUT, documento de identidad o correo',
    );
  });

  it('debe ignorar un correo y un país vacíos cuando viene el identificador', async () => {
    const { dto, mensajes } = await validar(IdentificadorUsuarioDto, {
      identificador: '12.345.678-5',
      correo: '',
      pais: ' ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.identificador).toBe('12345678-5');
    expect(dto.correo).toBeUndefined();
    expect(dto.pais).toBeUndefined();
  });

  it('debe usar el correo cuando el identificador viene vacío', async () => {
    const { dto, mensajes } = await validar(IdentificadorUsuarioDto, {
      identificador: '',
      correo: 'Ana@Correo.cl',
    });

    expect(mensajes).toEqual([]);
    expect(dto.identificador).toBeUndefined();
    expect(dto.correo).toBe('ana@correo.cl');
  });
});

describe('LoginDto', () => {
  it('debe rechazar una contraseña de más de 72 bytes aunque tenga 72 caracteres', async () => {
    const { mensajes } = await validar(LoginDto, {
      identificador: '12345678-5',
      password: 'ñ'.repeat(72),
    });

    expect(mensajes).toEqual(['Credenciales inválidas']);
  });
});

describe('VerificarCodigoDto', () => {
  it('debe aceptar un código de 6 dígitos aunque venga con espacios', async () => {
    const { dto, mensajes } = await validar(VerificarCodigoDto, {
      identificador: '12345678-5',
      codigo: ' 123 456 ',
    });

    expect(mensajes).toEqual([]);
    expect(dto.codigo).toBe('123456');
  });

  it.each([['12345'], ['1234567'], ['12a456']])(
    'debe rechazar el código %s',
    async (codigo) => {
      const { mensajes } = await validar(VerificarCodigoDto, {
        identificador: '12345678-5',
        codigo,
      });

      expect(mensajes).toEqual(['El código debe tener 6 dígitos']);
    },
  );
});

describe('RestablecerPasswordDto', () => {
  it('debe aceptar un token de 43 caracteres base64url y una contraseña válida', async () => {
    const { mensajes } = await validar(RestablecerPasswordDto, {
      token: TOKEN_VALIDO,
      password: 'clave1234',
    });

    expect(mensajes).toEqual([]);
  });

  it.each([
    ['corto', 'a'.repeat(42)],
    ['largo', 'a'.repeat(44)],
    ['con caracteres fuera de base64url', 'a'.repeat(42) + '+'],
  ])('debe rechazar un token %s', async (_caso, token) => {
    const { mensajes } = await validar(RestablecerPasswordDto, {
      token,
      password: 'clave1234',
    });

    expect(mensajes).toEqual(['El enlace no es válido o ya expiró']);
  });

  it('debe aceptar 72 bytes exactos y rechazar 73', async () => {
    const de72 = '1' + 'a'.repeat(69) + 'ñ';
    const de73 = de72 + 'a';

    const aceptada = await validar(RestablecerPasswordDto, {
      token: TOKEN_VALIDO,
      password: de72,
    });
    const rechazada = await validar(RestablecerPasswordDto, {
      token: TOKEN_VALIDO,
      password: de73,
    });

    expect(aceptada.mensajes).toEqual([]);
    expect(rechazada.mensajes).toEqual([
      'La contraseña no puede superar 72 caracteres (las tildes y la ñ cuentan doble)',
    ]);
  });

  it.each([
    [
      'sin número',
      'claveclave',
      'La contraseña debe incluir al menos un número',
    ],
    ['sin letra', '12345678', 'La contraseña debe incluir al menos una letra'],
    ['corta', 'clave1', 'La contraseña debe tener al menos 8 caracteres'],
  ])('debe rechazar una contraseña %s', async (_caso, password, mensaje) => {
    const { mensajes } = await validar(RestablecerPasswordDto, {
      token: TOKEN_VALIDO,
      password,
    });

    expect(mensajes).toEqual([mensaje]);
  });
});
