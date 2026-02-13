### Deadlocks in Transactions

Deadlock occurs when transactions wait indefinitely
for each other’s locks.

Example:
T1 locks A, waits for B.
T2 locks B, waits for A.

Deadlock Handling:

1. Prevention
   Eliminate one necessary condition.

2. Detection
   Use wait-for graph.

3. Recovery
   Abort one transaction.

Cascading Rollback

Occurs when failure of one transaction causes others to roll back.

Recoverable Schedule

A schedule where committed transactions
depend only on committed transactions.

Exam Notes:
- Wait-for graph used in detection.
- Deadlock example frequently asked.
