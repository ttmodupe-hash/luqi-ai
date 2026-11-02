"""Compatibility alias for canonical business_registration Python module."""
from importlib import import_module as _import_module

_TARGET = "business_registration"

def __getattr__(name: str):
    impl = _import_module(_TARGET)
    if name == "__all__":
        return getattr(impl, "__all__", [n for n in vars(impl) if not n.startswith("_")])
    return getattr(impl, name)

def __dir__() -> list[str]:
    return sorted(set(globals()) | set(dir(_import_module(_TARGET))))
