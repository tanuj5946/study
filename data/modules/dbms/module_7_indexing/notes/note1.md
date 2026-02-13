### File Organization

File organization determines how records are stored on disk.

Types of File Organization:

1. Heap File Organization
   Records are stored in no particular order.
   Insertion is fast.
   Searching is slow.

2. Sequential File Organization
   Records stored in sorted order.
   Searching faster than heap.
   Insertion costly.

3. Hash File Organization
   Records stored using hash function.
   Provides direct access.

Comparison:

Heap:
- Fast insert
- Slow search

Sequential:
- Efficient range queries
- Slow insert

Hash:
- Very fast equality search
- Poor for range queries

Exam Notes:
- Difference between heap and sequential often asked.
