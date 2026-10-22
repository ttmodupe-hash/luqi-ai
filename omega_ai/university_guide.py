"""Legacy Omega module university_guide has no implemented backend yet."""
__all__: list[str] = []

def __getattr__(name: str):
    if name.startswith("__"):
        raise AttributeError(name)
    raise NotImplementedError("university_guide is unavailable: no implementation has been registered.")
