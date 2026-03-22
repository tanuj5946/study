export interface QuizQuestion {
  id: string;
  subjectId: string;
  question: string;
  options: string[];
  correctIndex: number;
}

export const quizQuestions: QuizQuestion[] = [
  // ─── DBMS ────────────────────────────────────────
  {
    id: "q-dbms-1", subjectId: "sub-dbms",
    question: "Which of the following is NOT a type of key in the relational model?",
    options: ["Super Key", "Candidate Key", "Foreign Key", "Partition Key"],
    correctIndex: 3,
  },
  {
    id: "q-dbms-2", subjectId: "sub-dbms",
    question: "A relation is in BCNF if every determinant is a:",
    options: ["Foreign key", "Candidate key", "Super key", "Primary key"],
    correctIndex: 2,
  },
  {
    id: "q-dbms-3", subjectId: "sub-dbms",
    question: "Which normal form deals with multi-valued dependencies?",
    options: ["2NF", "3NF", "BCNF", "4NF"],
    correctIndex: 3,
  },
  {
    id: "q-dbms-4", subjectId: "sub-dbms",
    question: "In an ER diagram, a weak entity is represented by:",
    options: ["Single rectangle", "Double rectangle", "Diamond", "Oval"],
    correctIndex: 1,
  },
  {
    id: "q-dbms-5", subjectId: "sub-dbms",
    question: "Which SQL clause is used to filter groups?",
    options: ["WHERE", "HAVING", "GROUP BY", "ORDER BY"],
    correctIndex: 1,
  },
  {
    id: "q-dbms-6", subjectId: "sub-dbms",
    question: "The ACID property 'Isolation' ensures that:",
    options: [
      "Transactions are completed fully or not at all",
      "Concurrent transactions do not interfere with each other",
      "Data remains consistent after a transaction",
      "Committed data is permanently stored",
    ],
    correctIndex: 1,
  },
  {
    id: "q-dbms-7", subjectId: "sub-dbms",
    question: "B+ trees are preferred over B-trees for database indexing because:",
    options: [
      "They have fewer levels",
      "All records are at leaf level, enabling efficient range queries",
      "They use less memory",
      "They support only primary keys",
    ],
    correctIndex: 1,
  },
  {
    id: "q-dbms-8", subjectId: "sub-dbms",
    question: "Which relational algebra operation selects rows based on a condition?",
    options: ["Projection (π)", "Selection (σ)", "Join (⋈)", "Division (÷)"],
    correctIndex: 1,
  },

  // ─── OS ──────────────────────────────────────────
  {
    id: "q-os-1", subjectId: "sub-os",
    question: "Which scheduling algorithm may cause starvation?",
    options: ["Round Robin", "FCFS", "Shortest Job First", "Multilevel Feedback Queue"],
    correctIndex: 2,
  },
  {
    id: "q-os-2", subjectId: "sub-os",
    question: "Banker's algorithm is used for:",
    options: ["Deadlock detection", "Deadlock prevention", "Deadlock avoidance", "Deadlock recovery"],
    correctIndex: 2,
  },
  {
    id: "q-os-3", subjectId: "sub-os",
    question: "Which page replacement algorithm suffers from Belady's anomaly?",
    options: ["LRU", "Optimal", "FIFO", "LFU"],
    correctIndex: 2,
  },
  {
    id: "q-os-4", subjectId: "sub-os",
    question: "The critical section problem requires all of the following EXCEPT:",
    options: ["Mutual Exclusion", "Progress", "Bounded Waiting", "Starvation"],
    correctIndex: 3,
  },
  {
    id: "q-os-5", subjectId: "sub-os",
    question: "Which memory allocation strategy leads to external fragmentation?",
    options: ["Paging", "Contiguous allocation", "Segmentation with paging", "Demand paging"],
    correctIndex: 1,
  },
  {
    id: "q-os-6", subjectId: "sub-os",
    question: "In Round Robin scheduling, if the time quantum is very large, it behaves like:",
    options: ["SJF", "FCFS", "Priority Scheduling", "SRTF"],
    correctIndex: 1,
  },
  {
    id: "q-os-7", subjectId: "sub-os",
    question: "Thrashing occurs when:",
    options: [
      "CPU utilization is too high",
      "The system spends more time paging than executing",
      "Too many processes are in ready queue",
      "Disk I/O is slow",
    ],
    correctIndex: 1,
  },
  {
    id: "q-os-8", subjectId: "sub-os",
    question: "Which of the following is NOT a necessary condition for deadlock?",
    options: ["Mutual Exclusion", "Hold and Wait", "Preemption", "Circular Wait"],
    correctIndex: 2,
  },

  // ─── CN ──────────────────────────────────────────
  {
    id: "q-cn-1", subjectId: "sub-cn",
    question: "How many layers does the OSI model have?",
    options: ["4", "5", "6", "7"],
    correctIndex: 3,
  },
  {
    id: "q-cn-2", subjectId: "sub-cn",
    question: "Which protocol uses a 3-way handshake?",
    options: ["UDP", "TCP", "ICMP", "ARP"],
    correctIndex: 1,
  },
  {
    id: "q-cn-3", subjectId: "sub-cn",
    question: "Subnetting is used to:",
    options: [
      "Increase bandwidth",
      "Divide a network into smaller sub-networks",
      "Encrypt data packets",
      "Compress IP headers",
    ],
    correctIndex: 1,
  },
  {
    id: "q-cn-4", subjectId: "sub-cn",
    question: "CRC is used at which layer?",
    options: ["Network", "Transport", "Data Link", "Application"],
    correctIndex: 2,
  },
  {
    id: "q-cn-5", subjectId: "sub-cn",
    question: "DNS operates at which layer of the OSI model?",
    options: ["Transport", "Network", "Session", "Application"],
    correctIndex: 3,
  },
  {
    id: "q-cn-6", subjectId: "sub-cn",
    question: "In Go-Back-N protocol, if the window size is N, how many frames can be sent before an ACK?",
    options: ["N - 1", "N", "N + 1", "2N"],
    correctIndex: 1,
  },
  {
    id: "q-cn-7", subjectId: "sub-cn",
    question: "Which routing algorithm does OSPF use?",
    options: ["Bellman-Ford", "Dijkstra", "Floyd-Warshall", "DFS"],
    correctIndex: 1,
  },
  {
    id: "q-cn-8", subjectId: "sub-cn",
    question: "NAT stands for:",
    options: [
      "Network Access Terminal",
      "Network Address Translation",
      "Node Allocation Table",
      "Network Authentication Token",
    ],
    correctIndex: 1,
  },

  // ─── DSA ─────────────────────────────────────────
  {
    id: "q-dsa-1", subjectId: "sub-dsa",
    question: "What is the time complexity of binary search?",
    options: ["O(n)", "O(log n)", "O(n log n)", "O(1)"],
    correctIndex: 1,
  },
  {
    id: "q-dsa-2", subjectId: "sub-dsa",
    question: "Which data structure uses LIFO order?",
    options: ["Queue", "Stack", "Array", "Linked List"],
    correctIndex: 1,
  },
  {
    id: "q-dsa-3", subjectId: "sub-dsa",
    question: "The worst-case time complexity of Quick Sort is:",
    options: ["O(n log n)", "O(n)", "O(n²)", "O(log n)"],
    correctIndex: 2,
  },
  {
    id: "q-dsa-4", subjectId: "sub-dsa",
    question: "In a BST, the inorder traversal gives elements in:",
    options: ["Reverse order", "Random order", "Sorted order", "Level order"],
    correctIndex: 2,
  },
  {
    id: "q-dsa-5", subjectId: "sub-dsa",
    question: "Floyd's cycle detection algorithm uses:",
    options: ["Two stacks", "Two queues", "Two pointers at different speeds", "Recursion"],
    correctIndex: 2,
  },
  {
    id: "q-dsa-6", subjectId: "sub-dsa",
    question: "Dijkstra's algorithm does NOT work with:",
    options: ["Undirected graphs", "Weighted graphs", "Negative edge weights", "Dense graphs"],
    correctIndex: 2,
  },
  {
    id: "q-dsa-7", subjectId: "sub-dsa",
    question: "The 0/1 Knapsack problem is best solved using:",
    options: ["Greedy approach", "Divide and conquer", "Dynamic programming", "Backtracking"],
    correctIndex: 2,
  },
  {
    id: "q-dsa-8", subjectId: "sub-dsa",
    question: "Which sorting algorithm is stable and has O(n log n) worst-case complexity?",
    options: ["Quick Sort", "Heap Sort", "Merge Sort", "Selection Sort"],
    correctIndex: 2,
  },
];

export function getQuestionsBySubject(subjectId: string): QuizQuestion[] {
  return quizQuestions.filter((q) => q.subjectId === subjectId);
}
