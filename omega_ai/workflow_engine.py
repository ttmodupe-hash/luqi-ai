"""Legacy Omega module workflow_engine has no implemented backend yet."""
__all__: list[str] = []

def __getattr__(name: str):
    if name.startswith("__"):
        raise AttributeError(name)
    raise NotImplementedError("workflow_engine is unavailable: no implementation has been registered.")
