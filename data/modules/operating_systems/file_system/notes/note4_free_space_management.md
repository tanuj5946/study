### Free Space Management

Free space management keeps track of unallocated disk blocks.

Techniques used:

1. Bit Map
   Each block is represented by a bit.

2. Linked List
   Free blocks are linked together.

3. Grouping
   First free block stores addresses of next free blocks.

4. Counting
   Stores starting address and count of free blocks.

Efficient free space management improves disk utilization.

---

Exam Notes:

- Bit map method is simple but requires extra space.
- Counting is efficient for contiguous free blocks.
