"""Physics Simulator - Simple physics simulation for LUQI AI v29.1.0"""
from typing import List, Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class Vector3D:
    x: float = 0.0
    y: float = 0.0
    z: float = 0.0

    def __add__(self, other):
        return Vector3D(self.x + other.x, self.y + other.y, self.z + other.z)

    def __mul__(self, scalar: float):
        return Vector3D(self.x * scalar, self.y * scalar, self.z * scalar)


@dataclass
class Body:
    id: str
    mass: float
    position: Vector3D
    velocity: Vector3D
    acceleration: Vector3D = Vector3D()
    radius: float = 1.0
    fixed: bool = False


class PhysicsSimulator:
    """Simple physics engine for simulations."""

    def __init__(self, gravity: Vector3D = None, dt: float = 0.016):
        self.bodies: Dict[str, Body] = {}
        self.gravity = gravity or Vector3D(0, -9.81, 0)
        self.dt = dt
        self.time = 0.0

    def add_body(self, body: Body):
        """Add a body to the simulation."""
        self.bodies[body.id] = body

    def remove_body(self, body_id: str):
        """Remove a body from the simulation."""
        self.bodies.pop(body_id, None)

    def step(self):
        """Advance simulation by one time step."""
        for body in self.bodies.values():
            if body.fixed:
                continue
            
            # Apply gravity
            body.acceleration = self.gravity
            
            # Update velocity
            body.velocity = body.velocity + body.acceleration * self.dt
            
            # Update position
            body.position = body.position + body.velocity * self.dt
        
        self.time += self.dt

    def get_state(self) -> Dict[str, Any]:
        """Get current simulation state."""
        return {
            "time": self.time,
            "bodies": [
                {
                    "id": b.id,
                    "mass": b.mass,
                    "position": {"x": b.position.x, "y": b.position.y, "z": b.position.z},
                    "velocity": {"x": b.velocity.x, "y": b.velocity.y, "z": b.velocity.z},
                }
                for b in self.bodies.values()
            ],
        }

    def reset(self):
        """Reset simulation."""
        self.bodies.clear()
        self.time = 0.0


# Global simulator instance
simulator = PhysicsSimulator()
