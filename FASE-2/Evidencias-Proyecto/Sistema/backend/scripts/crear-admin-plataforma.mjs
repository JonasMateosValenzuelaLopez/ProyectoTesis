import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { join } from 'node:path';
import mysql from 'mysql2/promise';
import bcrypt from 'bcryptjs';

process.loadEnvFile(join(import.meta.dirname, '..', '.env'));

const dv = (cuerpo) => {
  let suma = 0, m = 2;
  for (const d of [...cuerpo].reverse()) { suma += Number(d) * m; m = m === 7 ? 2 : m + 1; }
  const r = 11 - (suma % 11);
  return r === 11 ? '0' : r === 10 ? 'K' : String(r);
};
const normalizarRut = (v) => {
  const l = v.replace(/[.\-\s]/g, '').toUpperCase();
  if (!/^\d{7,8}[0-9K]$/.test(l)) return null;
  return dv(l.slice(0, -1)) === l.slice(-1) ? `${l.slice(0, -1)}-${l.slice(-1)}` : null;
};
const claveValida = (c) => c.length >= 8 && Buffer.byteLength(c) <= 72 && /[A-Za-zÁÉÍÓÚÑáéíóúñ]/.test(c) && /\d/.test(c);
const fallar = (m) => { console.error(m); process.exit(1); };
const largoMaximo = (valor, max, campo) => { if (valor && valor.length > max) fallar(`${campo} no puede superar ${max} caracteres.`); return valor; };

const rl = createInterface({ input: stdin, output: stdout });
const p = async (t) => (await rl.question(t)).trim();
const rut = normalizarRut(await p('RUT: ')) ?? fallar('RUT no válido.');
const nombre = largoMaximo((await p('Nombre: ')) || fallar('El nombre es obligatorio.'), 50, 'El nombre');
const primerApellido = largoMaximo((await p('Primer apellido: ')) || fallar('El primer apellido es obligatorio.'), 50, 'El primer apellido');
const segundoApellido = largoMaximo((await p('Segundo apellido (opcional): ')) || null, 50, 'El segundo apellido');
const correo = largoMaximo((await p('Correo: ')).toLowerCase(), 100, 'El correo');
if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) fallar('Correo no válido.');
const clave = await p('Contraseña (mín. 8 caracteres, una letra y un número): ');
rl.close();
if (!claveValida(clave)) fallar('La contraseña no cumple las reglas.');

const db = await mysql.createConnection({
  host: process.env.DB_HOST, port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER, password: process.env.DB_PASSWORD ?? '', database: process.env.DB_NAME,
  charset: 'utf8mb4_unicode_ci',
});
try {
  const [r] = await db.execute(
    `INSERT INTO usuarios (identificador, pais, nombre, primer_apellido, segundo_apellido, correo, password_hash, es_plataforma)
     VALUES (?, 'CL', ?, ?, ?, ?, ?, 1)`,
    [rut, nombre, primerApellido, segundoApellido, correo, await bcrypt.hash(clave, 10)],
  );
  console.log(`Listo: cuenta de Plataforma #${r.insertId} para ${rut}. Entra al panel con ese RUT y tu contraseña.`);
} catch (e) {
  if (e.code === 'ER_DUP_ENTRY') fallar('Ya existe una cuenta con ese RUT o correo.');
  throw e;
} finally {
  await db.end();
}
