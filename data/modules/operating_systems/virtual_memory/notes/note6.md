### Clock Page Replacement

The clock algorithm is an approximation of LRU.

Pages are arranged in a circular queue.
Each page has a reference bit.

If the reference bit is 0, the page is replaced.
If it is 1, the bit is reset and the pointer moves forward.

Clock algorithm balances efficiency and performance.
