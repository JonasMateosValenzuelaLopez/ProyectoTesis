import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import * as bcrypt from 'bcryptjs';
import mysql from 'mysql2/promise';
import { BD_PRUEBAS } from './entorno';

const SCRIPT_BD = join(__dirname, '..', '..', '..', 'bd', 'entrecasas_db.sql');

const conectar = (baseDatos?: string) =>
  mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD ?? '',
    database: baseDatos,
    charset: 'utf8mb4_unicode_ci',
    multipleStatements: true,
  });

export async function recrearBdPruebas() {
  const script = readFileSync(SCRIPT_BD, 'utf8').replaceAll(
    '`entrecasas_db`',
    `\`${BD_PRUEBAS}\``,
  );
  const conexion = await conectar();
  try {
    await conexion.query(script);
  } finally {
    await conexion.end();
  }
}

export async function ejecutarSql(sql: string, valores: unknown[] = []) {
  const conexion = await conectar(BD_PRUEBAS);
  try {
    const [resultado] = await conexion.query(sql, valores);
    return resultado;
  } finally {
    await conexion.end();
  }
}

export async function crearCuentaPlataforma(
  identificador: string,
  correo: string,
  password: string,
) {
  await ejecutarSql(
    `INSERT INTO usuarios (identificador, pais, nombre, primer_apellido, correo, password_hash, es_plataforma)
     VALUES (?, 'CL', 'Equipo', 'EntreCasas', ?, ?, 1)`,
    [identificador, correo, await bcrypt.hash(password, 10)],
  );
}

export async function definirPassword(identificador: string, password: string) {
  await ejecutarSql(
    'UPDATE usuarios SET password_hash = ? WHERE identificador = ?',
    [await bcrypt.hash(password, 10), identificador],
  );
}
