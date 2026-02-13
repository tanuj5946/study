### Aggregate Functions and GROUP BY

Aggregate functions perform calculations on multiple rows.

Common Aggregate Functions:
- COUNT()
- SUM()
- AVG()
- MAX()
- MIN()

Example:
SELECT COUNT(*) FROM Student;

GROUP BY

Groups rows based on column values.

Example:
SELECT Dept, COUNT(*)
FROM Student
GROUP BY Dept;

HAVING Clause

Used with GROUP BY to filter grouped results.

Example:
SELECT Dept
FROM Student
GROUP BY Dept
HAVING COUNT(*) > 5;

Views

A view is a virtual table based on SQL query.

CREATE VIEW CSE_Students AS
SELECT * FROM Student WHERE Dept='CSE';

Exam Notes:
- HAVING used after GROUP BY.
- Difference between WHERE and HAVING is important.
