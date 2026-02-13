### File Allocation Methods

File allocation methods define how disk blocks are allocated to files.

Main allocation methods:

1. Contiguous Allocation
   Files occupy consecutive disk blocks.
   Advantages: Simple and fast access.
   Disadvantages: External fragmentation.

2. Linked Allocation
   Each file is a linked list of disk blocks.
   Advantages: No external fragmentation.
   Disadvantages: Slow random access.

3. Indexed Allocation
   An index block contains pointers to file blocks.
   Advantages: Supports direct access.
   Disadvantages: Extra memory for index block.

---

Exam Notes:

- Compare advantages and disadvantages.
- Indexed allocation supports random access efficiently.
