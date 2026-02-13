### Transaction Concept

A Transaction is a logical unit of work that performs a sequence of
database operations.

Example:
Bank Transfer:
1. Debit from Account A
2. Credit to Account B

A transaction must complete entirely or not at all.

States of a Transaction:

1. Active
2. Partially Committed
3. Committed
4. Failed
5. Aborted

ACID Properties

1. Atomicity
   All operations must complete successfully or none.

2. Consistency
   Database must move from one valid state to another.

3. Isolation
   Concurrent transactions must not interfere.

4. Durability
   Once committed, changes are permanent.

Exam Notes:
- Define ACID clearly.
- Bank example commonly used.
