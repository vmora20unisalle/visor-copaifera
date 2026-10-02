"""Copaifera v4. Streamlit sirve una interfaz de consulta responsive local."""
from pathlib import Path
import streamlit as st
import streamlit.components.v1 as components

BASE = Path(__file__).resolve().parent
FRONTEND = BASE / "visor_web"
st.set_page_config(page_title="Copaifera: paisaje y sistemas ganaderos", page_icon="🌿", layout="wide", initial_sidebar_state="collapsed")
st.markdown("""
<style>
.stApp,[data-testid="stAppViewContainer"]{background:#f4f7f2;}
[data-testid="stMainBlockContainer"],.block-container{padding:0 .4rem 0!important;max-width:100%!important;}
[data-testid="stHeader"]{display:none;}
[data-testid="stMain"]{overflow-x:hidden;}
[data-testid="stElementContainer"]{min-width:0;}
iframe{display:block;width:100%;border:0;}
@media(max-width:640px){[data-testid="stMainBlockContainer"],.block-container{padding:0!important;}}
</style>
""", unsafe_allow_html=True)
required = ["index.html", "style.css", "interfaz.js", "mapas.js", "datos.js", "vendor/plotly.min.js"]
missing = [x for x in required if not (FRONTEND / x).is_file()]
if missing:
    st.error("Faltan archivos de la actualización: " + ", ".join(missing))
    st.info("Sube la carpeta visor_web completa al mismo nivel de app.py y requirements.txt.")
    st.stop()
visor = components.declare_component("copaifera_resultados_v4", path=str(FRONTEND))
# La selección se gestiona en el navegador y no recarga todos los mapas.
# El componente adapta su altura mediante el protocolo oficial de Streamlit.
visor(version="4.0.0", key="visor_copaifera_v4", default=None)
