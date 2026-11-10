// Tamaño de letra del panel: de 90 % a 140 %, en pasos de 5 %. Toda la tipografía está en rem,
// así que basta con cambiar el tamaño de letra de la página (parte del que eligió la persona en su navegador).
export const ESCALA_MIN = 0.9;
export const ESCALA_MAX = 1.4;
export const ESCALA_PASO = 0.05;
export const ajustarEscala = (n) => Math.round(Math.min(ESCALA_MAX, Math.max(ESCALA_MIN, n)) * 100) / 100;
