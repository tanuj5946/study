### Schedules and Serializability

Schedule:
Order in which operations of multiple transactions execute.

Types of Schedules:

1. Serial Schedule
   Transactions execute one after another.

2. Non-Serial Schedule
   Operations interleaved.

Serializability:
A non-serial schedule is serializable if it produces the same result
as some serial schedule.

Types of Serializability:

1. Conflict Serializability
   Based on conflicting operations.

2. View Serializability
   Based on view equivalence.

Conflict:
Two operations conflict if:
- They belong to different transactions.
- They access same data item.
- At least one is write operation.

Precedence Graph:
Used to test conflict serializability.

Exam Notes:
- Conflict serializability most important.
- Practice drawing precedence graph.
