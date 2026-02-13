### Introduction to SQL

SQL (Structured Query Language) is a standard language used to
communicate with relational databases.

SQL is used to:
- Create databases and tables
- Insert and update data
- Retrieve data
- Delete data

Categories of SQL Commands:

1. DDL (Data Definition Language)
2. DML (Data Manipulation Language)
3. DCL (Data Control Language)
4. TCL (Transaction Control Language)

DDL Commands

1. CREATE  
   Used to create database objects.

Example:
CREATE TABLE Student (
    Roll_No INT PRIMARY KEY,
    Name VARCHAR(50),
    Dept VARCHAR(20)
);

2. ALTER  
   Used to modify table structure.

3. DROP  
   Used to delete table.

Exam Notes:
- Difference between DROP and DELETE is frequently asked.
- DDL changes structure.
