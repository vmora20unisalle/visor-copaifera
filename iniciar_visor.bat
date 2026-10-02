@echo off
setlocal
cd /d "%~dp0"
python --version >nul 2>&1
if errorlevel 1 (
 echo No se encontro Python. Instala Python y activa Add Python to PATH.
 pause
 exit /b 1
)
python -m pip install -r requirements.txt
if errorlevel 1 (
 echo No se pudieron instalar las dependencias. Revisa la conexion.
 pause
 exit /b 1
)
python -m streamlit run app.py
pause
