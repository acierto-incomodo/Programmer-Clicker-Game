./Clear.ps1
python -m PyInstaller --onefile --windowed --noconsole --icon=assets/app.ico --add-data "assets/app.png;." --add-data "assets/app.ico;." --strip NoCompatibleToInstall.py