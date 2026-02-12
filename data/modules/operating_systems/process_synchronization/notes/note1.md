### Critical Section Problem

A critical section is a part of a program where shared resources
are accessed.

When multiple processes or threads access shared data concurrently,
it may lead to inconsistent results.

The critical section problem requires designing a protocol such that:
- Only one process executes in the critical section at a time
- No deadlock occurs
- No starvation occurs

Proper handling of critical sections is essential for data consistency.
