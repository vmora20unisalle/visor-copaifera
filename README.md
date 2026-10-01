# Visor geográfico de resultados — Copaifera pubiflora

Aplicación web desarrollada en **Python + Streamlit + Folium + Plotly** a partir de `MODALIDAD_GRADO.gdb`.

## Incluye

- **Paisaje y coberturas:** comparación tipo swipe 2018–2023, IBP, métricas de paisaje y transiciones.
- **Copaifera pubiflora:** selector de árbol, zoom automático, ficha individual, producción por 7 muestreos y comparación Bosque/Potrero.
- **Patrones temporales NDVI:** mapa de patrones emergentes y resumen por superficie.
- **Clima y forraje:** climograma de referencia, microclima mensual, precipitación, aforos y caracterización bromatológica.

## Ejecutar en Windows

1. Instala Python 3.11 o superior.
2. Abre una terminal dentro de esta carpeta.
3. Ejecuta:

```bash
python -m pip install -r requirements.txt
streamlit run app.py
```

También puedes usar `iniciar_visor.bat`.

## Notas metodológicas incorporadas

- El NDVI histórico por árbol se resume mediante media, mínimo, máximo y desviación estándar; la serie NDVI no se empareja con los 7 muestreos productivos porque las fechas no coinciden.
- Los patrones emergentes NDVI se muestran como resultado espacio-temporal del paisaje.
- La precipitación de diciembre de 2025 y enero de 2026 está marcada en la fuente para revisión y no se usa en el climograma principal.
- La comparación bromatológica de Humidicola bajo sombra vs. pleno sol es descriptiva (un valor de laboratorio por condición).
- La fila Copaiba se conserva como caracterización bromatológica independiente; no se interpreta como forraje.
