### Checkpointing

Checkpoint reduces recovery time.

At checkpoint:
- All log records flushed.
- Dirty pages written to disk.
- Checkpoint record written in log.

After crash:
Recovery starts from last checkpoint.

Shadow Paging

Shadow paging keeps two page tables:
- Current page table
- Shadow page table

Shadow table never modified.

Advantages:
- No need for log.

Disadvantages:
- High overhead.
- Fragmentation.

Exam Notes:
- Compare log-based recovery and shadow paging.
