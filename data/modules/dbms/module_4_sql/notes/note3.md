### Joins and Subqueries

Joins combine data from multiple tables.

Types of Joins:

1. INNER JOIN  
   Returns matching records from both tables.

2. LEFT JOIN  
   Returns all records from left table.

3. RIGHT JOIN  
   Returns all records from right table.

4. FULL JOIN  
   Returns all records when there is match in either table.

Example:
SELECT S.Name, D.Dept_Name
FROM Student S
INNER JOIN Department D
ON S.Dept_ID = D.Dept_ID;

Subqueries

A subquery is a query inside another query.

Example:
SELECT Name
FROM Student
WHERE Roll_No IN (
    SELECT Roll_No FROM Result WHERE Marks > 80
);

Exam Notes:
- Join conditions are important.
- Subqueries often used with IN, EXISTS.
