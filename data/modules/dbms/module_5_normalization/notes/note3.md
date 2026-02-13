### Lossless Join and Dependency Preservation

Lossless Join

When decomposing a relation,
joining the decomposed relations should produce the original relation.

A decomposition is lossless if:

R1 ∩ R2 → R1 or R1 ∩ R2 → R2

Dependency Preservation

A decomposition preserves dependencies if
all functional dependencies can be checked without joining tables.

Comparison:

Lossless Join:
Ensures no data loss.

Dependency Preservation:
Ensures constraints are maintained.

Exam Notes:
- Questions often ask whether decomposition is lossless.
- Practice checking dependency preservation.
