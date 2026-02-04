### User Threads vs Kernel Threads

Threads can be classified into user-level threads and kernel-level
threads based on their management.

User Threads:
- Managed by user-level libraries
- Kernel is unaware of these threads
- Faster to create and manage
- Blocking one thread may block entire process

Kernel Threads:
- Managed directly by the operating system
- Kernel is aware of each thread
- Better concurrency
- Higher overhead compared to user threads
