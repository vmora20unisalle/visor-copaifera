# Copaifera: paisaje y sistemas ganaderos
### Fragmentación, efecto de borde y resultados productivos

Visor de consulta de resultados de modalidad de grado. Versión 2.0 · fondo claro y títulos verdes.

## Actualizar tu aplicación de Streamlit

1. Descomprime el ZIP de esta versión.
2. Abre tu repositorio **vmora20unisalle/visor-copaifera**, rama **main**.
3. Selecciona **Add file → Upload files**.
4. Arrastra el contenido descomprimido: **app.py**, **requirements.txt**, la carpeta **visor_web completa**, **README.md** y los demás archivos/carpetas. No arrastres el ZIP cerrado ni una carpeta adicional por encima de app.py.
5. Pulsa **Commit changes**. Conserva la ruta principal **app.py**.
6. Streamlit detecta los cambios del repositorio. Si no se actualiza, entra a la administración de la app y pulsa **Reboot app**, y recarga el navegador.

**No es necesario crear otro repositorio ni otra aplicación.** El nombre visible cambia, pero el enlace que ya tienes puede conservarse.

**No subas solo app.py.** La carpeta `visor_web` contiene la interfaz y todos los mapas temáticos.

```text
visor-copaifera/
├── app.py
├── requirements.txt
├── README.md
├── data/                       # datos originales convertidos y conservados
├── visor_web/
│   ├── index.html
│   ├── style.css
│   ├── mapas.js
│   ├── interfaz.js
│   ├── datos.js                # copia de consulta de los datos
│   ├── assets/                 # cinco imágenes cartográficas independientes
│   └── vendor/plotly.min.js    # biblioteca gráfica incluida
├── tools/sincronizar_tablas.py
├── VERIFICACION_DATOS.json
└── PRUEBAS_VISOR.json
```

## Cambios realizados

**Coberturas 2018/2023.** Comparador reconstruido con un dibujo independiente por año y recorte a izquierda/derecha. Incluye un divisor arrastrable y un control bajo el mapa. Las capas originales sí son diferentes.

**Estado ecológico.** Segundo swipe, debajo del de coberturas. Usa el atributo `ESTADO_ECOLOGICO` de cada capa original: Bueno, Regular y Deficiente. No se recalculó IBP ni se inventaron categorías.

**Selección visible.** Cian intenso, halo contrastante y etiqueta permanente. El mapa se centra al seleccionar desde el desplegable o al pulsar un punto. Zoom de selección: 19.7 para árboles; 19 para clima. Incluye botones para volver al seleccionado o ver todos. Los puntos coincidentes permiten escoger una etiqueta, sin alterar sus coordenadas.

**Patrones NDVI.** La capa se incluye localmente y abre sobre un fondo neutro. No requiere clave de API ni depende de Mapbox o Carto. Se mantiene una base satelital/calles opcional.

**Móviles.** Navegación de cuatro secciones en dos columnas, fichas apiladas, controles táctiles, mapas ajustados al ancho y gráficas adaptables. Se evita el desbordamiento horizontal de la página; las tablas anchas pueden desplazarse dentro de su panel.

**Contenido.** Se mantienen producción individual, comparación Bosque/Potrero, NDVI resumido, clima, precipitación con observaciones, aforos y las tres muestras bromatológicas, incluida Copaiba.

## Ejecutar localmente

```bash
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

En Windows también puedes usar `iniciar_visor.bat`. Esta versión solo requiere Streamlit para alojar la interfaz; no necesita ArcGIS ni librerías geoespaciales para ejecutarse.

Para consultar una copia local sin instalar Python, abre **visor_web/index.html** o **ABRIR_SIN_PYTHON.bat**. Los mapas temáticos y las gráficas están incluidos. Los fondos satelitales/calles sí requieren Internet; puedes seleccionar **Sin mapa base**.

## Alcance de los datos

- Fuente: `MODALIDAD_GRADO.gdb` y los CSV del visor previo. Los archivos originales convertidos se conservan en `data/`.
- Las imágenes temáticas se renderizaron en una extensión Web Mercator común. Son representaciones de consulta, no nuevos datos de adquisición ni un reemplazo de la geodatabase. Resolución de representación aproximada: 6.07 m/píxel.
- Estado ecológico e IBP proceden de los atributos de clase de cobertura. No equivalen a una evaluación individual de cada píxel o parche.
- Las métricas históricas NDVI no se emparejan con las siete fechas de producción.
- La referencia climática no se presenta como un tratamiento experimental certificado de cada árbol. Se conserva el año 2025 como referencia suministrada.
- Se mantiene RAFA sin inventarle una unidad. El ITH se presenta como índice calculado con temperatura y humedad.
- La precipitación con texto en `OBSERVACION` se conserva en la tabla, pero se excluye del climograma; los faltantes no se rellenan con cero.
- Forraje es el pasto Humidicola. Copaiba se conserva como caracterización bromatológica independiente y no como alimento para el ganado.
- No se añadieron ni recalcularon pruebas estadísticas al actualizar el visor.
- `datos.js` es la copia de consulta de los datos actuales. Al cambiar los CSV, ejecuta `python tools/sincronizar_tablas.py` y sube otra vez `datos.js`. Si cambian geometrías o estados cartográficos, deben regenerarse las imágenes de `assets/`.

## Conexiones y privacidad

No se incluyen claves ni credenciales. Las capas del proyecto y la biblioteca de gráficos se sirven desde el propio paquete. Las únicas conexiones cartográficas externas son los fondos opcionales de Esri World Imagery y OpenStreetMap, con atribución visible. Si falla el fondo, las capas temáticas siguen disponibles.

El visor público expone las coordenadas y resultados incluidos. Publícalos con la autorización correspondiente del proyecto. La aplicación no solicita la ubicación del visitante.

## Pruebas

Se verificaron la interfaz y las interacciones en Chromium a anchos de 360, 390, 768 y 1440 píxeles. Se comprobaron los dos swipes, cambio de árbol/curvas, selección climática, carga local de patrones, ausencia de desbordamiento horizontal y mensajes de ajuste de altura del componente. Se simularon conexiones externas no disponibles. Ver `PRUEBAS_VISOR.json`.

La versión entregada no se desplegó desde este entorno en tu cuenta de Streamlit. La comprobación del enlace publicado debe hacerse después de subir los archivos.

## Referencias técnicas

- Streamlit, componentes: https://docs.streamlit.io/develop/api-reference/custom-components/st.components.v1.declare_component
- Streamlit, actualización desde GitHub: https://docs.streamlit.io/deploy/streamlit-community-cloud/manage-your-app/edit-your-app
- Plotly.js: MIT; avisos incluidos en `visor_web/vendor/plotly.min.js` y `THIRD_PARTY_NOTICES.txt`.
