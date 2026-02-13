### Normal Forms

Normalization is the process of organizing data to reduce redundancy.

First Normal Form (1NF)

A relation is in 1NF if:
- All attributes are atomic.
- No repeating groups.

Second Normal Form (2NF)

A relation is in 2NF if:
- It is in 1NF.
- No partial dependency exists.

Partial Dependency:
When non-prime attribute depends on part of composite key.

Third Normal Form (3NF)

A relation is in 3NF if:
- It is in 2NF.
- No transitive dependency exists.

Transitive Dependency:
A → B and B → C implies A → C.

Boyce-Codd Normal Form (BCNF)

A relation is in BCNF if:
For every functional dependency X → Y,
X must be a super key.

Exam Notes:
- 2NF removes partial dependency.
- 3NF removes transitive dependency.
- BCNF is stricter than 3NF.
