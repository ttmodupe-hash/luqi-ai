#!/usr/bin/env python3
"""
Luqi AI Sandbox GUI v25.1.0 "LUQI"
=====================================
A desktop sandbox environment for testing and running Luqi AI components
with a graphical interface. Includes code editor, console, file browser,
and integrated testing tools.

Usage:
    python luqi_sandbox_gui.py
"""

import tkinter as tk
from tkinter import ttk, scrolledtext, filedialog, messagebox, simpledialog
import io
import json
import os
import subprocess
import sys
import threading
import traceback
from datetime import datetime
from pathlib import Path
from typing import Any, Dict, List, Optional

# ═══════════════════════════════════════════════════════════════════════════════
#  CONFIGURATION
# ═══════════════════════════════════════════════════════════════════════════════

PROJECT_ROOT = Path(__file__).parent.resolve()
SANDBOX_DIR = PROJECT_ROOT / "sandbox"
SCRIPTS_DIR = SANDBOX_DIR / "scripts"
OUTPUT_DIR = SANDBOX_DIR / "output"
DATA_DIR = SANDBOX_DIR / "data"

for d in (SANDBOX_DIR, SCRIPTS_DIR, OUTPUT_DIR, DATA_DIR):
    d.mkdir(parents=True, exist_ok=True)

# ═══════════════════════════════════════════════════════════════════════════════
#  SANDBOX ENGINE
# ═══════════════════════════════════════════════════════════════════════════════

class SandboxEngine:
    """Code execution engine with safety controls."""

    SAFE_BUILTINS = {
        "len": len, "range": range, "enumerate": enumerate, "zip": zip,
        "map": map, "filter": filter, "sum": sum, "min": min, "max": max,
        "abs": abs, "round": round, "pow": pow, "divmod": divmod,
        "str": str, "int": int, "float": float, "bool": bool,
        "list": list, "dict": dict, "set": set, "tuple": tuple,
        "print": print, "sorted": sorted, "reversed": reversed,
        "isinstance": isinstance, "hasattr": hasattr, "getattr": getattr,
        "Exception": Exception, "TypeError": TypeError, "ValueError": ValueError,
        "json": json, "math": __import__("math"), "datetime": datetime,
        "time": __import__("time"),
    }

    def __init__(self, output_callback=None):
        self.output_callback = output_callback
        self.globals = {"__builtins__": self.SAFE_BUILTINS.copy()}

    def execute(self, code: str) -> str:
        old_stdout = sys.stdout
        sys.stdout = io.StringIO()
        try:
            exec(code, self.globals)
            output = sys.stdout.getvalue()
            return output if output else "Code executed successfully."
        except Exception as e:
            return f"Error: {type(e).__name__}: {str(e)}\n{traceback.format_exc()}"
        finally:
            sys.stdout = old_stdout

    def reset(self):
        self.globals = {"__builtins__": self.SAFE_BUILTINS.copy()}


# ═══════════════════════════════════════════════════════════════════════════════
#  MAIN GUI APPLICATION
# ═══════════════════════════════════════════════════════════════════════════════

class SandboxGUI:
    """Luqi AI Sandbox GUI Application."""

    def __init__(self, root: tk.Tk):
        self.root = root
        self.root.title("Luqi AI Sandbox v25.1.0")
        self.root.geometry("1200x800")
        self.root.minsize(800, 600)

        self.engine = SandboxEngine()
        self.current_file: Optional[Path] = None
        self.setup_styles()
        self.build_ui()
        self.setup_menu()
        self.setup_shortcuts()

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use("clam")
        style.configure("TFrame", background="#1e1e1e")
        style.configure("TLabel", background="#1e1e1e", foreground="#d4d4d4")
        style.configure("TButton", background="#0e639c", foreground="white")
        style.configure("TNotebook", background="#1e1e1e", tabmargins=[2, 5, 2, 0])
        style.configure("TNotebook.Tab", background="#2d2d2d", foreground="#d4d4d4",
                       padding=[10, 2])
        style.map("TNotebook.Tab", background=[("selected", "#1e1e1e")],
                 foreground=[("selected", "white")])

    def build_ui(self):
        # Main container
        main_paned = ttk.PanedWindow(self.root, orient=tk.HORIZONTAL)
        main_paned.pack(fill=tk.BOTH, expand=True)

        # Left panel: File browser
        left_frame = ttk.Frame(main_paned)
        main_paned.add(left_frame, weight=1)
        self.build_file_browser(left_frame)

        # Center panel: Editor + Console
        center_paned = ttk.PanedWindow(main_paned, orient=tk.VERTICAL)
        main_paned.add(center_paned, weight=4)

        # Editor
        editor_frame = ttk.Frame(center_paned)
        center_paned.add(editor_frame, weight=3)
        self.build_editor(editor_frame)

        # Console
        console_frame = ttk.Frame(center_paned)
        center_paned.add(console_frame, weight=1)
        self.build_console(console_frame)

        # Right panel: Tools
        right_frame = ttk.Frame(main_paned)
        main_paned.add(right_frame, weight=1)
        self.build_tools(right_frame)

        # Status bar
        self.status_bar = ttk.Label(self.root, text="Ready", relief=tk.SUNKEN, anchor=tk.W)
        self.status_bar.pack(side=tk.BOTTOM, fill=tk.X)

    def build_file_browser(self, parent):
        ttk.Label(parent, text="File Browser", font=("Consolas", 10, "bold")).pack(pady=5)

        toolbar = ttk.Frame(parent)
        toolbar.pack(fill=tk.X, padx=5)
        ttk.Button(toolbar, text="New", command=self.new_file).pack(side=tk.LEFT, padx=2)
        ttk.Button(toolbar, text="Refresh", command=self.refresh_files).pack(side=tk.LEFT, padx=2)

        self.file_tree = ttk.Treeview(parent, show="tree")
        self.file_tree.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)
        self.file_tree.bind("<<TreeviewSelect>>", self.on_file_select)
        self.refresh_files()

    def build_editor(self, parent):
        ttk.Label(parent, text="Code Editor", font=("Consolas", 10, "bold")).pack(pady=5)

        self.editor = scrolledtext.ScrolledText(parent, wrap=tk.NONE,
                                                font=("Consolas", 11),
                                                bg="#1e1e1e", fg="#d4d4d4",
                                                insertbackground="white",
                                                selectbackground="#264f78",
                                                padx=10, pady=10)
        self.editor.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        editor_toolbar = ttk.Frame(parent)
        editor_toolbar.pack(fill=tk.X, padx=5, pady=2)
        ttk.Button(editor_toolbar, text="Run (F5)", command=self.run_code).pack(side=tk.LEFT, padx=2)
        ttk.Button(editor_toolbar, text="Save (Ctrl+S)", command=self.save_file).pack(side=tk.LEFT, padx=2)
        ttk.Button(editor_toolbar, text="Clear", command=self.clear_editor).pack(side=tk.LEFT, padx=2)

    def build_console(self, parent):
        ttk.Label(parent, text="Console Output", font=("Consolas", 10, "bold")).pack(pady=5)

        self.console = scrolledtext.ScrolledText(parent, wrap=tk.WORD,
                                                 font=("Consolas", 10),
                                                 bg="#1e1e1e", fg="#cccccc",
                                                 insertbackground="white",
                                                 padx=10, pady=10,
                                                 state=tk.DISABLED)
        self.console.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        console_toolbar = ttk.Frame(parent)
        console_toolbar.pack(fill=tk.X, padx=5, pady=2)
        ttk.Button(console_toolbar, text="Clear Console", command=self.clear_console).pack(side=tk.LEFT, padx=2)
        ttk.Button(console_toolbar, text="Copy Output", command=self.copy_output).pack(side=tk.LEFT, padx=2)

    def build_tools(self, parent):
        notebook = ttk.Notebook(parent)
        notebook.pack(fill=tk.BOTH, expand=True, padx=5, pady=5)

        # Tools tab
        tools_frame = ttk.Frame(notebook)
        notebook.add(tools_frame, text="Tools")
        self.build_tools_tab(tools_frame)

        # AI tab
        ai_frame = ttk.Frame(notebook)
        notebook.add(ai_frame, text="AI")
        self.build_ai_tab(ai_frame)

        # Help tab
        help_frame = ttk.Frame(notebook)
        notebook.add(help_frame, text="Help")
        self.build_help_tab(help_frame)

    def build_tools_tab(self, parent):
        ttk.Label(parent, text="Quick Tools", font=("Consolas", 10, "bold")).pack(pady=10)

        tools = [
            ("Run Tests", self.run_tests),
            ("Format JSON", self.format_json),
            ("System Info", self.show_sys_info),
            ("Reset Engine", self.reset_engine),
        ]
        for label, cmd in tools:
            ttk.Button(parent, text=label, command=cmd).pack(fill=tk.X, padx=10, pady=2)

    def build_ai_tab(self, parent):
        ttk.Label(parent, text="AI Chat", font=("Consolas", 10, "bold")).pack(pady=10)

        self.ai_chat_history = scrolledtext.ScrolledText(parent, wrap=tk.WORD,
                                                          font=("Consolas", 9),
                                                          bg="#1e1e1e", fg="#d4d4d4",
                                                          height=10,
                                                          state=tk.DISABLED)
        self.ai_chat_history.pack(fill=tk.BOTH, expand=True, padx=10, pady=5)

        input_frame = ttk.Frame(parent)
        input_frame.pack(fill=tk.X, padx=10, pady=5)
        self.ai_input = ttk.Entry(input_frame)
        self.ai_input.pack(side=tk.LEFT, fill=tk.X, expand=True)
        ttk.Button(input_frame, text="Send", command=self.send_ai_message).pack(side=tk.RIGHT, padx=5)

    def build_help_tab(self, parent):
        help_text = """Luqi AI Sandbox Help

Shortcuts:
  F5         - Run code
  Ctrl+S     - Save file
  Ctrl+O     - Open file
  Ctrl+N     - New file
  Ctrl+Enter - Run selected code

Sandbox Restrictions:
  - No file system access outside sandbox/
  - No network access (except whitelisted)
  - No system commands
  - Limited Python builtins

Tips:
  - Use print() for output
  - Import json, math, datetime freely
  - Use the AI chat for help
"""
        text = scrolledtext.ScrolledText(parent, wrap=tk.WORD,
                                          font=("Consolas", 9),
                                          bg="#1e1e1e", fg="#d4d4d4",
                                          state=tk.DISABLED)
        text.pack(fill=tk.BOTH, expand=True, padx=10, pady=10)
        text.configure(state=tk.NORMAL)
        text.insert(tk.END, help_text)
        text.configure(state=tk.DISABLED)

    # ── Menu ──────────────────────────────────────────────────────────

    def setup_menu(self):
        menubar = tk.Menu(self.root)
        self.root.config(menu=menubar)

        file_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="File", menu=file_menu)
        file_menu.add_command(label="New (Ctrl+N)", command=self.new_file)
        file_menu.add_command(label="Open (Ctrl+O)", command=self.open_file)
        file_menu.add_command(label="Save (Ctrl+S)", command=self.save_file)
        file_menu.add_separator()
        file_menu.add_command(label="Exit", command=self.root.quit)

        run_menu = tk.Menu(menubar, tearoff=0)
        menubar.add_cascade(label="Run", menu=run_menu)
        run_menu.add_command(label="Run Code (F5)", command=self.run_code)
        run_menu.add_command(label="Reset Engine", command=self.reset_engine)

    def setup_shortcuts(self):
        self.root.bind("<F5>", lambda e: self.run_code())
        self.root.bind("<Control-s>", lambda e: self.save_file())
        self.root.bind("<Control-o>", lambda e: self.open_file())
        self.root.bind("<Control-n>", lambda e: self.new_file())
        self.root.bind("<Control-Return>", lambda e: self.run_code())

    # ── File Operations ──────────────────────────────────────────────

    def refresh_files(self):
        self.file_tree.delete(*self.file_tree.get_children())
        self._populate_tree("", SANDBOX_DIR)

    def _populate_tree(self, parent, path):
        try:
            for item in sorted(path.iterdir(), key=lambda x: (not x.is_dir(), x.name)):
                node = self.file_tree.insert(parent, tk.END, text=item.name, open=False)
                if item.is_dir():
                    self._populate_tree(node, item)
        except Exception:
            pass

    def on_file_select(self, event):
        selection = self.file_tree.selection()
        if not selection:
            return
        item = selection[0]
        # Build path from tree
        path = self._get_item_path(item)
        if path and path.is_file():
            try:
                with open(path, "r") as f:
                    content = f.read()
                self.editor.delete("1.0", tk.END)
                self.editor.insert("1.0", content)
                self.current_file = path
                self.update_status(f"Opened: {path.name}")
            except Exception as e:
                messagebox.showerror("Error", f"Could not open file: {e}")

    def _get_item_path(self, item) -> Optional[Path]:
        # Simplified path reconstruction
        parts = []
        while item:
            parts.append(self.file_tree.item(item, "text"))
            item = self.file_tree.parent(item)
        if parts:
            return SANDBOX_DIR / "/".join(reversed(parts))
        return None

    def new_file(self):
        self.editor.delete("1.0", tk.END)
        self.current_file = None
        self.update_status("New file")

    def open_file(self):
        path = filedialog.askopenfilename(initialdir=str(SANDBOX_DIR),
                                          filetypes=[("Python", "*.py"), ("All", "*.*")])
        if path:
            with open(path, "r") as f:
                self.editor.delete("1.0", tk.END)
                self.editor.insert("1.0", f.read())
            self.current_file = Path(path)
            self.update_status(f"Opened: {self.current_file.name}")

    def save_file(self):
        if self.current_file:
            path = self.current_file
        else:
            path = filedialog.asksaveasfilename(initialdir=str(SCRIPTS_DIR),
                                                defaultextension=".py",
                                                filetypes=[("Python", "*.py"), ("All", "*.*")])
        if path:
            with open(path, "w") as f:
                f.write(self.editor.get("1.0", tk.END))
            self.current_file = Path(path)
            self.update_status(f"Saved: {self.current_file.name}")
            self.refresh_files()

    def clear_editor(self):
        self.editor.delete("1.0", tk.END)

    # ── Code Execution ──────────────────────────────────────────────

    def run_code(self):
        code = self.editor.get("1.0", tk.END).strip()
        if not code:
            return
        self.log_console("="*50 + "\nRunning...\n" + "="*50 + "\n")
        threading.Thread(target=self._execute_async, args=(code,), daemon=True).start()

    def _execute_async(self, code: str):
        result = self.engine.execute(code)
        self.root.after(0, lambda: self.log_console(result + "\n"))

    def log_console(self, text: str):
        self.console.configure(state=tk.NORMAL)
        self.console.insert(tk.END, text)
        self.console.see(tk.END)
        self.console.configure(state=tk.DISABLED)

    def clear_console(self):
        self.console.configure(state=tk.NORMAL)
        self.console.delete("1.0", tk.END)
        self.console.configure(state=tk.DISABLED)

    def copy_output(self):
        self.console.clipboard_clear()
        self.console.clipboard_append(self.console.get("1.0", tk.END))
        self.update_status("Output copied to clipboard")

    def reset_engine(self):
        self.engine.reset()
        self.update_status("Sandbox engine reset")

    # ── Tools ────────────────────────────────────────────────────────

    def run_tests(self):
        self.log_console("Running Luqi AI tests...\n")
        # Run quick self-test
        try:
            from web_core.tests.test_system import TestSystemAgent
            import unittest
            loader = unittest.TestLoader()
            suite = loader.loadTestsFromTestCase(TestSystemAgent)
            runner = unittest.TextTestRunner(verbosity=2, stream=io.StringIO())
            result = runner.run(suite)
            output = runner.stream.getvalue()
            self.log_console(output + "\n")
        except Exception as e:
            self.log_console(f"Test error: {e}\n")

    def format_json(self):
        try:
            text = self.editor.get(tk.SEL_FIRST, tk.SEL_LAST)
            parsed = json.loads(text)
            formatted = json.dumps(parsed, indent=2)
            self.editor.delete(tk.SEL_FIRST, tk.SEL_LAST)
            self.editor.insert(tk.INSERT, formatted)
        except Exception:
            messagebox.showerror("Error", "Select valid JSON text first")

    def show_sys_info(self):
        info = f"""System Information:
Platform: {sys.platform}
Python: {sys.version}
CWD: {os.getcwd()}
Time: {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
"""
        self.log_console(info + "\n")

    # ── AI Chat ──────────────────────────────────────────────────────

    def send_ai_message(self):
        message = self.ai_input.get().strip()
        if not message:
            return
        self.ai_input.delete(0, tk.END)
        self._append_chat(f"You: {message}\n")
        threading.Thread(target=self._ai_response, args=(message,), daemon=True).start()

    def _ai_response(self, message: str):
        try:
            from backend.luqi_agent import agent_chat
            result = agent_chat(message)
            response = result.get("message", "No response")
        except Exception as e:
            response = f"AI unavailable: {e}"
        self.root.after(0, lambda: self._append_chat(f"Luqi: {response}\n\n"))

    def _append_chat(self, text: str):
        self.ai_chat_history.configure(state=tk.NORMAL)
        self.ai_chat_history.insert(tk.END, text)
        self.ai_chat_history.see(tk.END)
        self.ai_chat_history.configure(state=tk.DISABLED)

    # ── Status ──────────────────────────────────────────────────────

    def update_status(self, text: str):
        self.status_bar.configure(text=text)


# ═══════════════════════════════════════════════════════════════════════════════
#  ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    root = tk.Tk()
    app = SandboxGUI(root)
    root.mainloop()


if __name__ == "__main__":
    main()
