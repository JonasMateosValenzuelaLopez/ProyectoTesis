import { useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSesion } from '@/context/Sesion';
import { useTema } from '@/constants/tema';
import * as votacionesApi from '@/api/votaciones';
import { mensajeDe } from '@/api/cliente';
import { useConsulta } from '@/api/useConsulta';
import { fechaLargaTexto, nombreUnidad } from '@/utils/formato';
import Hoja from '@/components/ec/Hoja';
import Texto from '@/components/ec/Texto';
import Boton from '@/components/ec/Boton';
import Opciones from '@/components/ec/Opciones';
import { Barras, Participacion, estadoVivienda } from '@/components/ec/TarjetaVotacion';

// Votar (POST votaciones/:id/votos): una vivienda, un voto, a través de su titular. No se puede cambiar.
export default function Votar() {
  const t = useTema();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { unidad, acciones } = useSesion();
  const { datos, error, recargar, setDatos } = useConsulta(votacionesApi.listarVotaciones, [id]);
  const [eleccion, setEleccion] = useState<string | null>(null);
  const [errorVoto, setErrorVoto] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  if (!datos) {
    return (
      <Hoja titulo="Votación">
        {error ? (
          <>
            <Texto color={t.bad}>{error.message}</Texto>
            <Boton tipo="texto" texto="Reintentar" onPress={recargar} />
          </>
        ) : <ActivityIndicator color={t.accion} accessibilityLabel="Cargando la votación" />}
      </Hoja>
    );
  }
  const v = datos.find((x) => x.idVotacion === Number(id));
  if (!v || !unidad) return <Hoja titulo="Votación"><Texto>No encontramos esta votación.</Texto></Hoja>;
  const { voto, puedeVotar } = estadoVivienda(v, unidad.idUnidad);

  const enviar = async () => {
    if (!eleccion) return;
    setEnviando(true);
    setErrorVoto(null);
    try {
      const nueva = await votacionesApi.votar(v.idVotacion, Number(eleccion), unidad.idUnidad);
      setDatos((lista) => (lista ?? []).map((x) => (x.idVotacion === nueva.idVotacion ? nueva : x)));
      acciones.avisar('Tu voto quedó registrado. ¡Gracias por participar!');
    } catch (e) {
      setErrorVoto(mensajeDe(e));
    } finally {
      setEnviando(false);
    }
  };

  // Ya votó la vivienda, la votación cerró o esta persona no es titular: solo ve lo que entrega la API
  if (!puedeVotar) {
    return (
      <Hoja titulo={v.tipo} abajo={<Boton texto="Listo" onPress={() => router.back()} />}>
        <Texto v="titulo">{v.titulo}</Texto>
        {v.descripcion && <Texto>{v.descripcion}</Texto>}
        {v.resultado ? <Barras v={v} marcada={voto} /> : null}
        <Participacion v={v} />
        {!voto && v.estado === 'Abierta' && (
          <Texto v="suave">En tu vivienda vota la persona titular: un voto por vivienda. Si crees que debería ser tuya, habla con la administración.</Texto>
        )}
      </Hoja>
    );
  }

  return (
    <Hoja
      titulo={v.tipo === 'Votación' ? 'Votar' : 'Responder encuesta'}
      abajo={<Boton texto="Enviar mi voto" disabled={!eleccion} cargando={enviando} onPress={enviar} />}
    >
      <Texto v="titulo">{v.titulo}</Texto>
      {v.descripcion && <Texto>{v.descripcion}</Texto>}
      <Texto v="suave">Cierra el {fechaLargaTexto(v.fechaCierre)}. Votas por {nombreUnidad(unidad)}: un voto por vivienda, y no se puede cambiar después.</Texto>
      <Opciones valor={eleccion} onCambio={setEleccion} opciones={v.opciones.map((o) => ({ valor: String(o.idOpcion), texto: o.texto }))} />
      {errorVoto && <Texto color={t.bad}>{errorVoto}</Texto>}
    </Hoja>
  );
}
