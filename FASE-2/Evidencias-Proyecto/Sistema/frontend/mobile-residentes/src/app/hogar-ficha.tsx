import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSesion } from '@/context/Sesion';
import { F, useTema } from '@/constants/tema';
import * as hogar from '@/api/hogar';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import { diaLocal } from '@/api/useMiCuenta';
import type { FichaHogar, TipoFicha } from '@/api/tipos';
import { fechaLargaTexto, normalizarTelefono, telefono } from '@/utils/formato';
import { FICHA, TIPOS_FICHA } from '@/utils/hogar';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Campo from '@/components/ec/Campo';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';
import Calendario from '@/components/ec/Calendario';

const masMeses = (desde: string | null, meses: number) => {
  const d = desde ? new Date(`${desde}T12:00:00`) : new Date();
  d.setMonth(d.getMonth() + meses);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

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

// Agregar (POST unidades/:id/fichas) o editar (PUT fichas/:id) una ficha de Mi hogar.
// Primero el tipo; después solo los campos que ese tipo usa, como exige el backend.
function Formulario({ previa }: { previa: FichaHogar | null }) {
  const t = useTema();
  const { unidad, acciones } = useSesion();
  const [tipo, setTipo] = useState<TipoFicha>(previa?.tipo ?? 'Mantención');
  const [f, setF] = useState({
    titulo: previa?.titulo ?? '', detalle: previa?.detalle ?? '', contactoNombre: previa?.contactoNombre ?? '',
    telefono: telefono(previa?.contactoTelefono), fecha: previa?.fecha ?? null as string | null, fechaVence: previa?.fechaVence ?? null as string | null,
  });
  const [intento, setIntento] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  if (!unidad) return null;
  const c = FICHA[tipo];
  const hoy = diaLocal(0);

  const usaTelefono = !!c.telefono;
  const tel = usaTelefono && f.telefono.trim() ? normalizarTelefono(f.telefono, { fijo: true }) : null;
  const errores = {
    titulo: !f.titulo.trim() && `Escribe ${c.titulo.toLowerCase()}`,
    detalle: c.detalleObligatorio && !f.detalle.trim() && `Escribe ${c.detalle.toLowerCase()}`,
    vence: !!c.vence && !f.fechaVence && 'Elige la fecha para poder avisarte',
    orden: !!c.vence && !!f.fecha && !!f.fechaVence && f.fechaVence <= f.fecha && `Tiene que ser después de «${c.fecha!.replace(' (opcional)', '').toLowerCase()}»`,
    telefono: usaTelefono && !!f.telefono.trim() && !tel && 'Escribe un teléfono de 9 dígitos, por ejemplo 9 6123 4501',
  };
  const hayError = Object.values(errores).some(Boolean);

  const guardar = async () => {
    setIntento(true);
    if (hayError) return;
    const datos: hogar.DatosFicha = {
      tipo, titulo: f.titulo.trim(),
      ...(f.detalle.trim() ? { detalle: f.detalle.trim() } : {}),
      ...(c.contacto && f.contactoNombre.trim() ? { contactoNombre: f.contactoNombre.trim() } : {}),
      ...(tel ? { contactoTelefono: tel } : {}),
      ...(c.fecha && f.fecha ? { fecha: f.fecha } : {}),
      ...(c.vence && f.fechaVence ? { fechaVence: f.fechaVence } : {}),
    };
    setEnviando(true);
    setError(null);
    try {
      if (previa) await hogar.actualizarFicha(previa.idFicha, datos);
      else await hogar.crearFicha(unidad.idUnidad, datos);
      acciones.avisar(previa ? 'Ficha actualizada.' : 'Ficha guardada en Mi hogar.');
      router.back();
    } catch (e) {
      setError(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  const rapidas = tipo === 'Mantención'
    ? [{ texto: 'En 6 meses', valor: masMeses(f.fecha, 6) }, { texto: 'En 1 año', valor: masMeses(f.fecha, 12) }]
    : tipo === 'Garantía' ? [{ texto: '1 año', valor: masMeses(f.fecha, 12) }, { texto: '2 años', valor: masMeses(f.fecha, 24) }] : [];

  return (
    <Hoja titulo={previa ? 'Editar ficha' : 'Agregar ficha'} abajo={<Boton texto={previa ? 'Guardar cambios' : 'Guardar ficha'} cargando={enviando} onPress={guardar} />}>
      {!previa && (
        <Opciones
          etiqueta="¿Qué quieres guardar?" valor={tipo} onCambio={(v) => { setTipo(v); setIntento(false); setError(null); }}
          opciones={TIPOS_FICHA.map((x) => ({ valor: x, texto: x }))}
        />
      )}
      <Campo etiqueta={c.titulo} value={f.titulo} onChangeText={(v) => setF({ ...f, titulo: v })} placeholder={c.ejemploTitulo} maxLength={100} error={intento && errores.titulo} />
      <Campo
        etiqueta={c.detalle} value={f.detalle} onChangeText={(v) => setF({ ...f, detalle: v })} placeholder={c.ejemploDetalle} maxLength={2000}
        multiline style={{ minHeight: 80, paddingTop: 12, textAlignVertical: 'top' }} error={intento && errores.detalle}
      />
      {c.fecha && <CampoFecha etiqueta={c.fecha} valor={f.fecha} onCambio={(v) => setF({ ...f, fecha: v })} desde={masMeses(null, -12 * 15)} hasta={hoy} />}
      {c.vence && (
        <CampoFecha
          etiqueta={c.vence} valor={f.fechaVence} onCambio={(v) => setF({ ...f, fechaVence: v })} desde={masMeses(null, -36)} hasta={masMeses(null, 120)}
          rapidas={rapidas} error={intento && (errores.vence || errores.orden)}
        />
      )}
      {c.contacto && <Campo etiqueta="Quién la hizo (opcional)" value={f.contactoNombre} onChangeText={(v) => setF({ ...f, contactoNombre: v })} placeholder="Nombre del técnico o empresa" maxLength={100} />}
      {usaTelefono && (
        <Campo
          etiqueta={tipo === 'Técnico' ? 'Teléfono (opcional)' : 'Su teléfono (opcional)'} value={f.telefono} onChangeText={(v) => setF({ ...f, telefono: v })}
          keyboardType="phone-pad" placeholder="+56 9 6123 4501" error={intento && errores.telefono}
        />
      )}
      {c.vence && <Texto v="chico">Te avisamos en Inicio desde 30 días antes de la fecha.</Texto>}
      {error && <Texto color={t.bad}>{error}</Texto>}
    </Hoja>
  );
}

export default function FormFicha() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { unidad } = useSesion();
  const fichas = useConsulta(() => (id && unidad ? hogar.listarFichas(unidad.idUnidad) : Promise.resolve(null)), [id, unidad?.idUnidad]);
  if (!id) return <Formulario previa={null} />;
  if (!fichas.datos) {
    return <Hoja titulo="Editar ficha">{fichas.error ? <Texto color={t.bad}>{fichas.error.message}</Texto> : <ActivityIndicator color={t.accion} accessibilityLabel="Cargando la ficha" />}</Hoja>;
  }
  const previa = fichas.datos.find((x) => x.idFicha === Number(id));
  if (!previa) return <Hoja titulo="Editar ficha"><Texto>Esta ficha ya no está.</Texto></Hoja>;
  return <Formulario previa={previa} />;
}
