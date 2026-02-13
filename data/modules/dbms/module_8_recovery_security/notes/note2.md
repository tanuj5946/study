### Log-Based Recovery

A log file stores information about transactions.

Log record format:
<Ti, X, old_value, new_value>

Where:
Ti = Transaction ID
X = Data item

Write-Ahead Logging (WAL)

Before modifying database:
Log must be written to stable storage.

Types of Log-Based Recovery:

1. Deferred Update
   Changes written after commit.

2. Immediate Update
   Changes written before commit.

UNDO and REDO Operations:

UNDO:
Restore old value.

REDO:
Reapply new value.

Exam Notes:
- WAL principle is important.
- UNDO and REDO operations frequently asked.
