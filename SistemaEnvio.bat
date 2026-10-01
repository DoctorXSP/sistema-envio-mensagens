@echo off

:: Primeira janela - Backend
start /min cmd /c "cd /d C:\Users\Lenovo\Desktop\React\wacursos\backend && npm run start"

:: Pequeno atraso para garantir que a primeira janela inicie antes da segunda
timeout /t 2 >nul

:: Segunda janela - Frontend (ou outro projeto)
start /min cmd /c "cd /d C:\Users\Lenovo\Desktop\React\wacursos && npm run start"

