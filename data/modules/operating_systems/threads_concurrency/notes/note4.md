### One-to-One Model

In the one-to-one model, each user thread is mapped to a separate
kernel thread.

Advantages:
- True parallelism on multiprocessor systems
- Blocking one thread does not block others

Disadvantages:
- Creating kernel threads is costly
- Limited number of threads supported

Example:
Windows and Linux use the one-to-one model.
