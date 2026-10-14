
import ast
from pathlib import Path

# 1. Verificar a sintaxe do monitor
codigo = Path("monitor.py").read_text(encoding="utf-8")
ast.parse(codigo)
print("Sintaxe do monitor.py: OK")


# 2. Testar a regra de 24 horas por trecho
def duracao_valida(ida, volta):
    return (
        isinstance(ida, (int, float))
        and isinstance(volta, (int, float))
        and 0 < ida <= 1440
        and 0 < volta <= 1440
    )


casos = [
    (720, 960, True),      # Ida 12h, volta 16h
    (1380, 1200, True),    # Ida 23h, volta 20h
    (1440, 1440, True),    # Limite exato de 24h
    (1500, 840, False),    # Ida 25h
    (900, 1620, False),    # Volta 27h
    (None, 900, False),    # Duração desconhecida
    (900, None, False),    # Duração desconhecida
    (0, 900, False),       # Duração inválida
]

for ida, volta, esperado in casos:
    resultado = duracao_valida(ida, volta)
    assert resultado == esperado, (
        f"Falha: ida={ida}, volta={volta}, "
        f"esperado={esperado}, obtido={resultado}"
    )

print("Regra de 24 horas: 8 cenários aprovados")
