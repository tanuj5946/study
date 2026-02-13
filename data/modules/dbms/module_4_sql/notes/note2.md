### DML Commands

DML commands manipulate data inside tables.

1. INSERT  
   Adds new records.

INSERT INTO Student VALUES (101, 'Amit', 'CSE');

2. SELECT  
   Retrieves data.

SELECT * FROM Student;

3. UPDATE  
   Modifies existing data.

UPDATE Student SET Dept='IT' WHERE Roll_No=101;

4. DELETE  
   Removes records.

DELETE FROM Student WHERE Roll_No=101;

WHERE Clause

Used to filter records.

Comparison Operators:
=, >, <, >=, <=, <>, BETWEEN, LIKE

Exam Notes:
- Always remember WHERE condition.
- SELECT syntax must be precise.
