# EntreCasas · App de residentes

App de Expo (SDK 58, Expo Router) para residentes, propietarios y arrendatarios. Sigue la dirección visual «Placa y plano» con los mismos tokens que el panel web (`src/constants/tokens.js`, generado desde `frontend/tokens`).

## Cómo correrla

```bash
npm install
npx expo start        # escanea el QR con Expo Go, o presiona w para el navegador
npx tsc --noEmit      # revisión de tipos
npx expo lint         # lint
```

Las cuentas de prueba están en `CREDENCIALES-PRUEBA.md`, en la raíz de la copia.

## Estructura

- `src/app/(tabs)`: Inicio, Muro, Reservas, Mercado y Perfil. Las pestañas se ocultan según los módulos de la comunidad.
- `src/app/*.tsx`: pantallas que se abren encima (invitar, pase QR, cómo pagar, reservar, publicar, votar, pagos, contactos) y el login.
- `src/components/ec`: componentes de la marca (PlacaUnidad, SelloCargo, Tarjeta, Boton, Campo…).
- `src/context/App.tsx`: sesión y datos en memoria. Cada acción corresponde a un endpoint de la API por conectar.
- `src/data/demo.ts`: datos de ejemplo, iguales a los del panel web.

La plataforma no recibe pagos: la app muestra los datos para transferir a la comunidad y la administración marca el pago en el panel.
