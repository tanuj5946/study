### Necessary Conditions for Deadlock

A deadlock can occur only if all the following four conditions hold
simultaneously:

1. Mutual Exclusion  
   At least one resource must be held in a non-shareable mode.

2. Hold and Wait  
   A process holding at least one resource is waiting to acquire
   additional resources.

3. No Preemption  
   Resources cannot be forcibly taken away from a process.

4. Circular Wait  
   A circular chain of processes exists, where each process is waiting
   for a resource held by the next process.

If any one of these conditions is eliminated, deadlock cannot occur.
