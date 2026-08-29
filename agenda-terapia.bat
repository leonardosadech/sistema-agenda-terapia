@echo off
cd /d "%~dp0"
echo Instalando dependencias...
call npm install
echo Iniciando o servidor de desenvolvimento...
start "" http://localhost:5173
npm run dev