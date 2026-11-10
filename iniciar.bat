@echo off
chcp 65001 > nul
title Patinhas Club
rem Liga o site no computador: instala o que falta e abre o servidor.
rem Antes, abra o XAMPP e clique em Start no MySQL.

cd /d "%~dp0Servidor"

where node > nul 2> nul
if errorlevel 1 (
  echo Instale o Node.js 20 ou mais novo: https://nodejs.org
  pause
  exit /b 1
)

if not exist node_modules (
  echo Instalando as dependencias (so na primeira vez^)...
  call npm install
  if errorlevel 1 (
    pause
    exit /b 1
  )
)

if not exist .env copy .env.exemplo .env > nul

echo.
echo Abrindo http://localhost:3000 ...
start "" http://localhost:3000
call npm start
pause
