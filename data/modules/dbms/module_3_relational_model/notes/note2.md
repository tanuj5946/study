### Integrity Constraints

Integrity constraints ensure accuracy and consistency of data.

Types of Constraints:

1. Domain Constraint  
   Attribute must take values from defined domain.

2. Entity Integrity Constraint  
   Primary key cannot be NULL.

3. Referential Integrity Constraint  
   Foreign key must match primary key value in referenced relation.

Example:

Student(Roll_No, Name, Dept_ID)
Department(Dept_ID, Dept_Name)

Dept_ID in Student must exist in Department table.

Importance of Integrity Constraints:

- Prevent invalid data entry
- Maintain consistency
- Enforce business rules

Exam Notes:
- Referential integrity frequently asked.
- Know difference between entity and referential integrity.
