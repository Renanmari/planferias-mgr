
import ast
from pathlib import Path

codigo = Path("monitor.py").read_text(encoding="utf-8")
ast.parse(codigo)

print("Sintaxe do monitor.py: OK")
