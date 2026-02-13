### Locking and Two-Phase Locking (2PL)

Locks control concurrent access to data.

Types of Locks:

1. Shared Lock (S)
   Allows read access.

2. Exclusive Lock (X)
   Allows read and write access.

Two-Phase Locking Protocol (2PL)

Phase 1: Growing Phase
- Transaction acquires locks.
- Cannot release locks.

Phase 2: Shrinking Phase
- Transaction releases locks.
- Cannot acquire new locks.

Strict 2PL:
Locks are held until transaction commits.

Advantages:
- Ensures conflict serializability.

Disadvantages:
- May cause deadlock.

Exam Notes:
- 2PL guarantees serializability.
- Strict 2PL ensures recoverability.
