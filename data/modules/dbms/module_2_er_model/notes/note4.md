### ER to Relational Mapping

Mapping Strong Entity

Each strong entity becomes a relation (table).

Primary key of entity becomes primary key of table.

Mapping Weak Entity

Weak entity becomes a separate table.

Primary key = Partial key + Primary key of strong entity.

Mapping 1:1 Relationship

Add foreign key in either table.

Mapping 1:N Relationship

Add foreign key on N-side.

Mapping M:N Relationship

Create a new relation.
Include primary keys of both entities as foreign keys.

Mapping Multi-Valued Attribute

Create separate relation for multivalued attribute.

Exam Notes:
- M:N always creates new table.
- 1:N foreign key on N side.
- Weak entity includes strong entity key.
