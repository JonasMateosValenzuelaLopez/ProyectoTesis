import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '@/context/App';
import { F, useTema } from '@/constants/tema';
import { TIPOS_FICHA, diaISO, type TipoFicha } from '@/data/demo';
import { fechaLargaTexto, normalizarTelefono, telefono } from '@/utils/formato';
import { FICHA } from '@/utils/hogar';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';
import Calendario from '@/components/ec/Calendario';

const masMeses = (desde: string | null, meses: number) => {
  const d = desde ? new Date(`${desde}T12:00:00`) : new Date();
  d.setMonth(d.getMonth() + meses);
  return diaISO(d);
};
const haceAnios = (n: number) => masMeses(null, -12 * n);

// Fecha opcional: muestra la elegida y abre un calendario; `rapidas` llena la fecha con un toque
function CampoFecha({ etiqueta, valor, onCambio, desde, hasta, rapidas = [], error }:
  { etiqueta: string; valor: string | null; onCambio: (v: string | null) => void; desde: string; hasta: string; rapidas?: { texto: string; valor: string }[]; error?: string | false }) {
  const t = useTema();
  const [abierto, setAbierto] = useState(false);
  return (
    <View style={{ gap: 8 }}>
      <Texto style={{ fontFamily: F.etiqueta, fontSize: 14, lineHeight: 18, color: t.ink2 }}>{etiqueta}</Texto>
      <Pressable
        onPress={() => setAbierto(!abierto)} accessibilityRole="button" accessibilityLabel={`${etiqueta}: ${valor ? fechaLargaTexto(valor) : 'sin fecha'}`}
        style={{ minHeight: 52, borderRadius: 14, borderWidth: abierto ? 2 : 1, borderColor: error ? t.bad : abierto ? t.accion : t.lineStrong, backgroundColor: t.surface, paddingHorizontal: 16, flexDirection: 'row', alignItems: 'center', gap: 10 }}
      >
        <Ionicons name="calendar-outline" size={20} color={t.ink2} />
        <Texto style={{ flex: 1, color: valor ? t.ink : t.placeholder, fontSize: 17 }}>{valor ? `${fechaLargaTexto(valor)} de ${valor.slice(0, 4)}` : 'Elegir fecha'}</Texto>
        {!!valor && (
          <Pressable onPress={() => onCambio(null)} accessibilityRole="button" accessibilityLabel={`Quitar ${etiqueta.toLowerCase()}`} hitSlop={10}>
            <Ionicons name="close-circle" size={20} color={t.ink2} />
          </Pressable>
        )}
      </Pressable>
      {rapidas.length > 0 && (
        <Opciones valor={rapidas.find((r) => r.valor === valor)?.valor ?? null} onCambio={(v) => { onCambio(v); setAbierto(false); }} opciones={rapidas.map((r) => ({ valor: r.valor, texto: r.texto }))} />
      )}
      {abierto && <Calendario valor={valor} desde={desde} hasta={hasta} onCambio={(d) => { onCambio(d); setAbierto(false); }} />}
      {!!error && <Texto v="chico" color={t.bad}>{error}</Texto>}
    </View>
  );
}

// Agregar o editar una ficha de Mi hogar. Primero el tipo; después solo los campos que ese tipo usa.
export default function FormFicha() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { misFichas, acciones } = useApp();
  const previa = id ? misFichas.find((x) => x.id_ficha === Number(id)) : undefined;
  const [tipo, setTipo] = useState<TipoFicha>(previa?.tipo ?? 'Mantención');
  const [f, setF] = useState({
    titulo: previa?.titulo ?? '', detalle: previa?.detalle ?? '', contacto_nombre: previa?.contacto_nombre ?? '',
    telefono: telefono(previa?.contacto_telefono), fecha: previa?.fecha ?? null as string | null, fecha_vence: previa?.fecha_vence ?? null as string | null,
  });
  const [intento, setIntento] = useState(false);
  const c = FICHA[tipo];
  const hoy = diaISO();

  const usaTelefono = c.contacto || c.telefono;
  const tel = usaTelefono && f.telefono.trim() ? normalizarTelefono(f.telefono, { fijo: true }) : null;
  const errores = {
    titulo: !f.titulo.trim() && `Escribe ${c.titulo.toLowerCase()}`,
    detalle: (tipo === 'Pintura' || tipo === 'Medida') && !f.detalle.trim() && `Escribe ${c.detalle.toLowerCase()}`,
    vence: !!c.vence && !f.fecha_vence && 'Elige la fecha para poder avisarte',
    orden: !!c.vence && !!f.fecha && !!f.fecha_vence && f.fecha_vence <= f.fecha && `Tiene que ser después de «${c.fecha!.toLowerCase()}»`,
    telefono: usaTelefono && !!f.telefono.trim() && !tel && 'Escribe un teléfono de 9 dígitos, por ejemplo 9 6123 4501',
  };
  const hayError = Object.values(errores).some(Boolean);

  const guardar = () => {
    setIntento(true);
    if (hayError) return;
    acciones.guardarFicha({
      id_ficha: previa?.id_ficha, tipo, titulo: f.titulo.trim(), detalle: f.detalle.trim() || null,
      contacto_nombre: c.contacto ? f.contacto_nombre.trim() || null : null,
      contacto_telefono: tel,
      fecha: c.fecha ? f.fecha : null, fecha_vence: c.vence ? f.fecha_vence : null,
    });
    router.back();
  };

  const rapidas = tipo === 'Mantención'
    ? [{ texto: 'En 6 meses', valor: masMeses(f.fecha, 6) }, { texto: 'En 1 año', valor: masMeses(f.fecha, 12) }]
    : tipo === 'Garantía' ? [{ texto: '1 año', valor: masMeses(f.fecha, 12) }, { texto: '2 años', valor: masMeses(f.fecha, 24) }] : [];

  return (
    <Hoja titulo={previa ? 'Editar ficha' : 'Agregar ficha'} abajo={<Boton texto={previa ? 'Guardar cambios' : 'Guardar ficha'} onPress={guardar} />}>
      {!previa && (
        <Opciones
          etiqueta="¿Qué quieres guardar?" valor={tipo} onCambio={(v) => { setTipo(v); setIntento(false); }}
          opciones={TIPOS_FICHA.map((x) => ({ valor: x, texto: x }))}
        />
      )}
      <Campo etiqueta={c.titulo} value={f.titulo} onChangeText={(v) => setF({ ...f, titulo: v })} placeholder={c.ejemploTitulo} maxLength={100} error={intento && errores.titulo} />
      <Campo
        etiqueta={c.detalle} value={f.detalle} onChangeText={(v) => setF({ ...f, detalle: v })} placeholder={c.ejemploDetalle}
        multiline style={{ minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }} error={intento && errores.detalle}
      />
      {c.fecha && <CampoFecha etiqueta={c.fecha} valor={f.fecha} onCambio={(v) => setF({ ...f, fecha: v })} desde={haceAnios(15)} hasta={hoy} />}
      {c.vence && (
        <CampoFecha
          etiqueta={c.vence} valor={f.fecha_vence} onCambio={(v) => setF({ ...f, fecha_vence: v })} desde={haceAnios(3)} hasta={masMeses(null, 120)}
          rapidas={rapidas} error={intento && (errores.vence || errores.orden)}
        />
      )}
      {c.contacto && <Campo etiqueta="Quién la hizo (opcional)" value={f.contacto_nombre} onChangeText={(v) => setF({ ...f, contacto_nombre: v })} placeholder="Nombre del técnico o empresa" maxLength={100} />}
      {usaTelefono && (
        <Campo
          etiqueta={c.telefono ? 'Teléfono (opcional)' : 'Su teléfono (opcional)'} value={f.telefono} onChangeText={(v) => setF({ ...f, telefono: v })}
          keyboardType="phone-pad" placeholder="+56 9 6123 4501" error={intento && errores.telefono}
        />
      )}
      {c.vence && <Texto v="chico">Te avisamos en Inicio desde 30 días antes de la fecha.</Texto>}
    </Hoja>
  );
}
