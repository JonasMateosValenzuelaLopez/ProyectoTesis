import type { DiaSemana } from '@/api/tipos';

// Contenido fijo que no viene de la base de datos.

// Días de la semana como los guarda la API (enum DiaSemana de comunidad-guia.entity.ts)
export const DIAS_SEMANA: DiaSemana[] = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

// Números de emergencia de Chile: la guía y los contactos siempre los muestran
export const EMERGENCIAS = [
  { nombre: 'Ambulancia (SAMU)', telefono: '131' },
  { nombre: 'Bomberos', telefono: '132' },
  { nombre: 'Carabineros', telefono: '133' },
  { nombre: 'PDI', telefono: '134' },
];

// Columnas TIME (13:00:00) como se muestran (13:00)
export const hora = (t: string) => t.slice(0, 5);
