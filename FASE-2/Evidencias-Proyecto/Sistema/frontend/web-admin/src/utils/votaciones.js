// Participación de una votación: una unidad, un voto.
export function resultado(votacion, totalUnidades) {
  const votos = votacion.opciones.reduce((s, o) => s + o.votos, 0);
  const participacion = totalUnidades ? (votos / totalUnidades) * 100 : 0;
  const ordenadas = [...votacion.opciones].sort((a, b) => b.votos - a.votos);
  const empate = ordenadas.length > 1 && ordenadas[0].votos === ordenadas[1].votos;
  return {
    votos, participacion, faltan: totalUnidades - votos,
    alcanzaQuorum: votacion.quorum == null || participacion >= votacion.quorum,
    ganadora: votos && !empate ? ordenadas[0] : null,
  };
}
