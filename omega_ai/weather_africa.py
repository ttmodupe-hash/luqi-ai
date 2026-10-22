"""Legacy Omega module weather_africa has no implemented backend yet."""
__all__: list[str] = []

def __getattr__(name: str):
    if name.startswith("__"):
        raise AttributeError(name)
    raise NotImplementedError("weather_africa is unavailable: no implementation has been registered.")
