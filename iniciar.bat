@echo off
setlocal EnableExtensions
chcp 65001 > nul
title Patinhas Club
rem ============================================================================
rem  Patinhas Club - dois cliques e pronto. Nao precisa instalar nada.
rem  Na primeira vez: baixa um Node.js portatil (so dentro desta pasta, se o
rem  computador nao tiver um novo o bastante), instala as bibliotecas do servidor
rem  e cria o banco de dados (arquivo Servidor\dados\patinhas.db).
rem
rem    iniciar.bat          liga o site e abre o navegador
rem    iniciar.bat banco    recria o banco com os dados de exemplo e liga o site
rem
rem  No VS Code: Ctrl+Shift+B (tarefa "Iniciar Patinhas Club") ou F5.
rem ============================================================================

cd /d "%~dp0"
set "RAIZ=%~dp0"
set "PORTATIL=%RAIZ%.node\node"

rem ---- 1. Node.js: o portatil desta pasta, o do computador ou baixa um ----
if exist "%PORTATIL%\node.exe" goto usar_portatil
call :node_do_computador_serve
if not errorlevel 1 goto node_pronto
call :baixar_node
if errorlevel 1 goto falhou
:usar_portatil
set "PATH=%PORTATIL%;%PATH%"
:node_pronto

rem ---- 2. Bibliotecas do servidor (npm install so quando falta alguma) ----
cd /d "%RAIZ%Servidor"
node -e "for (const d of Object.keys(require('./package.json').dependencies)) require.resolve(d)" > nul 2> nul
if not errorlevel 1 goto bibliotecas_prontas
echo.
echo Instalando as bibliotecas do servidor - so na primeira vez, precisa de internet...
call npm install --no-audit --no-fund
if errorlevel 1 goto falhou
:bibliotecas_prontas

rem ---- 3. Configuracao e banco de dados ----
if not exist ".env" copy ".env.exemplo" ".env" > nul
if /i not "%~1"=="banco" goto ligar
echo.
echo Recriando o banco de dados com os dados de exemplo...
node src\criar-banco.js
if errorlevel 1 goto falhou

:ligar
echo.
echo Ligando o Patinhas Club. O navegador abre sozinho quando o site estiver pronto.
echo Para desligar: feche esta janela ou aperte Ctrl+C.
echo.
node src\servidor.js --abrir
if not defined SEM_PAUSA pause
exit /b 0

:falhou
echo.
echo Nao deu para ligar o Patinhas Club. Leia a mensagem acima:
echo se for falta de internet, conecte e abra o iniciar.bat de novo.
if not defined SEM_PAUSA pause
exit /b 1

rem ============================================================================
:node_do_computador_serve
rem O banco embutido usa o SQLite que vem no Node.js 22.13 ou mais novo.
where node > nul 2> nul
if errorlevel 1 exit /b 1
findstr /r /i /c:"^ *BANCO *= *mysql" "%RAIZ%Servidor\.env" > nul 2> nul
if not errorlevel 1 exit /b 0
node -e "process.exit(typeof require('node:sqlite').DatabaseSync.prototype.function === 'function' ? 0 : 1)" > nul 2> nul
exit /b %errorlevel%

rem ============================================================================
:baixar_node
echo.
echo Este computador nao tem o Node.js 22 ou mais novo. Baixando uma copia
echo portatil so para esta pasta - cerca de 30 MB, so na primeira vez.
echo Nada e instalado no Windows: para remover, basta apagar a pasta .node
echo.
set "ARQ=x64"
if /i "%PROCESSOR_ARCHITECTURE%"=="ARM64" set "ARQ=arm64"
if /i "%PROCESSOR_ARCHITECTURE%"=="x86" if not defined PROCESSOR_ARCHITEW6432 set "ARQ=x86"
set "SITE=https://nodejs.org/dist/latest-v22.x"
set "BAIXANDO=%RAIZ%.node\baixando"
if exist "%BAIXANDO%" rd /s /q "%BAIXANDO%"
mkdir "%BAIXANDO%"
if errorlevel 1 exit /b 1
call :baixar "%SITE%/SHASUMS256.txt" "%BAIXANDO%\SHASUMS256.txt"
if errorlevel 1 exit /b 1
set "ZIP="
set "OFICIAL="
for /f "tokens=1,2" %%a in ('findstr /c:"-win-%ARQ%.zip" "%BAIXANDO%\SHASUMS256.txt"') do (set "OFICIAL=%%a" & set "ZIP=%%b")
if not defined ZIP (echo Nao achei o Node.js para Windows %ARQ% no nodejs.org. & exit /b 1)
call :baixar "%SITE%/%ZIP%" "%BAIXANDO%\%ZIP%"
if errorlevel 1 exit /b 1
rem Confere a impressao digital (SHA-256) com a lista oficial do nodejs.org
set "BAIXADO="
for /f "skip=1 delims=" %%h in ('certutil -hashfile "%BAIXANDO%\%ZIP%" SHA256') do if not defined BAIXADO set "BAIXADO=%%h"
if defined BAIXADO set "BAIXADO=%BAIXADO: =%"
if /i not "%BAIXADO%"=="%OFICIAL%" (echo O arquivo baixado veio diferente do oficial. Tente de novo. & exit /b 1)
echo Descompactando...
tar -xf "%BAIXANDO%\%ZIP%" -C "%BAIXANDO%" > nul 2> nul
if errorlevel 1 powershell -NoProfile -ExecutionPolicy Bypass -Command "Expand-Archive -LiteralPath '%BAIXANDO%\%ZIP%' -DestinationPath '%BAIXANDO%' -Force"
if not exist "%BAIXANDO%\%ZIP:.zip=%\node.exe" (echo Nao foi possivel descompactar o Node.js. & exit /b 1)
if exist "%PORTATIL%" rd /s /q "%PORTATIL%"
move "%BAIXANDO%\%ZIP:.zip=%" "%PORTATIL%" > nul 2> nul
if errorlevel 1 (
  rem o antivirus as vezes segura os arquivos novos por um instante
  ping -n 4 127.0.0.1 > nul
  move "%BAIXANDO%\%ZIP:.zip=%" "%PORTATIL%" > nul
)
if not exist "%PORTATIL%\node.exe" exit /b 1
rd /s /q "%BAIXANDO%"
echo Node.js portatil pronto.
exit /b 0

:baixar
rem Baixa com o curl do Windows 10/11; se nao der, tenta pelo PowerShell
curl.exe -fL --retry 2 --progress-bar -o "%~2" "%~1"
if not errorlevel 1 exit /b 0
powershell -NoProfile -ExecutionPolicy Bypass -Command "[Net.ServicePointManager]::SecurityProtocol = 'Tls12'; $ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -UseBasicParsing -Uri '%~1' -OutFile '%~2'"
if not errorlevel 1 exit /b 0
echo Nao foi possivel baixar %~1
exit /b 1
