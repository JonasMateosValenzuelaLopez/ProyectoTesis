import { keyframes } from '@emotion/react';
import { Box, Typography } from '@mui/material';
import {
  CheckCircle as OkIcon, NotificationsActive as AvisoIcon, QrCode2 as QrIcon, Phone as TelIcon,
  Visibility as VisibleIcon, Description as ActaIcon,
} from '@mui/icons-material';

// Escenas animadas del tutorial del panel: una versión en miniatura de la pantalla real, con un dedo
// que toca y el estado que cambia. Cada escena dura un ciclo de DURACION y se repite.
// Los tiempos (`en`, `sale`) son porcentajes del ciclo. Con «reducir movimiento» no hay animación y se
// ve el estado final. Son decorativas (aria-hidden): el texto del paso dice lo mismo.

const DURACION = '6s';
const reducido = '@media (prefers-reduced-motion: reduce)';

const aparece = (en, sale, desde) => keyframes`
  0% { opacity: ${en < 0 ? 1 : 0}; transform: ${en < 0 ? 'none' : desde}; }
  ${Math.max(en, 0)}% { opacity: ${en < 0 ? 1 : 0}; transform: ${en < 0 ? 'none' : desde}; }
  ${Math.max(en, 0) + 5}% { opacity: 1; transform: none; }
  ${sale ?? 94}% { opacity: 1; transform: none; }
  ${(sale ?? 94) + 4}% { opacity: 0; transform: none; }
  100% { opacity: 0; transform: none; }
`;

// Aparece en `en`% y se va en `sale`% (si no hay `sale`, al final del ciclo). en < 0 = visible desde el inicio.
export function Entra({ en = 0, sale, como = 'sube', sx, children, component = 'div' }) {
  const desde = como === 'sube' ? 'translateY(10px)' : como === 'sello' ? 'scale(1.7) rotate(-12deg)' : 'none';
  return (
    <Box component={component} sx={{
      animation: `${aparece(en, sale, desde)} ${DURACION} linear infinite`,
      [reducido]: { animation: 'none', opacity: sale != null ? 0 : 1 },
      ...sx,
    }}>
      {children}
    </Box>
  );
}

// Estados en el mismo lugar, uno después del otro. `cambios` = cuándo pasa al siguiente.
export function Estados({ cambios, children, sx }) {
  const lista = [children].flat();
  return (
    <Box sx={{ display: 'grid', ...sx }}>
      {lista.map((c, i) => (
        <Entra key={i} en={i === 0 ? -1 : cambios[i - 1]} sale={cambios[i]} como="nada" sx={{ gridArea: '1 / 1', minWidth: 0 }}>{c}</Entra>
      ))}
    </Box>
  );
}

const toque = (en) => keyframes`
  0% { opacity: 0; transform: scale(1.5); }
  ${en - 4}% { opacity: 0; transform: scale(1.5); }
  ${en - 1}% { opacity: .5; transform: scale(1); }
  ${en + 1}% { opacity: .5; transform: scale(.82); }
  ${en + 5}% { opacity: 0; transform: scale(1.3); }
  100% { opacity: 0; transform: scale(1.3); }
`;
// El dedo. Va dentro de lo que se toca (que necesita position: relative).
export function Toque({ en }) {
  return (
    <Box aria-hidden sx={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center', pointerEvents: 'none' }}>
      <Box sx={{
        width: 34, height: 34, borderRadius: '50%', bgcolor: 'text.primary', border: '3px solid', borderColor: 'background.paper',
        opacity: 0, animation: `${toque(en)} ${DURACION} linear infinite`, [reducido]: { animation: 'none' },
      }} />
    </Box>
  );
}

const llena = (desde, hasta, pct) => keyframes`
  0%, ${desde}% { width: 0; } ${hasta}%, 96% { width: ${pct}%; } 100% { width: ${pct}%; }
`;
export function Barra({ desde, hasta, pct, color = 'marca.patina', alto = 8 }) {
  return (
    <Box sx={{ flex: 1, height: alto, borderRadius: 99, bgcolor: 'divider', overflow: 'hidden' }}>
      <Box sx={{ height: '100%', borderRadius: 99, bgcolor: color, animation: `${llena(desde, hasta, pct)} ${DURACION} ease-out infinite`, [reducido]: { animation: 'none', width: `${pct}%` } }} />
    </Box>
  );
}

// ---------- Piezas ----------

export const Tarjeta = ({ children, sx }) => (
  <Box sx={{ bgcolor: 'background.paper', borderRadius: 2, p: 1.5, display: 'grid', gap: 0.75, border: '1px solid', borderColor: 'divider', position: 'relative', ...sx }}>{children}</Box>
);
const Etiqueta = ({ children, color = 'text.secondary' }) => (
  <Typography sx={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color }}>{children}</Typography>
);
const Fuerte = ({ children, sx }) => <Typography sx={{ fontWeight: 700, fontSize: 14, lineHeight: 1.3, ...sx }}>{children}</Typography>;
const Chico = ({ children, color = 'text.secondary', sx }) => <Typography sx={{ fontSize: 12.5, lineHeight: 1.35, color, ...sx }}>{children}</Typography>;
const Cifra = ({ children, sx }) => <Typography sx={{ fontFamily: 'Archivo, sans-serif', fontWeight: 800, fontSize: 24, lineHeight: 1.1, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', ...sx }}>{children}</Typography>;

const TONOS = { ok: 'success', warn: 'warning', bad: 'error', info: 'info', neutro: null, senal: 'secondary' };
export function Pastilla({ texto, tono = 'neutro' }) {
  const p = TONOS[tono];
  return (
    <Box component="span" sx={{
      display: 'inline-block', justifySelf: 'start', px: 1, py: 0.25, borderRadius: 99, fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap',
      bgcolor: p ? `${p}.light` : 'background.default', color: p ? (p === 'secondary' ? 'secondary.contrastText' : `${p}.main`) : 'text.secondary',
    }}>{texto}</Box>
  );
}

function Boton({ texto, en, tipo = 'principal', sx }) {
  const principal = tipo === 'principal';
  return (
    <Box sx={{
      position: 'relative', px: 1.5, py: 0.75, borderRadius: 1.5, fontSize: 13, fontWeight: 700, textAlign: 'center', whiteSpace: 'nowrap',
      bgcolor: principal ? 'primary.main' : 'background.paper', color: principal ? 'primary.contrastText' : 'text.primary',
      border: '1px solid', borderColor: principal ? 'primary.main' : 'marca.lineStrong', ...sx,
    }}>
      {texto}
      {en != null && <Toque en={en} />}
    </Box>
  );
}

function Confirmacion({ en, texto }) {
  return (
    <Entra en={en}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', bgcolor: 'text.primary', color: 'background.paper', borderRadius: 1.5, px: 1.5, py: 1 }}>
        <OkIcon sx={{ fontSize: 18, color: 'estado.ok', filter: 'brightness(1.6)' }} />
        <Typography sx={{ fontSize: 13 }}>{texto}</Typography>
      </Box>
    </Entra>
  );
}

// Fila con una acción: el estado cambia al tocar el botón (antes → después)
function FilaAccion({ titulo, detalle, antes, despues, boton, en, extra }) {
  return (
    <Tarjeta sx={{ gridTemplateColumns: '1fr auto', alignItems: 'center', columnGap: 1.5 }}>
      <Box sx={{ minWidth: 0 }}>
        <Fuerte>{titulo}</Fuerte>
        {detalle && <Chico>{detalle}</Chico>}
        {extra}
      </Box>
      {en == null ? (
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          {antes && <Pastilla {...antes} />}
          <Boton texto={boton} tipo="secundario" />
        </Box>
      ) : (
        <Estados cambios={[en + 4]} sx={{ justifyItems: 'end' }}>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            {antes && <Pastilla {...antes} />}
            <Boton texto={boton} en={en} />
          </Box>
          <Pastilla {...despues} />
        </Estados>
      )}
    </Tarjeta>
  );
}

// ---------- Escenas ----------

const ESCENAS = {
  // Administración
  pendientes: ({ modulos }) => (
    <>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        {[
          ['Solicitudes de acceso', '2', 'warn', true],
          ['Reportes del muro', '1', 'bad', modulos.muro],
          [modulos.invitaciones_qr ? 'Visitas esperadas' : 'Reservas de hoy', '3', 'info', true],
        ].filter((x) => x[3]).map(([t, n, tono], i) => (
          <Entra key={t} en={4 + i * 10}>
            <Tarjeta sx={{ gap: 0.25 }}>
              <Cifra sx={{ color: `${TONOS[tono]}.main` }}>{n}</Cifra>
              <Chico>{t}</Chico>
            </Tarjeta>
          </Entra>
        ))}
      </Box>
      <Entra en={40}>
        <Tarjeta sx={{ gridTemplateColumns: 'auto 1fr auto', alignItems: 'center', gap: 1.25 }}>
          <AvisoIcon sx={{ color: 'warning.main' }} />
          <Box><Fuerte>Camila Soto pide acceso</Fuerte><Chico>Depto 304 · Arrendataria</Chico></Box>
          <Pastilla texto="Nuevo" tono="warn" />
        </Tarjeta>
      </Entra>
      <Entra en={60} como="aparece"><Chico>El número junto a cada opción del menú dice cuánto espera.</Chico></Entra>
    </>
  ),
  residentes: () => (
    <>
      <FilaAccion titulo="Camila Soto" detalle="Depto 304 · Arrendataria · «Me cambio el 1 de diciembre»" antes={{ texto: 'Pendiente', tono: 'warn' }} boton="Aprobar" en={30} despues={{ texto: 'Activa', tono: 'ok' }} />
      <Entra en={12}><Tarjeta sx={{ gridTemplateColumns: '1fr auto' }}><Box><Fuerte>Pedro Muñoz</Fuerte><Chico>Depto 101 · Propietario</Chico></Box><Pastilla texto="Activa" tono="ok" /></Tarjeta></Entra>
      <Confirmacion en={40} texto="Camila ya puede entrar a la app." />
    </>
  ),
  moderar: () => (
    <>
      <Tarjeta>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
          <Chico>Depto 207 · hace 2 horas</Chico>
          <Estados cambios={[38]}><Pastilla texto="2 reportes" tono="bad" /><Pastilla texto="Oculta" /></Estados>
        </Box>
        <Estados cambios={[38]}>
          <Typography sx={{ fontSize: 14 }}>¡Los del 3er piso no saben vivir en comunidad! 😡</Typography>
          <Typography sx={{ fontSize: 14, color: 'text.disabled', textDecoration: 'line-through' }}>¡Los del 3er piso no saben vivir en comunidad! 😡</Typography>
        </Estados>
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          <Boton texto="Descartar reportes" tipo="secundario" />
          <Estados cambios={[38]}><Boton texto="Ocultar" en={32} /><Boton texto="Restaurar" tipo="secundario" /></Estados>
        </Box>
      </Tarjeta>
      <Confirmacion en={42} texto="Oculta. Su autor recibió un aviso y se puede restaurar." />
    </>
  ),
  reservas: ({ espacio = 'Quincho' }) => (
    <Tarjeta sx={{ gap: 1 }}>
      <Fuerte>{espacio} · esta semana</Fuerte>
      {[['Vie 7', '18:00–23:30', 'Depto 502', 6], ['Sáb 8', '12:00–17:00', 'Depto 104', 18], ['Sáb 8', '18:00–23:30', 'Casa 12', 30], ['Dom 9', '12:00–17:00', 'Depto 301', 42]].map(([d, h, u, en]) => (
        <Entra key={d + h} en={en}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '56px 96px 1fr auto', gap: 1, alignItems: 'center', py: 0.5, borderTop: '1px solid', borderColor: 'divider' }}>
            <Chico sx={{ fontWeight: 700 }}>{d}</Chico>
            <Chico sx={{ fontVariantNumeric: 'tabular-nums' }}>{h}</Chico>
            <Fuerte sx={{ fontSize: 13 }}>{u}</Fuerte>
            <Pastilla texto="Confirmada" tono="ok" />
          </Box>
        </Entra>
      ))}
      <Entra en={58} como="aparece"><Chico>Los residentes reservan desde la app; aquí ves y cancelas.</Chico></Entra>
    </Tarjeta>
  ),
  guia: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 150px', gap: 1.5, alignItems: 'start' }}>
      <Tarjeta>
        <Etiqueta>Retiro de basura</Etiqueta>
        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
          {['Lun', 'Mar', 'Mié', 'Jue', 'Vie'].map((d, i) => (
            <Box key={d} sx={{ position: 'relative' }}>
              {i === 0 || i === 3 ? (
                <Estados cambios={[i === 0 ? 14 : 28]}>
                  <Pastilla texto={d} />
                  <Box component="span" sx={{ display: 'inline-block', px: 1, py: 0.25, borderRadius: 99, fontSize: 12, fontWeight: 700, bgcolor: 'primary.main', color: 'primary.contrastText' }}>{d}</Box>
                </Estados>
              ) : <Pastilla texto={d} />}
              {(i === 0 || i === 3) && <Toque en={i === 0 ? 11 : 25} />}
            </Box>
          ))}
        </Box>
        <Etiqueta>Mensaje</Etiqueta>
        <Box sx={{ border: '1px solid', borderColor: 'marca.lineStrong', borderRadius: 1, p: 1, minHeight: 44 }}>
          <Entra en={40} como="aparece"><Chico color="text.primary">¡Bienvenidos! Cualquier duda, escríbannos.</Chico></Entra>
        </Box>
      </Tarjeta>
      <Box sx={{ border: '6px solid', borderColor: 'text.primary', borderRadius: 4, p: 1, bgcolor: 'background.default', display: 'grid', gap: 0.75, minHeight: 190 }}>
        <Etiqueta>Así lo ven</Etiqueta>
        <Entra en={30}><Tarjeta sx={{ p: 1 }}><Fuerte sx={{ fontSize: 12 }}>Basura</Fuerte><Chico sx={{ fontSize: 11 }}>Lunes y jueves</Chico></Tarjeta></Entra>
        <Entra en={48}><Tarjeta sx={{ p: 1 }}><Chico sx={{ fontSize: 11 }} color="text.primary">¡Bienvenidos! Cualquier duda, escríbannos.</Chico></Tarjeta></Entra>
      </Box>
    </Box>
  ),
  modulos: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 140px', gap: 1.5, alignItems: 'start' }}>
      <Tarjeta sx={{ gap: 1 }}>
        {[['Muro y comunicados', true], ['Marketplace vecinal', false], ['Reservas de espacios', true]].map(([m, on], i) => (
          <Box key={m} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <Fuerte sx={{ fontSize: 13 }}>{m}</Fuerte>
            <Box sx={{ position: 'relative' }}>
              <Estados cambios={i === 1 ? [30] : []}>
                <Interruptor on={on} />
                {i === 1 ? <Interruptor on /> : null}
              </Estados>
              {i === 1 && <Toque en={26} />}
            </Box>
          </Box>
        ))}
      </Tarjeta>
      <Tarjeta sx={{ gap: 0.5, bgcolor: 'marca.sidebar', borderColor: 'marca.sidebar' }}>
        <Etiqueta color="marca.sidebarInk">Menú de la app</Etiqueta>
        {['Inicio', 'Muro', 'Reservas'].map((m) => <Chico key={m} color="marca.sidebarStrong">{m}</Chico>)}
        <Entra en={36}><Chico color="marca.sidebarStrong" sx={{ fontWeight: 700 }}>Mercado ✦</Chico></Entra>
      </Tarjeta>
    </Box>
  ),

  // Presidencia
  aprobar: ({ modulos }) => (
    <>
      <FilaAccion titulo="Reparación del portón · $420.000" detalle="Automatismos Sur SpA · supera el umbral de $300.000" antes={{ texto: 'Por visar', tono: 'warn' }} boton="Visar" en={24} despues={{ texto: 'Aprobado', tono: 'ok' }} />
      {modulos.muro && (
        <Tarjeta>
          <Etiqueta color="info.main">Comunicado de Secretaría</Etiqueta>
          <Fuerte>Corte de agua el jueves de 9:00 a 13:00</Fuerte>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
            <Estados cambios={[58]}><Boton texto="Aprobar y publicar" en={52} /><Chico color="info.main">Publicado en el muro</Chico></Estados>
          </Box>
          <Entra en={58} como="sello" sx={{ position: 'absolute', right: 12, top: 10 }}>
            <Box sx={{ width: 36, height: 36, borderRadius: '50%', border: '2.5px solid', borderColor: 'info.main', bgcolor: 'info.light', color: 'info.main', display: 'grid', placeItems: 'center', fontWeight: 800 }}>P</Box>
          </Entra>
        </Tarjeta>
      )}
    </>
  ),
  bitacora: () => (
    <Tarjeta sx={{ gap: 0 }}>
      <Fuerte sx={{ mb: 0.5 }}>Lo que hizo la administración</Fuerte>
      {[['Hoy 10:42', 'Aprobó a Camila Soto en el Depto 304'], ['Hoy 09:15', 'Ocultó una publicación del muro'], ['Ayer 18:03', 'Canceló una reserva del quincho'], ['Ayer 11:20', 'Cambió los datos de transferencia']].map(([f, a], i) => (
        <Entra key={f} en={6 + i * 12}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '80px 1fr', gap: 1, py: 0.75, borderTop: '1px solid', borderColor: 'divider' }}>
            <Chico sx={{ fontVariantNumeric: 'tabular-nums' }}>{f}</Chico>
            <Typography sx={{ fontSize: 13, fontWeight: i === 3 ? 700 : 400 }}>{a}</Typography>
          </Box>
        </Entra>
      ))}
      <Entra en={58} como="aparece"><Chico sx={{ mt: 0.5 }}>Nadie puede borrar esta lista.</Chico></Entra>
    </Tarjeta>
  ),
  votaciones: ({ recordar }) => (
    <Tarjeta sx={{ gap: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', gap: 1 }}>
        <Fuerte>¿Pintamos la fachada en marzo?</Fuerte>
        <Estados cambios={[46]}><Pastilla texto="Faltan 12 votos" tono="warn" /><Pastilla texto="Quórum alcanzado" tono="ok" /></Estados>
      </Box>
      {[['Sí', 58, 'marca.patina'], ['No', 24, 'marca.lineStrong']].map(([o, pct, c]) => (
        <Box key={o} sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
          <Chico sx={{ width: 24 }}>{o}</Chico>
          <Barra desde={6} hasta={46} pct={pct} color={c} />
          <Chico sx={{ width: 36, textAlign: 'right', fontWeight: 700 }} color="text.primary">{pct}%</Chico>
        </Box>
      ))}
      <Chico>Participación: 82% de las viviendas · un voto por vivienda</Chico>
      {recordar && (
        <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Estados cambios={[30]}><Boton texto="Recordar a quienes faltan" tipo="secundario" en={24} /><Chico color="info.main">Correo enviado a 12 viviendas</Chico></Estados>
        </Box>
      )}
    </Tarjeta>
  ),

  // Tesorería
  cobro: () => (
    <>
      <Tarjeta sx={{ gap: 1 }}>
        <Fuerte>Nuevo cobro</Fuerte>
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 120px', gap: 1 }}>
          {[['Concepto', 'Gasto común noviembre', 6], ['Monto por unidad', '$58.400', 18]].map(([l, v, en]) => (
            <Box key={l} sx={{ border: '1px solid', borderColor: 'marca.lineStrong', borderRadius: 1, px: 1, py: 0.5 }}>
              <Chico sx={{ fontSize: 11 }}>{l}</Chico>
              <Entra en={en} como="aparece"><Typography sx={{ fontSize: 13.5, fontWeight: 600 }}>{v}</Typography></Entra>
            </Box>
          ))}
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Chico>Vence el 10 de diciembre · 48 unidades</Chico>
          <Estados cambios={[40]}><Boton texto="Emitir cobro" en={34} /><Pastilla texto="Emitido" tono="ok" /></Estados>
        </Box>
      </Tarjeta>
      <Confirmacion en={44} texto="Las 48 unidades recibieron un correo con el cobro." />
    </>
  ),
  validar: () => (
    <>
      <FilaAccion titulo="Depto 502 avisó una transferencia" detalle="$58.400 · 2 nov 18:40 · «Transferí desde BancoEstado»" boton="Validar" en={30} antes={{ texto: 'Por revisar', tono: 'info' }} despues={{ texto: 'Pagado', tono: 'ok' }} />
      <Entra en={10}><FilaAccion titulo="Casa 14 avisó una transferencia" detalle="$58.400 · 2 nov 20:15" boton="Validar" antes={{ texto: 'Por revisar', tono: 'info' }} despues={{ texto: 'Pagado', tono: 'ok' }} /></Entra>
      <Entra en={46} como="aparece"><Chico>Revisa la cuenta del banco antes de validar. EntreCasas no mueve dinero.</Chico></Entra>
    </>
  ),
  morosidad: () => (
    <>
      <Tarjeta sx={{ gap: 0 }}>
        {[['Depto 108', '3 meses', '$175.200'], ['Depto 403', '2 meses', '$116.800'], ['Casa 7', '1 mes', '$58.400']].map(([u, m, d], i) => (
          <Entra key={u} en={4 + i * 8}>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto auto', gap: 1.5, alignItems: 'center', py: 0.75, borderTop: i ? '1px solid' : 0, borderColor: 'divider' }}>
              <Fuerte sx={{ fontSize: 13 }}>{u}</Fuerte>
              <Pastilla texto={m} tono={i === 0 ? 'bad' : 'warn'} />
              <Typography sx={{ fontSize: 13, fontWeight: 700, fontVariantNumeric: 'tabular-nums', minWidth: 72, textAlign: 'right' }}>{d}</Typography>
            </Box>
          </Entra>
        ))}
      </Tarjeta>
      <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Estados cambios={[44]}><Boton texto="Recordar a los 3" en={38} /><Chico color="info.main">Recordatorio enviado por correo</Chico></Estados>
      </Box>
    </>
  ),
  exenciones: () => (
    <FilaAccion
      titulo="Casa 22 pide exención de noviembre" detalle="«Estoy sin trabajo desde septiembre»" boton="Aprobar" en={34}
      antes={{ texto: 'Pendiente', tono: 'warn' }} despues={{ texto: 'Exento', tono: 'info' }}
      extra={<Entra en={44} como="aparece"><Chico color="info.main">No debe este cobro, y tampoco cuenta como pagado.</Chico></Entra>}
    />
  ),
  reportes: () => (
    <Tarjeta>
      <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Fuerte>Ingresos y egresos</Fuerte><Boton texto="Descargar Excel" tipo="secundario" en={70} /></Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 110, pt: 1 }}>
        {[['Ago', 80, 62], ['Sep', 86, 70], ['Oct', 90, 74], ['Nov', 72, 40]].map(([m, a, b], i) => (
          <Box key={m} sx={{ flex: 1, display: 'grid', gap: 0.5, justifyItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'flex-end', height: 90 }}>
              {[[a, 'marca.patina'], [b, 'marca.lineStrong']].map(([h, c], j) => (
                <Box key={j} sx={{ width: 14, height: 90, display: 'flex', alignItems: 'flex-end' }}>
                  <Box sx={{ width: '100%', borderRadius: '3px 3px 0 0', bgcolor: c, height: `${h}%`, transformOrigin: 'bottom', animation: `${crece(4 + i * 8, 22 + i * 8)} ${DURACION} ease-out infinite`, [reducido]: { animation: 'none' } }} />
                </Box>
              ))}
            </Box>
            <Chico>{m}</Chico>
          </Box>
        ))}
      </Box>
      <Box sx={{ display: 'flex', gap: 2 }}>
        <Chico><Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: 0.5, bgcolor: 'marca.patina', mr: 0.5 }} />Ingresos</Chico>
        <Chico><Box component="span" sx={{ display: 'inline-block', width: 10, height: 10, borderRadius: 0.5, bgcolor: 'marca.lineStrong', mr: 0.5 }} />Egresos</Chico>
      </Box>
    </Tarjeta>
  ),

  // Secretaría
  actas: () => (
    <Tarjeta sx={{ gap: 1 }}>
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><ActaIcon sx={{ color: 'info.main' }} /><Fuerte>Asamblea ordinaria · 28 de octubre</Fuerte></Box>
      <Etiqueta>Asistentes</Etiqueta>
      <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
        {['Luis Muñoz', 'Marta Rivas', 'Andrea Lagos', '+ 21 vecinos'].map((n, i) => <Entra key={n} en={6 + i * 5} como="aparece"><Pastilla texto={n} /></Entra>)}
      </Box>
      <Etiqueta>Acuerdos</Etiqueta>
      {['Pintar la fachada en marzo', 'Cambiar la empresa de aseo'].map((a, i) => (
        <Entra key={a} en={34 + i * 10}><Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><OkIcon sx={{ fontSize: 16, color: 'info.main' }} /><Typography sx={{ fontSize: 13 }}>{a}</Typography></Box></Entra>
      ))}
      <Entra en={58} como="aparece"><Chico>Los residentes leen el acta en la app.</Chico></Entra>
    </Tarjeta>
  ),
  directorio: () => (
    <Tarjeta sx={{ gap: 0 }}>
      {[['Conserjería', '+56 45 221 4400', true], ['Gasfíter de confianza', '+56 9 7712 3480', false], ['Carabineros', '133', true]].map(([n, tel, on], i) => (
        <Box key={n} sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 1.25, alignItems: 'center', py: 0.75, borderTop: i ? '1px solid' : 0, borderColor: 'divider' }}>
          <TelIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
          <Box><Fuerte sx={{ fontSize: 13 }}>{n}</Fuerte><Chico sx={{ fontVariantNumeric: 'tabular-nums' }}>{tel}</Chico></Box>
          <Box sx={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <VisibleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Estados cambios={i === 1 ? [30] : []}><Interruptor on={on} />{i === 1 ? <Interruptor on /> : null}</Estados>
            {i === 1 && <Toque en={26} />}
          </Box>
        </Box>
      ))}
      <Entra en={36} como="aparece"><Chico sx={{ mt: 0.5 }}>Con el ojo encendido, aparece en la app de los residentes.</Chico></Entra>
    </Tarjeta>
  ),
  comunicado: () => (
    <Tarjeta sx={{ gap: 1 }}>
      <Etiqueta color="info.main">Nuevo comunicado</Etiqueta>
      <Box sx={{ border: '1px solid', borderColor: 'marca.lineStrong', borderRadius: 1, p: 1 }}>
        <Entra en={4} como="aparece"><Fuerte>Corte de agua el jueves</Fuerte></Entra>
        <Entra en={14} como="aparece"><Chico color="text.primary">De 9:00 a 13:00 por limpieza del estanque.</Chico></Entra>
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 1 }}>
        <Estados cambios={[32, 62]}>
          <Chico>Borrador</Chico>
          <Pastilla texto="Esperando a Presidencia" tono="warn" />
          <Pastilla texto="Publicado" tono="ok" />
        </Estados>
        <Estados cambios={[32]}><Boton texto="Enviar a aprobación" en={26} /><Chico color="info.main">La Presidencia lo aprueba y se publica</Chico></Estados>
      </Box>
    </Tarjeta>
  ),

  // Conserjería
  qr: () => (
    <Box sx={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 1.5, alignItems: 'center' }}>
      <Box sx={{ position: 'relative', width: 120, height: 120, borderRadius: 2, bgcolor: '#fff', border: '1px solid', borderColor: 'divider', display: 'grid', placeItems: 'center', overflow: 'hidden' }}>
        <QrIcon sx={{ fontSize: 104, color: '#16333D' }} />
        <Box sx={{ position: 'absolute', left: 0, right: 0, height: 3, bgcolor: 'secondary.main', boxShadow: '0 0 10px', color: 'secondary.main', animation: `${escanea} ${DURACION} linear infinite`, [reducido]: { display: 'none' } }} />
      </Box>
      <Box sx={{ display: 'grid', gap: 0.75 }}>
        <Pastilla texto="EC-4K7P-2QHM" tono="senal" />
        <Entra en={36}><Fuerte>Camila Soto · visita</Fuerte><Chico>Para el Depto 502 · hasta las 22:00</Chico></Entra>
        <Estados cambios={[36, 58]}>
          <Chico>Escaneando…</Chico>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><Pastilla texto="Invitación válida" tono="ok" /><Boton texto="Registrar ingreso" en={52} /></Box>
          <Pastilla texto="Adentro" tono="ok" />
        </Estados>
      </Box>
    </Box>
  ),
  sinCodigo: () => (
    <>
      <Tarjeta sx={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
        <Box><Fuerte>Repartidor · Depto 502</Fuerte><Chico>Llegó sin invitación · 21:05</Chico></Box>
        <Estados cambios={[22, 56]} sx={{ justifyItems: 'end' }}>
          <Boton texto="Consultar al residente" en={16} />
          <Pastilla texto="Esperando respuesta…" tono="warn" />
          <Pastilla texto="Autorizado" tono="ok" />
        </Estados>
      </Tarjeta>
      <Entra en={26}>
        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ border: '4px solid', borderColor: 'text.primary', borderRadius: 2.5, px: 1.25, py: 1, width: 210, bgcolor: 'background.paper' }}>
            <Chico sx={{ fontSize: 11 }}>App del Depto 502</Chico>
            <Fuerte sx={{ fontSize: 13 }}>¿Dejas pasar a un repartidor?</Fuerte>
            <Box sx={{ display: 'flex', gap: 0.75, mt: 0.75 }}><Boton texto="No" tipo="secundario" sx={{ flex: 1, py: 0.25 }} /><Boton texto="Sí, que pase" en={50} sx={{ flex: 2, py: 0.25 }} /></Box>
          </Box>
        </Box>
      </Entra>
      <Entra en={62} como="aparece"><Chico sx={{ textAlign: 'center' }}>Si no contesta, llamas y lo anotas como autorizado por teléfono.</Chico></Entra>
    </>
  ),
  espacios: ({ espacio = 'Quincho' }) => (
    <>
      <Tarjeta sx={{ gridTemplateColumns: '1fr auto', alignItems: 'center' }}>
        <Box><Fuerte>{espacio} · 18:00–23:30</Fuerte><Chico>Depto 502 · 15 invitados</Chico></Box>
        <Estados cambios={[24, 56]} sx={{ justifyItems: 'end' }}>
          <Boton texto="Entregar" en={18} />
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}><Pastilla texto="Entregado" tono="info" /><Boton texto="Recibir" en={50} tipo="secundario" /></Box>
          <Pastilla texto="Devuelto" tono="ok" />
        </Estados>
      </Tarjeta>
      <Entra en={58}><Tarjeta><Etiqueta>Cómo quedó</Etiqueta><Typography sx={{ fontSize: 13 }}>Limpio. Falta una silla.</Typography></Tarjeta></Entra>
    </>
  ),

  // Plataforma
  crear: () => (
    <Tarjeta sx={{ gap: 1 }}>
      <Fuerte>Nueva comunidad</Fuerte>
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1 }}>
        {['Villa', 'Condominio', 'Edificio'].map((t, i) => (
          <Box key={t} sx={{ position: 'relative' }}>
            <Estados cambios={i === 2 ? [20] : []}>
              <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1.5, p: 1, textAlign: 'center' }}><Fuerte sx={{ fontSize: 13 }}>{t}</Fuerte></Box>
              {i === 2 ? <Box sx={{ border: '2px solid', borderColor: 'primary.main', bgcolor: 'primary.light', borderRadius: 1.5, p: 1, textAlign: 'center' }}><Fuerte sx={{ fontSize: 13 }}>{t}</Fuerte></Box> : null}
            </Estados>
            {i === 2 && <Toque en={16} />}
          </Box>
        ))}
      </Box>
      <Entra en={28}><Chico>Torres A y B · pisos 1 a 12 · 4 deptos por piso</Chico></Entra>
      <Entra en={38}><Cifra>96 departamentos</Cifra></Entra>
      <Entra en={50}><Chico>Con todos los módulos encendidos y una invitación al primer responsable.</Chico></Entra>
    </Tarjeta>
  ),
  suspender: () => (
    <>
      <FilaAccion titulo="Condominio Las Palmas" detalle="48 unidades · última actividad hoy" antes={{ texto: 'Activa', tono: 'ok' }} boton="Suspender" en={30} despues={{ texto: 'Suspendida', tono: 'bad' }} />
      <Entra en={40}><Tarjeta><Etiqueta>Motivo</Etiqueta><Typography sx={{ fontSize: 13 }}>Contrato vencido. Se reactiva al renovar.</Typography></Tarjeta></Entra>
      <Confirmacion en={52} texto="Nadie de la comunidad puede entrar hasta reactivarla." />
    </>
  ),
};

const crece = (desde, hasta) => keyframes`
  0%, ${desde}% { transform: scaleY(0); } ${hasta}%, 100% { transform: scaleY(1); }
`;
const escanea = keyframes`
  0%, 8% { top: 0; opacity: 0; } 10% { opacity: 1; } 34% { top: 97%; opacity: 1; } 36%, 100% { top: 97%; opacity: 0; }
`;

function Interruptor({ on }) {
  return (
    <Box sx={{ width: 34, height: 20, borderRadius: 99, bgcolor: on ? 'marca.patina' : 'marca.lineStrong', position: 'relative' }}>
      <Box sx={{ position: 'absolute', top: 2, left: on ? 16 : 2, width: 16, height: 16, borderRadius: '50%', bgcolor: '#fff' }} />
    </Box>
  );
}


// Marco común: la escena dentro de una "pantalla" del panel. `key` en el padre la reinicia al cambiar de paso.
export default function Escena({ clave, opciones }) {
  const Contenido = ESCENAS[clave];
  return (
    <Box aria-hidden sx={{ bgcolor: 'background.default', border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2, minHeight: 230, display: 'grid', alignContent: 'start', gap: 1.25, overflow: 'hidden' }}>
      <Contenido {...opciones} />
    </Box>
  );
}
