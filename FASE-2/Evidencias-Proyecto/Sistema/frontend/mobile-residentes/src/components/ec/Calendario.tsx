import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { F, useTema } from '@/constants/tema';
import Texto from './Texto';

const pad = (n: number) => String(n).padStart(2, '0');
const iso = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const mesAnio = new Intl.DateTimeFormat('es-CL', { month: 'long', year: 'numeric' });
const DIAS_SEMANA = ['L', 'M', 'M', 'J', 'V', 'S', 'D'];
const NOMBRES_DIA = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];

// Calendario mensual para elegir un día entre `desde` y `hasta` (YYYY-MM-DD). La semana parte el lunes, como en Chile.
export default function Calendario({ valor, onCambio, desde, hasta }: { valor: string | null; onCambio: (dia: string) => void; desde: string; hasta: string }) {
  const t = useTema();
  const inicial = new Date(`${valor ?? desde}T12:00:00`);
  const [mes, setMes] = useState(new Date(inicial.getFullYear(), inicial.getMonth(), 1));

  const primerMes = new Date(`${desde}T12:00:00`);
  const ultimoMes = new Date(`${hasta}T12:00:00`);
  const puedeAtras = mes > new Date(primerMes.getFullYear(), primerMes.getMonth(), 1);
  const puedeAdelante = mes < new Date(ultimoMes.getFullYear(), ultimoMes.getMonth(), 1);
  const mover = (n: number) => setMes(new Date(mes.getFullYear(), mes.getMonth() + n, 1));

  // Celdas vacías antes del día 1 (lunes = 0) y luego los días del mes, en filas de 7
  const vacias = (mes.getDay() + 6) % 7;
  const totalDias = new Date(mes.getFullYear(), mes.getMonth() + 1, 0).getDate();
  const celdas: (string | null)[] = [
    ...Array.from({ length: vacias }, () => null),
    ...Array.from({ length: totalDias }, (_, i) => iso(new Date(mes.getFullYear(), mes.getMonth(), i + 1))),
  ];
  while (celdas.length % 7) celdas.push(null);
  const semanas = Array.from({ length: celdas.length / 7 }, (_, i) => celdas.slice(i * 7, i * 7 + 7));
  const hoy = iso(new Date());
  const nombreMes = mesAnio.format(mes);
  const titulo = nombreMes.charAt(0).toUpperCase() + nombreMes.slice(1);

  const flecha = (n: number, habilitada: boolean, etiqueta: string) => (
    <Pressable
      onPress={() => mover(n)} disabled={!habilitada} accessibilityRole="button" accessibilityLabel={etiqueta} hitSlop={6}
      style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', opacity: habilitada ? 1 : 0.3 }}
    >
      <Ionicons name={n < 0 ? 'chevron-back' : 'chevron-forward'} size={22} color={t.ink} />
    </Pressable>
  );

  return (
    <View style={{ backgroundColor: t.surface, borderRadius: 12, borderWidth: 1, borderColor: t.line, padding: 8, gap: 4 }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        {flecha(-1, puedeAtras, 'Mes anterior')}
        <Texto v="fuerte" accessibilityRole="header">{titulo}</Texto>
        {flecha(1, puedeAdelante, 'Mes siguiente')}
      </View>
      <View style={{ flexDirection: 'row' }}>
        {DIAS_SEMANA.map((d, i) => (
          <Texto key={i} v="chico" style={{ flex: 1, textAlign: 'center', fontFamily: F.etiqueta }}>{d}</Texto>
        ))}
      </View>
      {semanas.map((semana, i) => (
        <View key={i} style={{ flexDirection: 'row' }}>
          {semana.map((dia, j) => {
            if (!dia) return <View key={j} style={{ flex: 1, height: 44 }} />;
            const fuera = dia < desde || dia > hasta;
            const activo = dia === valor;
            const esHoy = dia === hoy;
            return (
              <Pressable
                key={j} disabled={fuera} onPress={() => onCambio(dia)}
                accessibilityRole="button" accessibilityState={{ selected: activo, disabled: fuera }}
                accessibilityLabel={`${NOMBRES_DIA[j]} ${Number(dia.slice(8))}`}
                style={{ flex: 1, height: 44, alignItems: 'center', justifyContent: 'center' }}
              >
                <View style={{
                  width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: activo ? t.accion : 'transparent', borderWidth: esHoy && !activo ? 1.5 : 0, borderColor: t.accion,
                }}>
                  <Texto style={{ fontFamily: activo ? F.cifra : F.numero, fontSize: 16, color: activo ? t.accionInk : fuera ? t.ink2 : t.ink, opacity: fuera ? 0.35 : 1 }}>
                    {Number(dia.slice(8))}
                  </Texto>
                </View>
              </Pressable>
            );
          })}
        </View>
      ))}
    </View>
  );
}
