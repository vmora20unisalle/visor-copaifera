"""Actualiza la copia de tablas web; no modifica las imágenes cartográficas."""
from pathlib import Path
import csv
import json
import math
BASE = Path(__file__).resolve().parents[1]
BUNDLE = BASE / "visor_web" / "datos.js"
PREFIX = "window.VISOR_DATA = "
def parse(value):
    if value == "":
        return None
    try:
        n = float(value)
        return (int(n) if n.is_integer() else n) if math.isfinite(n) else None
    except ValueError:
        return value
def main():
    text = BUNDLE.read_text(encoding="utf-8")
    if not text.startswith(PREFIX):
        raise ValueError("Formato de datos.js no reconocido")
    data = json.loads(text[len(PREFIX):].rstrip().removesuffix(";"))
    for path in (BASE / "data").glob("*.csv"):
        if path.stem not in data:
            continue
        with path.open(encoding="utf-8-sig", newline="") as f:
            data[path.stem] = [{k: parse(v) for k, v in r.items()} for r in csv.DictReader(f)]
        print(path.name, len(data[path.stem]), "filas")
    BUNDLE.with_suffix(".js.bak").write_text(text, encoding="utf-8")
    BUNDLE.write_text(PREFIX + json.dumps(data, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + ";\n", encoding="utf-8")
    print("Actualizado:", BUNDLE)
if __name__ == "__main__":
    main()
