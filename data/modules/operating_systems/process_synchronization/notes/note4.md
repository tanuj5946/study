### Mutex

A mutex is a locking mechanism used to protect shared resources.

A process must acquire the mutex before entering the critical section
and release it after leaving.

Characteristics of mutex:
- Only one process can hold the mutex at a time
- Causes blocking of other processes

Mutex is simple and efficient for mutual exclusion.
