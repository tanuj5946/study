### Functional Dependency

A Functional Dependency (FD) describes a relationship between attributes.

If X → Y, it means attribute Y is functionally dependent on attribute X.

Example:
Roll_No → Name

Here, Roll_No uniquely determines Name.

Types of Functional Dependencies:

1. Trivial Functional Dependency  
   If Y is a subset of X, then X → Y is trivial.

2. Non-Trivial Functional Dependency  
   If Y is not a subset of X.

3. Completely Non-Trivial FD  
   X and Y have no common attributes.

Armstrong’s Axioms:

1. Reflexivity  
   If Y ⊆ X, then X → Y

2. Augmentation  
   If X → Y, then XZ → YZ

3. Transitivity  
   If X → Y and Y → Z, then X → Z

Closure of Attribute:

Attribute closure is used to find all attributes determined by a set.

Exam Notes:
- Closure calculation is frequently asked.
- Armstrong’s axioms are theoretical questions.
