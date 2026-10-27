import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { IdentificadorUsuarioDto } from './identificador-usuario.dto';
import { LoginDto } from './login.dto';
import { RestablecerPasswordDto } from './restablecer-password.dto';

// Igual que el ValidationPipe global: transforma y luego valida.
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
    // Act
    const { dto, mensajes } = await validar(IdentificadorUsuarioDto, {
      rut: '12.345.678-5',
    });

    // Assert
    expect(mensajes).toEqual([]);
    expect(dto.rut).toBe('12345678-5');
  });

  it('debe rechazar un RUT con dígito verificador incorrecto', async () => {
    // Act
    const { mensajes } = await validar(IdentificadorUsuarioDto, {
      rut: '12.345.678-9',
    });

    // Assert
    expect(mensajes).toEqual(['El RUT no es válido']);
  });

  it('debe normalizar el correo a minúsculas sin espacios', async () => {
    // Act
    const { dto, mensajes } = await validar(IdentificadorUsuarioDto, {
      correo: '  Ana@Correo.CL ',
    });

    // Assert
    expect(mensajes).toEqual([]);
    expect(dto.correo).toBe('ana@correo.cl');
  });

  it('debe rechazar un correo más largo que la columna', async () => {
    // Act
    const { mensajes } = await validar(IdentificadorUsuarioDto, {
      correo: `${'a'.repeat(95)}@correo.cl`,
    });

    // Assert
    expect(mensajes).toContain(
      'correo must be shorter than or equal to 100 characters',
    );
  });

  it('debe exigir RUT o correo', async () => {
    // Act
    const { mensajes } = await validar(IdentificadorUsuarioDto, {});

    // Assert
    expect(mensajes).toContain('Debes ingresar tu RUT o tu correo');
  });
});

describe('LoginDto', () => {
  it('debe rechazar una contraseña de más de 72 bytes aunque tenga 72 caracteres', async () => {
    // Act
    const { mensajes } = await validar(LoginDto, {
      rut: '12345678-5',
      password: 'ñ'.repeat(72),
    });

    // Assert
    expect(mensajes).toEqual(['Credenciales inválidas']);
  });
});

describe('RestablecerPasswordDto', () => {
  it('debe aceptar un token de 43 caracteres base64url y una contraseña válida', async () => {
    // Act
    const { mensajes } = await validar(RestablecerPasswordDto, {
      token: TOKEN_VALIDO,
      password: 'clave1234',
    });

    // Assert
    expect(mensajes).toEqual([]);
  });

  it.each([
    ['corto', 'a'.repeat(42)],
    ['largo', 'a'.repeat(44)],
    ['con caracteres fuera de base64url', 'a'.repeat(42) + '+'],
  ])('debe rechazar un token %s', async (_caso, token) => {
    // Act
    const { mensajes } = await validar(RestablecerPasswordDto, {
      token,
      password: 'clave1234',
    });

    // Assert
    expect(mensajes).toEqual(['El enlace no es válido o ya expiró']);
  });

  it('debe aceptar 72 bytes exactos y rechazar 73', async () => {
    // Arrange: 'ñ' ocupa 2 bytes en UTF-8.
    const de72 = '1' + 'a'.repeat(69) + 'ñ';
    const de73 = de72 + 'a';

    // Act
    const aceptada = await validar(RestablecerPasswordDto, {
      token: TOKEN_VALIDO,
      password: de72,
    });
    const rechazada = await validar(RestablecerPasswordDto, {
      token: TOKEN_VALIDO,
      password: de73,
    });

    // Assert
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
    // Act
    const { mensajes } = await validar(RestablecerPasswordDto, {
      token: TOKEN_VALIDO,
      password,
    });

    // Assert
    expect(mensajes).toEqual([mensaje]);
  });
});
