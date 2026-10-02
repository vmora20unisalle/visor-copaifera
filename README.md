# Copaifera: paisaje y sistemas ganaderos
## Fragmentación, efecto de borde y resultados productivos

Versión **3.0.0**. Aplicación de consulta con fondo claro y títulos verdes.
Esta actualización conserva las capas, geometrías y tablas de la versión 2.

## Actualizar el visor que ya está publicado

1. Descomprime `Visor_Copaifera_Actualizado_v3.zip`.
2. Abre el repositorio `vmora20unisalle/visor-copaifera`, en la rama `main`.
3. Pulsa **Add file → Upload files**.
4. Sube el contenido descomprimido del paquete. `app.py`, `requirements.txt`, `data/` y `visor_web/` deben quedar al mismo nivel, sin una carpeta adicional encima.
5. Confirma con **Commit changes**.
6. Espera la actualización de Streamlit y recarga el visor. Si sigue apareciendo la versión anterior, usa **Manage app → Reboot app** y vuelve a cargar la página.

**No subas solamente `app.py`. Es indispensable actualizar la carpeta `visor_web` completa, incluida `assets/`.** No necesitas borrar el repositorio ni crear una nueva aplicación.

Al actualizar la misma aplicación, sin cambiar su dirección, se conserva el enlace y el QR que apunte a él.

## Cambios de esta versión

### Fondo del mapa al acercar

Se mantiene el acercamiento visual al árbol y su resaltado cian. El mapa satelital ya no solicita las teselas de nivel 19 que estaban mostrando el aviso `Map data not yet available`: como máximo utiliza nivel nativo 18 y lo amplía visualmente. Si una tesela produce un error de carga, intenta representar niveles anteriores.

Esto no añade resolución a la imagen. Los puntos y los polígonos siguen dibujándose con sus coordenadas reales. Si el proveedor externo no responde en absoluto, se informa de ello y se conservan las capas temáticas y los controles.

### Individuos según producción

Se eliminó el gráfico **Resultado por muestreo** del individuo.

En su lugar se presentan **dos tortas de anillo**, una para Bosque y otra para Potrero. Un selector permite elegir uno de los siete muestreos. Cada torta muestra el número de individuos y el porcentaje de cada categoría dentro de su ambiente:

- Aceite: volumen de aceite mayor que cero y resina igual a cero.
- Resina: volumen de resina mayor que cero y aceite igual a cero.
- Aceite y resina: ambos volúmenes mayores que cero en ese muestreo.
- Sin producción: ambos volúmenes iguales a cero.
- Sin dato: se mostraría si falta un volumen, sin convertirlo en cero.

Cada individuo se cuenta una sola vez en el muestreo elegido. La aplicación comprueba que no haya duplicados árbol–muestreo antes del conteo. El denominador es el número de individuos de cada ambiente presentes en esa fecha. En los datos actuales son 30 en Bosque y 15 en Potrero.

**La gráfica individual de aceite y resina se conserva.** Las tortas son una comparación general y no cambian al escoger un árbol en la ficha. Sí cambian con su propio selector de muestreo.

### Colores de mapas

Se ajustaron las paletas a las leyendas de las tres capturas aportadas:

- Cobertura: bosque verde intenso, herbazal naranja, cultivos amarillo, sin cobertura rojo, agua azul y cobertura mixta naranja claro.
- Estado ecológico: Bueno verde, Regular amarillo y Deficiente rojo.
- NDVI: caliente oscilatorio rojo; frío intensificándose azul oscuro; frío persistente azul; frío disminuyendo azul claro; frío esporádico cian; frío oscilatorio celeste pálido; sin patrón detectado oscuro.

Los RGB se muestrearon del interior de las leyendas JPEG. No son colores originales de un archivo `.lyrx`, sino una reproducción de las referencias visuales recibidas. `PALETAS_VISOR.json` documenta los valores utilizados.

Solo cambia el color de los píxeles de cada clase, no su extensión, geometría, atributos ni cálculos. La paleta de la leyenda y de la torta NDVI es la misma que la del mapa.

### Superficie por patrón emergente

Se sustituyeron las barras por una torta de anillo. Los porcentajes se calculan a partir de `AREA_HA` sobre el área total de los siete patrones. Se muestran hectáreas y porcentajes en la leyenda y al consultar un sector. Las categorías pequeñas no se eliminan ni se agrupan en «Otros».

### Encuadre del clima

Al elegir un punto climático, el mapa muestra el polígono original que lo contiene y lo resalta. El encuadre incluye contexto suficiente para no recortarlo.

- Bosque: barra de escala de referencia de **100 m**.
- Abierto, Árbol y Bosquete: barra de escala de referencia de **20 m**.

Estas distancias se utilizan **para la visualización y la barra de escala**, no como radios de influencia ni nuevos buffers de muestreo. No se modifica la delimitación original ni la asignación climática de los árboles. El botón ⌖ restaura este encuadre; el usuario puede después acercar o alejar manualmente.

## Archivos

```text
app.py
requirements.txt
data/                   # tablas y geometrías originales convertidas
visor_web/
  index.html
  style.css
  mapas.js
  interfaz.js
  datos.js
  assets/               # imágenes temáticas recoloreadas
  vendor/plotly.min.js
PALETAS_VISOR.json
VERIFICACION_DATOS.json
PRUEBAS_VISOR.json
COMO_ACTUALIZAR.txt
```

## Ejecutar localmente

```bash
python -m pip install -r requirements.txt
python -m streamlit run app.py
```

En Windows se puede usar `iniciar_visor.bat`. No se necesita ArcGIS. También se conserva `ABRIR_SIN_PYTHON.bat` para abrir la copia HTML local. Los fondos satelitales y de calles requieren conexión al proveedor; las capas temáticas y las gráficas están en el paquete.

## Datos y alcance

Se conservan los 45 árboles, 315 registros productivos, 450 observaciones NDVI, 48 registros climáticos, coberturas, estados ecológicos, transiciones, aforos y las tres muestras bromatológicas, incluida Copaiba. No se recalcularon pruebas estadísticas.

Se conservan también las observaciones sobre precipitación pendiente de revisión, las unidades pendientes de confirmación y el carácter de referencia de los puntos climáticos. El material Copaiba no se presenta como pasto ni como alimento para ganado.

Los patrones emergentes son agrupamientos estadísticos relativos de NDVI, no categorías de temperatura ni equivalentes automáticos del estado ecológico.

Al cambiar los CSV posteriormente, se puede ejecutar `python tools/sincronizar_tablas.py` para actualizar su copia de consulta `datos.js`. No modifica las imágenes cartográficas.

## Verificación realizada

- Sintaxis JavaScript y Python validada.
- Tortas verificadas en los siete muestreos: conteos 30/15 y porcentajes que suman 100 % por ambiente.
- Selección del árbol, actualización de su ficha y de sus siete valores productivos verificadas.
- Comparadores 2018/2023 y estado ecológico comprobados como representaciones distintas.
- Encuadre de los cuatro puntos climáticos y visibilidad de sus polígonos revisados.
- Interfaz revisada en Chromium a 360, 390, 768 y 1440 píxeles.
- Fallo del proveedor y retorno a un nivel anterior de teselas simulados para probar el código.

**La conectividad real a Esri no se pudo verificar desde el entorno de pruebas.** Las pruebas cartográficas utilizaron los datos temáticos reales, con respuestas externas simuladas. Debe comprobarse el fondo satelital en el enlace de Streamlit tras actualizarlo. Este paquete no modifica por sí mismo el repositorio ni el despliegue.

## Referencias técnicas

- Ampliación a partir del nivel nativo disponible: https://leafletjs.com/reference.html#tilelayer-maxnativezoom (principio de overzoom; el visor usa un renderizador canvas propio).
- Gráficas de torta y etiquetas: https://plotly.com/javascript/reference/pie/
- Actualización del despliegue desde GitHub: https://docs.streamlit.io/deploy/streamlit-community-cloud/manage-your-app/edit-your-app
