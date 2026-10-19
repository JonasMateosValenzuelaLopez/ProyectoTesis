import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2A9D8F', // Azul Cerceta: Para menús y botones de acción principal (guardar, aprobar).
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#F4A261', // Coral Cálido: Para alertas amistosas o llamadas a la acción comunitarias.
      contrastText: '#FFFFFF',
    },
    background: {
      default: '#F8F9FA', // Gris muy claro: Para reducir la fatiga visual del conserje/administrador.
      paper: '#FFFFFF',   // Blanco puro: Para las tarjetas de datos y formularios.
    },
    error: {
      main: '#E63946', // Rojo Ladrillo: Para identificar estados de morosidad o accesos rechazados.
    },
    success: {
      main: '#2D6A4F', // Verde Esmeralda: Para pagos validados y accesos permitidos.
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    button: {
      textTransform: 'none', // Evita que los botones estén todo en mayúsculas, haciéndolos más amigables.
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8, // Bordes ligeramente redondeados, sin ser excesivamente informales.
  },
});

export default theme;