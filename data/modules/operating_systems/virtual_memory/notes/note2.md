### Demand Paging

Demand paging is a technique in which pages are loaded into memory
only when they are required.

If a page is not in memory and is accessed, a page fault occurs.

Steps in handling a page fault:
- Check if access is valid
- Locate page on disk
- Load page into free frame
- Update page table
- Resume process

Demand paging reduces memory usage but may increase page faults.
