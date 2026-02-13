### OS Design Approaches

Monolithic Kernel:
All OS services run in kernel space.
Advantages: High performance.
Disadvantages: Less modular, harder to maintain.

Microkernel:
Minimal services run in kernel space; others in user space.
Advantages: Better modularity and security.
Disadvantages: Performance overhead.

Layered Architecture:
OS is divided into layers, each built on top of lower layer.
Advantages: Easier debugging and maintenance.
Disadvantages: Layer communication overhead.

Hybrid Kernel:
Combination of monolithic and microkernel designs.
Used in modern operating systems.
