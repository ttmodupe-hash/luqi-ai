"""Legacy Omega module travel_africa has no implemented backend yet."""
__all__: list[str] = []

def __getattr__(name: str):
    if name.startswith("__"):
        raise AttributeError(name)
    raise NotImplementedError("travel_africa is unavailable: no implementation has been registered.")
