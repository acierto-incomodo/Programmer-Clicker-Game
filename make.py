import os
import shutil
import subprocess
import json
import glob
import sys
from pathlib import Path

def run_command(command, description):
    """Ejecuta un comando de consola y maneja errores básicos."""
    print(f"==> {description}...")
    try:
        # Usamos shell=True para compatibilidad con comandos de npm y python -m en Windows
        result = subprocess.run(command, shell=True, check=True)
        return result.returncode == 0
    except subprocess.CalledProcessError as e:
        print(f"Error al ejecutar '{description}': {e}")
        return False

def cleanup():
    """Limpia archivos y carpetas temporales de construcciones previas."""
    print("==> Limpiando entorno...")
    
    folders_to_delete = [
        "build", "downloads", "game", "theshooterlauncher_deb", 
        "snap", "WinDownloads", "publish", "dist"
    ]
    
    files_to_delete = [
        "main.spec", "theshooterlauncher_deb.deb", "launcher_win.py", 
        "launcher_win.spec", "installer_updater.spec", "version_win_launcher.txt", 
        "StormStore-Setup.spec", "GameVersion.txt"
    ]

    for folder in folders_to_delete:
        if os.path.exists(folder):
            print(f"  Eliminando carpeta: {folder}")
            shutil.rmtree(folder, ignore_errors=True)

    for pattern in files_to_delete + ["*.spec"]:
        for file_path in glob.glob(pattern):
            print(f"  Eliminando archivo: {file_path}")
            try:
                os.remove(file_path)
            except OSError:
                pass

def main():
    # 1. Limpieza total (Equivalente a Clear.ps1 y el inicio de make.ps1)
    cleanup()

    # 2. Dependencias y Build de la logo (Equivalente a make.ps1)
    if not run_command("npm i", "Instalando dependencias de NPM"):
        sys.exit(1)
    
    if not run_command("npm run build", "Compilando aplicación (Electron)"):
        sys.exit(1)

    # 3. Build del ejecutable NoCompatibleToInstall (Equivalente a BuildWin.ps1)
    # Nota: Mantenemos los flags originales.
    pyinstaller_cmd = (
        'python -m PyInstaller --onefile --windowed --noconsole '
        '--icon=assets/logo.ico --add-data "assets/logo.png;." '
        '--add-data "assets/logo.ico;." --strip NoCompatibleToInstall.py'
    )
    if not run_command(pyinstaller_cmd, "Generando NoCompatibleToInstall.exe"):
        sys.exit(1)

    # 4. Extraer versión de package.json (Equivalente a la lógica de make.bat)
    version = "0.0.0"
    if os.path.exists("package.json"):
        try:
            with open("package.json", "r") as f:
                pkg_data = json.load(f)
                version = pkg_data.get("version", "0.0.0")
            
            with open("GameVersion.txt", "w") as f:
                f.write(version)
            print(f"==> Versión detectada y guardada: {version}")
        except Exception as e:
            print(f"Error al procesar package.json: {e}")

    # 5. Organizar carpeta de publicación (Equivalente a make.bat)
    publish_dir = Path("publish")
    publish_dir.mkdir(exist_ok=True)

    # Copiar NoCompatibleToInstall.exe
    src_exe = Path("dist/NoCompatibleToInstall.exe")
    if src_exe.exists():
        shutil.copy(src_exe, publish_dir / "NoCompatibleToInstall.exe")
    
    # Copiar GameVersion.txt
    if os.path.exists("GameVersion.txt"):
        shutil.copy("GameVersion.txt", publish_dir / "GameVersion.txt")

    # 6. Copiar build de Windows y comprimir (Equivalente a make.bat)
    win_unpacked = Path("dist/win-unpacked")
    if win_unpacked.exists():
        build_dest = publish_dir / "Build"
        print("==> Organizando carpeta Build para empaquetado...")
        shutil.copytree(win_unpacked, build_dest)
        
        print("==> Creando Build.zip...")
        # make_archive crea el zip de la carpeta 'Build' dentro de 'publish'
        # El formato será publish/Build.zip
        shutil.make_archive(str(publish_dir / "Build"), 'zip', build_dest)
        print("==> Build.zip creado con éxito.")
    else:
        print("⚠️ No se encontró la carpeta 'dist/win-unpacked'. ¿Falló el build de electron?")

    print("\n✅ Proceso de construcción completado exitosamente.")

if __name__ == "__main__":
    main()