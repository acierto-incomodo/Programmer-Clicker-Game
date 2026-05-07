@echo off
powershell -ExecutionPolicy Bypass -File .\make.ps1
powershell -ExecutionPolicy Bypass -File .\BuildWin.ps1

:: Extraer versión de package.json y crear GameVersion.txt
powershell -Command "$v = (Get-Content package.json | ConvertFrom-Json).version; Set-Content GameVersion.txt $v"

:: Crear carpeta publish si no existe y limpiar si existía
if exist publish rmdir /s /q publish
mkdir publish

:: Copiar el ejecutable generado por PyInstaller (NoCompatibleToInstall.exe)
if exist dist\NoCompatibleToInstall.exe copy dist\NoCompatibleToInstall.exe publish\

:: Copiar GameVersion.txt a publish
copy GameVersion.txt publish\

:: Copiar win-unpacked como carpeta Build y crear el ZIP
if exist dist\win-unpacked (
    xcopy /E /I /Y dist\win-unpacked publish\Build
    powershell -Command "Compress-Archive -Path publish\Build\* -DestinationPath publish\Build.zip -Force"
)