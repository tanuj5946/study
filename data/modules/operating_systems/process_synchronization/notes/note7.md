### Producer Consumer Problem

The producer-consumer problem involves two types of processes:
- Producer, which produces data
- Consumer, which consumes data

Both share a common buffer.

Synchronization is required to ensure:
- Producer does not produce when buffer is full
- Consumer does not consume when buffer is empty

Semaphores are commonly used to solve this problem.
