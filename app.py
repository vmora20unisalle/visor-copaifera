from pathlib import Path
import json
import math

import pandas as pd
import streamlit as st
import streamlit.components.v1 as components
import folium
from folium import FeatureGroup
from folium.plugins import SideBySideLayers
import plotly.express as px
import plotly.graph_objects as go
from plotly.subplots import make_subplots

BASE = Path(__file__).parent
DATA = BASE / "data"

st.set_page_config(
    page_title="Visor Copaifera pubiflora",
    page_icon="🌿",
    layout="wide",
)

# -----------------------
# ESTILO
# -----------------------
st.markdown(
    """
    <style>
      :root{
        --verde-oscuro:#1F5E3B;
        --verde:#3E7C59;
        --verde-suave:#DDEBDD;
        --verde-muy-suave:#F4F8F2;
        --texto:#2F3432;
        --borde:#D8E3D8;
      }
      .stApp { background: #F7FBF7; color: var(--texto); }
      h1,h2,h3 { color: var(--verde-oscuro) !important; }
      [data-testid="stTabs"] button { color:#355B45; font-weight:600; }
      [data-testid="stMetric"] {
        background:white; border:1px solid var(--borde); border-radius:14px;
        padding:12px 14px;
      }
      div[data-testid="stDataFrame"] { border:1px solid var(--borde); border-radius:12px; overflow:hidden; }
      .visor-card {
        background:white; border:1px solid var(--borde); border-radius:16px;
        padding:16px 18px; margin-bottom:12px;
      }
      .visor-card h4 { margin:0 0 10px 0; color:var(--verde-oscuro); }
      .visor-kv { display:grid; grid-template-columns:1fr 1fr; gap:8px 18px; }
      .visor-kv div { border-bottom:1px solid #EEF3EE; padding:6px 0; }
      .visor-kv b { color:#365D46; }
      .note {
        background:#EEF6EE; border-left:5px solid #679B73; border-radius:8px;
        padding:10px 12px; color:#33483B; margin:8px 0 14px 0;
      }
      .warning {
        background:#FFF7E8; border-left:5px solid #D8A33C; border-radius:8px;
        padding:10px 12px; color:#5A4925; margin:8px 0 14px 0;
      }
      .small-muted { color:#68746D; font-size:0.92rem; }
    </style>
    """,
    unsafe_allow_html=True,
)

# -----------------------
# CARGA DE DATOS
# -----------------------
@st.cache_data
def load_csv(name, parse_dates=None):
    return pd.read_csv(DATA / name, parse_dates=parse_dates)

@st.cache_data
def load_json(name):
    return json.loads((DATA / name).read_text(encoding="utf-8"))

arboles = load_csv("arboles.csv")
produccion = load_csv("produccion.csv", parse_dates=["FECHA"])
ndvi = load_csv("ndvi_copa_tiempo.csv", parse_dates=["FECHA"])
clima = load_csv("clima_2025.csv")
precipitacion = load_csv("precipitacion.csv")
aforos = load_csv("aforos_forraje.csv")
calidad = load_csv("calidad_forraje.csv")
transiciones = load_csv("matriz_transicion.csv")
metricas_paisaje = load_csv("metricas_paisaje.csv")
patrones_resumen = load_csv("patrones_resumen.csv")
resultados_clave = load_csv("resultados_clave.csv")

geo_arboles = load_json("arboles.geojson")
geo_clima = load_json("ambientes_clima.geojson")
geo_borde = load_json("poligonos_borde.geojson")
geo_zona = load_json("zona_estudio.geojson")
geo_cov18 = load_json("cobertura_2018.geojson")
geo_cov23 = load_json("cobertura_2023.geojson")
geo_patrones = load_json("patrones_ndvi.geojson")
meta = load_json("metadata.json")

# Limpieza de fechas y textos
produccion["FECHA"] = pd.to_datetime(produccion["FECHA"], errors="coerce")
ndvi["FECHA"] = pd.to_datetime(ndvi["FECHA"], errors="coerce")
clima["MES_NUM"] = clima["MES_NUM"].astype(int)
precipitacion["ANIO"] = precipitacion["ANIO"].astype(int)

# -----------------------
# HELPERS
# -----------------------
GREEN = "#1F5E3B"
GREEN2 = "#3E7C59"
LIGHT_GREEN = "#A7CFA8"
ORANGE = "#D9822B"
BLUE = "#4472C4"
GRAY = "#8C9690"

coverage_colors = {
    "Bosque": "#1B5E20",
    "Herbazal": "#9CCB3B",
    "Cultivos": "#E3B23C",
    "Sin cobertura": "#C97C5D",
    "Sin Cobertura": "#C97C5D",
    "Agua": "#4A90E2",
    "Vegetación Mixta": "#6FAE45",
}

pattern_es = {
    "Diminishing Cold Spot": "Punto frío en disminución",
    "Intensifying Cold Spot": "Punto frío en intensificación",
    "No Pattern Detected": "Sin patrón detectado",
    "Oscillating Cold Spot": "Punto frío oscilante",
    "Oscillating Hot Spot": "Punto caliente oscilante",
    "Persistent Cold Spot": "Punto frío persistente",
    "Sporadic Cold Spot": "Punto frío esporádico",
}
pattern_colors = {
    "Diminishing Cold Spot": "#8EC5FF",
    "Intensifying Cold Spot": "#1F5AA6",
    "No Pattern Detected": "#B9C0BC",
    "Oscillating Cold Spot": "#5DA9E9",
    "Oscillating Hot Spot": "#F28E2B",
    "Persistent Cold Spot": "#173B70",
    "Sporadic Cold Spot": "#3F7FC4",
}

month_order = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
month_map = {m.lower(): i+1 for i,m in enumerate(month_order)}


def folium_html(m, height=560):
    components.html(m.get_root().render(), height=height, scrolling=False)


def add_light_base(m, imagery=False):
    if imagery:
        folium.TileLayer(
            tiles="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
            attr="Esri World Imagery",
            name="Imagen satelital",
            overlay=False,
            control=True,
        ).add_to(m)
    else:
        folium.TileLayer("CartoDB positron", name="Mapa claro", control=True).add_to(m)


def fmt(v, decimals=2, dash="—"):
    if pd.isna(v):
        return dash
    try:
        return f"{float(v):,.{decimals}f}".replace(",", "X").replace(".", ",").replace("X", ".")
    except Exception:
        return str(v)


def card_tree(row):
    return f"""
    <div class="visor-card">
      <h4>Ficha del árbol seleccionado</h4>
      <div class="visor-kv">
        <div><b>Etiqueta</b><br>{row['ETIQUETA']}</div>
        <div><b>Ambiente</b><br>{row['AMBIENTE']}</div>
        <div><b>DAP</b><br>{fmt(row['DAP_cm'],1)} cm</div>
        <div><b>Altura</b><br>{fmt(row['ALTURA_m'],1)} m</div>
        <div><b>Área de copa</b><br>{fmt(row['AREA_COPA_m2'],1)} m²</div>
        <div><b>Distancia al borde</b><br>{fmt(row['Dist_Borde_m'],1)} m</div>
        <div><b>Referencia climática</b><br>{row['REF_CLIMA']}</div>
        <div><b>Radio de copa</b><br>{fmt(row['RADIO_COPA_m'],1)} m</div>
        <div><b>Aceite acumulado</b><br>{fmt(row['ACEITE_TOTAL_ml'],1)} mL</div>
        <div><b>Resina acumulada</b><br>{fmt(row['RESINA_TOTAL_ml'],1)} mL</div>
      </div>
      <hr style="border:none;border-top:1px solid #E5EEE5;margin:14px 0 10px 0;">
      <div class="small-muted"><b>NDVI histórico:</b> media {fmt(row['NDVI_HIST_MEDIA'],3)}, mínimo {fmt(row['NDVI_HIST_MIN'],3)}, máximo {fmt(row['NDVI_HIST_MAX'],3)}, variabilidad (SD) {fmt(row['NDVI_HIST_SD'],3)}.</div>
    </div>
    """


def plot_style(fig, height=390):
    fig.update_layout(
        height=height,
        margin=dict(l=20, r=20, t=55, b=25),
        paper_bgcolor="rgba(0,0,0,0)",
        plot_bgcolor="#FFFFFF",
        font=dict(color="#36413B"),
        title_font=dict(color=GREEN, size=18),
        legend_title_text="",
    )
    fig.update_xaxes(gridcolor="#EDF2ED")
    fig.update_yaxes(gridcolor="#EDF2ED")
    return fig

# -----------------------
# ENCABEZADO
# -----------------------
st.title("Visor geográfico de resultados — *Copaifera pubiflora*")
st.markdown(
    "<div class='small-muted'>Fragmentación del paisaje, efecto de borde y evaluación de su integración como alternativa en sistemas ganaderos.</div>",
    unsafe_allow_html=True,
)

m1,m2,m3,m4 = st.columns(4)
m1.metric("Árboles monitoreados", f"{len(arboles)}")
m2.metric("Muestreos productivos", f"{int(produccion['MUESTREO'].nunique())}")
m3.metric("Fechas NDVI", f"{int(ndvi['FECHA'].nunique())}")
m4.metric("Referencias climáticas", f"{int(clima['REF_CLIMA'].nunique())}")

# -----------------------
# PESTAÑAS
# -----------------------
tab_paisaje, tab_copaifera, tab_ndvi, tab_clima = st.tabs([
    "Paisaje y coberturas",
    "Copaifera pubiflora",
    "Patrones temporales NDVI",
    "Clima y forraje",
])

# ============================================================
# 1. PAISAJE
# ============================================================
with tab_paisaje:
    st.header("Paisaje y cambio de coberturas")
    st.markdown("Arrastra el separador para comparar las coberturas clasificadas en 2018 y 2023.")

    m = folium.Map(location=meta["zona_center"], zoom_start=12, tiles=None, control_scale=True)
    add_light_base(m, imagery=True)

    left = FeatureGroup(name="Cobertura 2018")
    right = FeatureGroup(name="Cobertura 2023")

    folium.GeoJson(
        geo_cov18,
        style_function=lambda f: {
            "fillColor": coverage_colors.get(f["properties"].get("COBERTURA"), "#BDBDBD"),
            "color": coverage_colors.get(f["properties"].get("COBERTURA"), "#BDBDBD"),
            "weight": 0.2,
            "fillOpacity": 0.82,
        },
        tooltip=folium.GeoJsonTooltip(fields=["COBERTURA","ESTADO_ECOLOGICO","IBP"], aliases=["Cobertura","Estado ecológico","IBP"]),
    ).add_to(left)
    folium.GeoJson(
        geo_cov23,
        style_function=lambda f: {
            "fillColor": coverage_colors.get(f["properties"].get("COBERTURA"), "#BDBDBD"),
            "color": coverage_colors.get(f["properties"].get("COBERTURA"), "#BDBDBD"),
            "weight": 0.2,
            "fillOpacity": 0.82,
        },
        tooltip=folium.GeoJsonTooltip(fields=["COBERTURA","ESTADO_ECOLOGICO","IBP"], aliases=["Cobertura","Estado ecológico","IBP"]),
    ).add_to(right)

    left.add_to(m); right.add_to(m)
    SideBySideLayers(left, right).add_to(m)
    folium.GeoJson(
        geo_zona,
        name="Zona de estudio",
        style_function=lambda f: {"fillOpacity":0, "color":"#1F1F1F", "weight":2.0},
    ).add_to(m)
    m.fit_bounds(meta["zona_bounds"])
    folium_html(m, 610)

    st.markdown("**Leyenda de coberturas**")
    legend_cols = st.columns(len(coverage_colors))
    for col,(name,color) in zip(legend_cols,coverage_colors.items()):
        col.markdown(f"<span style='display:inline-block;width:12px;height:12px;background:{color};border-radius:2px;margin-right:5px'></span>{name}", unsafe_allow_html=True)

    c1,c2 = st.columns([1.05,1])
    with c1:
        fig_ibp = px.bar(
            metricas_paisaje,
            x="COBERTURA", y="IBP", color="ANIO", barmode="group",
            title="Índice de Biodiversidad del Paisaje (IBP)",
            labels={"COBERTURA":"Cobertura","IBP":"IBP","ANIO":"Año"},
        )
        plot_style(fig_ibp, 410)
        st.plotly_chart(fig_ibp, use_container_width=True)
    with c2:
        t = transiciones.sort_values("PORCENTAJE", ascending=True)
        fig_t = px.bar(
            t, x="PORCENTAJE", y="TRANSICION_2018_2023", orientation="h",
            title="Transiciones principales 2018–2023",
            labels={"PORCENTAJE":"Porcentaje (%)","TRANSICION_2018_2023":"Transición"},
            text="PORCENTAJE",
        )
        fig_t.update_traces(texttemplate="%{text:.2f}%", textposition="outside")
        plot_style(fig_t, 410)
        st.plotly_chart(fig_t, use_container_width=True)

    with st.expander("Consultar métricas de paisaje"):
        view = metricas_paisaje[["ANIO","COBERTURA","AREA_HA","PLAND","NP","LPI","PAFRAC","CONTAG","IBP","ESTADO_ECOLOGICO"]].copy()
        view.columns = ["Año","Cobertura","Área (ha)","PLAND (%)","NP","LPI (%)","PAFRAC","CONTAG (%)","IBP","Estado ecológico"]
        st.dataframe(view, hide_index=True, use_container_width=True)

# ============================================================
# 2. COPAIFERA
# ============================================================
with tab_copaifera:
    st.header("Consulta por individuo de *Copaifera pubiflora*")

    selector_cols = st.columns([1.1,1.4,2.5])
    with selector_cols[0]:
        ambiente_filtro = st.selectbox("Filtrar por ambiente", ["Todos"] + sorted(arboles["AMBIENTE"].dropna().unique().tolist()))
    subset = arboles if ambiente_filtro == "Todos" else arboles[arboles["AMBIENTE"] == ambiente_filtro]
    with selector_cols[1]:
        etiqueta = st.selectbox("Seleccionar árbol", sorted(subset["ETIQUETA"].tolist()))

    row = arboles.loc[arboles["ETIQUETA"] == etiqueta].iloc[0]

    map_col, info_col = st.columns([1.35,1])
    with map_col:
        lat, lon = float(row["LATITUD"]), float(row["LONGITUD"])
        mt = folium.Map(location=[lat,lon], zoom_start=17, tiles=None, control_scale=True)
        add_light_base(mt, imagery=True)

        folium.GeoJson(
            geo_borde,
            name="Bosque y bosquetes",
            style_function=lambda f: {
                "fillColor":"#2F7D32" if f["properties"].get("AMBIENTE") == "Bosque" else "#F2B84B",
                "color":"#1C5D2C" if f["properties"].get("AMBIENTE") == "Bosque" else "#C48925",
                "weight":1.5,"fillOpacity":0.15,
            },
            tooltip=folium.GeoJsonTooltip(fields=["AMBIENTE","AREA_HA"], aliases=["Ambiente","Área (ha)"]),
        ).add_to(mt)

        for _,r in arboles.iterrows():
            selected = r["ETIQUETA"] == etiqueta
            color = "#F2C94C" if selected else ("#1F7A3E" if r["AMBIENTE"] == "Bosque" else "#D9822B")
            folium.CircleMarker(
                location=[r["LATITUD"],r["LONGITUD"]],
                radius=9 if selected else 5,
                color="#111111" if selected else color,
                weight=2 if selected else 1,
                fill=True, fill_color=color, fill_opacity=0.95,
                tooltip=f"{r['ETIQUETA']} · {r['AMBIENTE']}",
            ).add_to(mt)

        for feat in geo_clima["features"]:
            p=feat["properties"]; c=feat["geometry"]["coordinates"]
            folium.CircleMarker([c[1],c[0]], radius=5, color="#754D9A", fill=True, fill_opacity=0.9,
                                tooltip=f"Referencia climática: {p.get('Dataloger')}").add_to(mt)

        folium.LayerControl(collapsed=True).add_to(mt)
        folium_html(mt, 545)

    with info_col:
        st.markdown(card_tree(row), unsafe_allow_html=True)
        st.markdown("<div class='note'>Al cambiar el árbol en el selector, el mapa se centra automáticamente y todos los resultados individuales se actualizan.</div>", unsafe_allow_html=True)

    st.subheader("Producción del árbol seleccionado")
    prod_tree = produccion[produccion["ID_ARBOL"] == etiqueta].sort_values("MUESTREO").copy()
    prod_long = prod_tree.melt(id_vars=["MUESTREO","FECHA"], value_vars=["ACEITE_ML","RESINA_ML"], var_name="Producto", value_name="mL")
    prod_long["Producto"] = prod_long["Producto"].map({"ACEITE_ML":"Aceite","RESINA_ML":"Resina"})
    fig_ind = px.line(prod_long, x="MUESTREO", y="mL", color="Producto", markers=True,
                      title=f"Producción por muestreo — {etiqueta}", labels={"MUESTREO":"Muestreo","mL":"Producción (mL)"})
    fig_ind.update_xaxes(dtick=1)
    plot_style(fig_ind, 420)
    st.plotly_chart(fig_ind, use_container_width=True)

    st.subheader("Comparación general Bosque vs. Potrero")
    avg = produccion.groupby(["MUESTREO","AMBIENTE"], as_index=False).agg(ACEITE_ML=("ACEITE_ML","mean"), RESINA_ML=("RESINA_ML","mean"))
    g1,g2 = st.columns(2)
    with g1:
        fig_a = px.line(avg, x="MUESTREO", y="ACEITE_ML", color="AMBIENTE", markers=True,
                        title="Aceite promedio por árbol", labels={"MUESTREO":"Muestreo","ACEITE_ML":"Aceite promedio (mL)","AMBIENTE":"Ambiente"})
        fig_a.update_xaxes(dtick=1); plot_style(fig_a, 380); st.plotly_chart(fig_a, use_container_width=True)
    with g2:
        fig_r = px.line(avg, x="MUESTREO", y="RESINA_ML", color="AMBIENTE", markers=True,
                        title="Resina promedio por árbol", labels={"MUESTREO":"Muestreo","RESINA_ML":"Resina promedio (mL)","AMBIENTE":"Ambiente"})
        fig_r.update_xaxes(dtick=1); plot_style(fig_r, 380); st.plotly_chart(fig_r, use_container_width=True)

    with st.expander("Resultados estadísticos clave de producción"):
        r = resultados_clave[resultados_clave["bloque"].isin(["Producción","Producción temporal"])]
        st.dataframe(r[["indicador","detalle","estadistico","p"]], hide_index=True, use_container_width=True)

# ============================================================
# 3. NDVI TEMPORAL
# ============================================================
with tab_ndvi:
    st.header("Patrones temporales del NDVI")
    st.markdown("Los patrones emergentes sintetizan el comportamiento espacio-temporal del NDVI. Se muestran como contexto temporal del paisaje y no como sustituto de las mediciones productivas.")

    mn = folium.Map(location=meta["zona_center"], zoom_start=12, tiles=None, control_scale=True)
    add_light_base(mn, imagery=False)
    folium.GeoJson(
        geo_patrones,
        name="Patrones emergentes NDVI",
        style_function=lambda f: {
            "fillColor": pattern_colors.get(f["properties"].get("PATTERN"), "#BDBDBD"),
            "color": pattern_colors.get(f["properties"].get("PATTERN"), "#BDBDBD"),
            "weight":0.4,"fillOpacity":0.78,
        },
        tooltip=folium.GeoJsonTooltip(fields=["PATTERN"], aliases=["Patrón"]),
    ).add_to(mn)
    folium.GeoJson(geo_zona, style_function=lambda f:{"fillOpacity":0,"color":"#1F1F1F","weight":1.8}).add_to(mn)
    mn.fit_bounds(meta["zona_bounds"])
    folium_html(mn, 590)

    legend_items = "".join([
        f"<div style='display:flex;align-items:center;gap:7px;margin:4px 10px 4px 0'><span style='width:13px;height:13px;background:{pattern_colors[k]};display:inline-block;border-radius:2px'></span>{pattern_es[k]}</div>"
        for k in pattern_es
    ])
    st.markdown(f"<div class='visor-card'><h4>Leyenda</h4><div style='display:flex;flex-wrap:wrap'>{legend_items}</div></div>", unsafe_allow_html=True)

    pr = patrones_resumen.copy()
    pr["Patrón"] = pr["PATTERN"].map(pattern_es).fillna(pr["PATTERN"])
    pr = pr.sort_values("AREA_HA", ascending=True)
    fig_p = px.bar(pr, x="AREA_HA", y="Patrón", orientation="h", title="Superficie por patrón emergente",
                   labels={"AREA_HA":"Área (ha)"})
    plot_style(fig_p, 430)
    st.plotly_chart(fig_p, use_container_width=True)

    st.markdown("<div class='note'>Las métricas históricas de NDVI por árbol (media, mínimo, máximo y variabilidad) se consultan en la ficha individual de la pestaña Copaifera.</div>", unsafe_allow_html=True)

# ============================================================
# 4. CLIMA Y FORRAJE
# ============================================================
with tab_clima:
    st.header("Clima, microambiente y forraje")

    clima_opts = sorted(clima["REF_CLIMA"].dropna().unique().tolist())
    ref = st.selectbox("Referencia climática para el climograma", clima_opts, index=clima_opts.index("Bosque") if "Bosque" in clima_opts else 0)

    cc1,cc2 = st.columns([1,1.35])
    with cc1:
        mc = folium.Map(location=[clima["LATITUD"].mean(), clima["LONGITUD"].mean()], zoom_start=15, tiles=None, control_scale=True)
        add_light_base(mc, imagery=True)
        for _,r in clima.drop_duplicates("REF_CLIMA").iterrows():
            selected = r["REF_CLIMA"] == ref
            folium.CircleMarker(
                [r["LATITUD"],r["LONGITUD"]], radius=9 if selected else 6,
                color="#1F5E3B" if selected else "#754D9A", fill=True,
                fill_color="#9CCB3B" if selected else "#B89AD6", fill_opacity=0.95,
                tooltip=r["REF_CLIMA"],
            ).add_to(mc)
        folium_html(mc, 430)

    with cc2:
        cdf = clima[clima["REF_CLIMA"] == ref].sort_values("MES_NUM").copy()
        p2025 = precipitacion[precipitacion["ANIO"] == 2025].copy()
        p2025["MES_NUM"] = p2025["MES"].astype(str).str.strip().str.lower().map(month_map)
        # Excluir registros señalados para revisión de la gráfica principal
        valid_p = p2025[p2025["OBSERVACION"].isna() | (p2025["OBSERVACION"].astype(str).str.strip() == "")].copy()

        climog = make_subplots(specs=[[{"secondary_y": True}]])
        climog.add_trace(go.Bar(x=valid_p["MES_NUM"], y=valid_p["TOTAL_MES_MM"], name="Precipitación (mm)", opacity=0.55), secondary_y=False)
        climog.add_trace(go.Scatter(x=cdf["MES_NUM"], y=cdf["TEMPERATURA_C"], name=f"Temperatura · {ref}", mode="lines+markers"), secondary_y=True)
        climog.update_xaxes(title_text="Mes", tickmode="array", tickvals=list(range(1,13)), ticktext=[m[:3] for m in month_order])
        climog.update_yaxes(title_text="Precipitación (mm)", secondary_y=False)
        climog.update_yaxes(title_text="Temperatura (°C)", secondary_y=True)
        climog.update_layout(title=f"Climograma de referencia — {ref}")
        plot_style(climog, 430)
        st.plotly_chart(climog, use_container_width=True)

    flagged = precipitacion[precipitacion["OBSERVACION"].notna() & (precipitacion["OBSERVACION"].astype(str).str.strip() != "")]
    if not flagged.empty:
        st.markdown("<div class='warning'>Los registros marcados para revisión en la fuente (diciembre de 2025 y enero de 2026) se conservan en la tabla, pero no se usan en el climograma principal.</div>", unsafe_allow_html=True)

    st.subheader("Microclima mensual")
    variable = st.selectbox(
        "Variable microclimática",
        ["HUMEDAD_PCT","ITH_CALCULADO","RAFA"],
        format_func=lambda x: {"HUMEDAD_PCT":"Humedad relativa (%)","ITH_CALCULADO":"ITH calculado","RAFA":"RAFA"}[x],
    )
    ylabel = {"HUMEDAD_PCT":"Humedad relativa (%)","ITH_CALCULADO":"ITH","RAFA":"RAFA"}[variable]
    fig_c = px.line(clima.sort_values("MES_NUM"), x="MES_NUM", y=variable, color="REF_CLIMA", markers=True,
                    title=f"{ylabel} por referencia climática", labels={"MES_NUM":"Mes",variable:ylabel,"REF_CLIMA":"Referencia"})
    fig_c.update_xaxes(dtick=1); plot_style(fig_c, 390); st.plotly_chart(fig_c, use_container_width=True)

    st.subheader("Forraje")
    f1,f2 = st.columns(2)
    with f1:
        af = aforos.pivot(index="MES", columns="TRATAMIENTO", values="MEDIA_G_M2").reset_index().sort_values("MES")
        aflong = af.melt(id_vars="MES", var_name="Tratamiento", value_name="g_m2")
        aflong["Tratamiento"] = aflong["Tratamiento"].map({"abierto":"Abierto","arbol":"Bajo árbol"}).fillna(aflong["Tratamiento"])
        fig_af = px.line(aflong, x="MES", y="g_m2", color="Tratamiento", markers=True,
                         title="Aforo de forraje", labels={"MES":"Mes","g_m2":"Biomasa (g/m²)"})
        plot_style(fig_af, 390); st.plotly_chart(fig_af, use_container_width=True)
    with f2:
        brom_vars = {
            "PROTEINA_CRUDA_G100G":"Proteína cruda (g/100 g)",
            "FDN_G100G_MS":"FDN (g/100 g MS)",
            "FDA_G100G_MS":"FDA (g/100 g MS)",
            "DIGESTIBILIDAD_MS_G100G":"Digestibilidad MS (g/100 g)",
            "POTASIO_G100G_MS":"Potasio (g/100 g MS)",
            "ENERGIA_BRUTA_MCAL_KG_MS":"Energía bruta (Mcal/kg MS)",
            "ED_RUMIANTES_MCAL_KG_MS":"ED rumiantes (Mcal/kg MS)",
        }
        bvar = st.selectbox("Variable bromatológica", list(brom_vars), format_func=lambda x:brom_vars[x])
        fig_b = px.bar(calidad, x="INGREDIENTE", y=bvar, title="Caracterización bromatológica",
                       labels={"INGREDIENTE":"Muestra", bvar:brom_vars[bvar]}, text=bvar)
        fig_b.update_traces(texttemplate="%{text:.2f}", textposition="outside")
        plot_style(fig_b, 390); st.plotly_chart(fig_b, use_container_width=True)

    st.markdown("<div class='note'>La comparación de forraje corresponde a Humidicola bajo sombra y a pleno sol. La fila Copaiba se conserva como caracterización bromatológica independiente del material de la especie.</div>", unsafe_allow_html=True)

    with st.expander("Resultados estadísticos clave de clima y forraje"):
        r = resultados_clave[resultados_clave["bloque"].isin(["Clima","Forraje"])]
        st.dataframe(r[["indicador","detalle","estadistico","p"]], hide_index=True, use_container_width=True)

# Pie
st.markdown("---")
st.markdown("<div class='small-muted'>Visor de consulta de resultados · Universidad de La Salle · Proyecto de modalidad de grado</div>", unsafe_allow_html=True)
