### Many-to-One Model

In the many-to-one model, multiple user threads are mapped to a single
kernel thread.

Advantages:
- Fast thread creation
- Efficient in single processor systems

Disadvantages:
- No parallel execution
- Blocking one thread blocks all threads

This model is rarely used in modern operating systems.
