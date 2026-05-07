import tkinter as tk
from tkinter import ttk
import sys

def is_dark_mode():
    try:
        if sys.platform == "win32":
            import winreg
            registry = winreg.ConnectRegistry(None, winreg.HKEY_CURRENT_USER)
            key = winreg.OpenKey(registry, r'SOFTWARE\Microsoft\Windows\CurrentVersion\Themes\Personalize')
            value, _ = winreg.QueryValueEx(key, "AppsUseLightTheme")
            return value == 0
    except:
        pass
    return False

# Detectar modo
dark_mode = is_dark_mode()

# Colores
if dark_mode:
    bg_color = "#1e1e1e"
    fg_color = "#ffffff"
    button_bg = "#2d2d2d"
else:
    bg_color = "#f0f0f0"
    fg_color = "#000000"
    button_bg = "#e0e0e0"

# Ventana principal
root = tk.Tk()
root.title("Error de compatibilidad")
root.geometry("420x160")
root.resizable(False, False)  # No se puede maximizar

# Quitar botón de maximizar (solo Windows)
root.attributes("-toolwindow", True)

# Fondo
root.configure(bg=bg_color)

# Contenedor
frame = tk.Frame(root, bg=bg_color)
frame.pack(expand=True, fill="both", padx=20, pady=20)

# Texto
label = tk.Label(
    frame,
    text="Instalación no compatible,\npor favor actualiza StormStore\na una versión compatible.",
    bg=bg_color,
    fg=fg_color,
    font=("Segoe UI", 11),
    justify="center"
)
label.pack(pady=(0, 20))

# Botón
def cerrar():
    root.destroy()

button = tk.Button(
    frame,
    text="Aceptar",
    command=cerrar,
    bg=button_bg,
    fg=fg_color,
    activebackground=button_bg,
    relief="flat",
    padx=15,
    pady=5
)
button.pack()

# Centrar ventana
root.eval('tk::PlaceWindow . center')

root.mainloop()