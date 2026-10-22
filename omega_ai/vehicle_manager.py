"""Legacy Omega module vehicle_manager has no implemented backend yet."""
__all__: list[str] = []

def __getattr__(name: str):
    if name.startswith("__"):
        raise AttributeError(name)
    raise NotImplementedError("vehicle_manager is unavailable: no implementation has been registered.")
