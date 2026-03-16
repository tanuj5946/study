export type Difficulty = "Easy" | "Medium" | "Hard";
export type Status = "Not Started" | "In Progress" | "Completed";

export interface TopicDetail {
  id: string;
  subjectId: string;
  title: string;
  description: string;
  status: Status;
  estimatedMinutes: number;
  difficulty: Difficulty;
  progress: number;
  notes: string;
  resources: { label: string; url: string }[];
  lastUpdated: string;
}

export interface Subject {
  id: string;
  title: string;
  description: string;
  status: Status;
  estimatedMinutes: number;
  progress: number;
  topicIds: string[];
  lastUpdated: string;
}

// ─── Topics ────────────────────────────────────────────────────

export const topics: Record<string, TopicDetail> = {
  // DBMS Topics
  "topic-dbms-er": {
    id: "topic-dbms-er", subjectId: "sub-dbms",
    title: "ER Model",
    description: "Entity-Relationship diagrams, cardinality constraints, participation, weak entities, and conceptual schema design techniques.",
    status: "Completed", estimatedMinutes: 120, difficulty: "Easy", progress: 100,
    notes: "Focus on converting ER diagrams to relational schemas. Practice identifying primary keys and relationships from word problems.",
    resources: [{ label: "ER Model – GeeksforGeeks", url: "#" }, { label: "Navathe Ch. 3 Notes", url: "#" }],
    lastUpdated: "2026-02-18",
  },
  "topic-dbms-relational": {
    id: "topic-dbms-relational", subjectId: "sub-dbms",
    title: "Relational Model",
    description: "Relations, keys (candidate, super, foreign), relational algebra, tuple relational calculus, and domain relational calculus.",
    status: "Completed", estimatedMinutes: 150, difficulty: "Medium", progress: 100,
    notes: "Relational algebra operations: σ (select), π (project), ⋈ (join), ÷ (division). Practice converting SQL to relational algebra.",
    resources: [{ label: "Relational Algebra Cheat Sheet", url: "#" }, { label: "Practice Problems Set", url: "#" }],
    lastUpdated: "2026-02-16",
  },
  "topic-dbms-normalization": {
    id: "topic-dbms-normalization", subjectId: "sub-dbms",
    title: "Normalization",
    description: "Functional dependencies, 1NF through BCNF, 4NF, lossless-join decomposition, and dependency preservation.",
    status: "In Progress", estimatedMinutes: 180, difficulty: "Hard", progress: 55,
    notes: "Key insight: BCNF removes all redundancy from FDs but may sacrifice dependency preservation. 3NF is a good compromise.",
    resources: [{ label: "Normalization Visualizer", url: "#" }, { label: "FD Closure Calculator", url: "#" }, { label: "GATE PYQs – Normalization", url: "#" }],
    lastUpdated: "2026-02-20",
  },
  "topic-dbms-sql": {
    id: "topic-dbms-sql", subjectId: "sub-dbms",
    title: "SQL",
    description: "DDL, DML, aggregate functions, nested subqueries, correlated subqueries, joins, views, triggers, and stored procedures.",
    status: "Not Started", estimatedMinutes: 150, difficulty: "Medium", progress: 0,
    notes: "", resources: [{ label: "SQLZoo Interactive", url: "#" }, { label: "LeetCode SQL 50", url: "#" }],
    lastUpdated: "2026-02-19",
  },
  "topic-dbms-transactions": {
    id: "topic-dbms-transactions", subjectId: "sub-dbms",
    title: "Transactions",
    description: "ACID properties, serializability, conflict & view equivalence, two-phase locking, timestamp ordering, and recovery protocols.",
    status: "Not Started", estimatedMinutes: 150, difficulty: "Hard", progress: 0,
    notes: "", resources: [{ label: "Transaction Concepts – Navathe Ch. 17", url: "#" }],
    lastUpdated: "2026-02-10",
  },
  "topic-dbms-indexing": {
    id: "topic-dbms-indexing", subjectId: "sub-dbms",
    title: "Indexing",
    description: "Primary, secondary, dense, sparse indexes. B-trees, B+ trees, hash-based indexing, and query optimization basics.",
    status: "Not Started", estimatedMinutes: 120, difficulty: "Medium", progress: 0,
    notes: "", resources: [{ label: "B+ Tree Simulator", url: "#" }],
    lastUpdated: "2026-02-10",
  },

  // OS Topics
  "topic-os-cpu": {
    id: "topic-os-cpu", subjectId: "sub-os",
    title: "CPU Scheduling",
    description: "FCFS, SJF, SRTF, Round Robin, priority scheduling, multilevel queue, and multilevel feedback queue algorithms.",
    status: "Completed", estimatedMinutes: 150, difficulty: "Medium", progress: 100,
    notes: "Remember: SJF is optimal for average waiting time but requires knowing burst time in advance. RR performance depends on quantum size.",
    resources: [{ label: "Scheduling Simulator", url: "#" }, { label: "Galvin Ch. 5 Summary", url: "#" }],
    lastUpdated: "2026-02-17",
  },
  "topic-os-deadlock": {
    id: "topic-os-deadlock", subjectId: "sub-os",
    title: "Deadlock",
    description: "Necessary conditions, resource allocation graphs, deadlock detection, prevention, avoidance via Banker's algorithm.",
    status: "Completed", estimatedMinutes: 150, difficulty: "Hard", progress: 100,
    notes: "Banker's algorithm: check safe state by simulating allocation. Key: if a safe sequence exists, grant request. Practice RAG cycle detection.",
    resources: [{ label: "Banker's Algorithm Solver", url: "#" }, { label: "GATE PYQs – Deadlock", url: "#" }],
    lastUpdated: "2026-02-15",
  },
  "topic-os-memory": {
    id: "topic-os-memory", subjectId: "sub-os",
    title: "Memory Management",
    description: "Contiguous allocation, paging, segmentation, virtual memory, demand paging, page replacement algorithms, thrashing.",
    status: "Completed", estimatedMinutes: 180, difficulty: "Hard", progress: 100,
    notes: "LRU is optimal among online algorithms. Belady's anomaly occurs in FIFO but not in LRU or Optimal. Practice EAT calculations.",
    resources: [{ label: "Page Replacement Visualizer", url: "#" }, { label: "Virtual Memory Concepts", url: "#" }],
    lastUpdated: "2026-02-14",
  },
  "topic-os-sync": {
    id: "topic-os-sync", subjectId: "sub-os",
    title: "Synchronization",
    description: "Critical section problem, Peterson's solution, semaphores, monitors, producer-consumer, readers-writers, dining philosophers.",
    status: "Not Started", estimatedMinutes: 150, difficulty: "Hard", progress: 0,
    notes: "", resources: [{ label: "Synchronization Animations", url: "#" }, { label: "Classical Problems Walkthrough", url: "#" }],
    lastUpdated: "2026-02-20",
  },
  "topic-os-fs": {
    id: "topic-os-fs", subjectId: "sub-os",
    title: "File System",
    description: "Directory structures, file allocation methods (contiguous, linked, indexed), free-space management, disk scheduling.",
    status: "Not Started", estimatedMinutes: 120, difficulty: "Easy", progress: 0,
    notes: "", resources: [{ label: "Disk Scheduling Simulator", url: "#" }],
    lastUpdated: "2026-02-13",
  },

  // CN Topics
  "topic-cn-intro": {
    id: "topic-cn-intro", subjectId: "sub-cn",
    title: "Network Models",
    description: "OSI and TCP/IP reference models, layer functions, encapsulation, and protocol data units.",
    status: "Completed", estimatedMinutes: 90, difficulty: "Easy", progress: 100,
    notes: "OSI has 7 layers; TCP/IP has 4. Focus on which protocols operate at which layer.",
    resources: [{ label: "OSI vs TCP/IP Comparison", url: "#" }], lastUpdated: "2026-02-12",
  },
  "topic-cn-datalink": {
    id: "topic-cn-datalink", subjectId: "sub-cn",
    title: "Data Link Layer",
    description: "Framing, error detection (CRC, checksum), flow control (stop-and-wait, sliding window), and MAC protocols.",
    status: "Completed", estimatedMinutes: 150, difficulty: "Medium", progress: 100,
    notes: "Sliding window: sender window size determines throughput. Go-Back-N vs Selective Repeat tradeoffs.",
    resources: [{ label: "Sliding Window Simulator", url: "#" }, { label: "CRC Calculator", url: "#" }], lastUpdated: "2026-02-14",
  },
  "topic-cn-network": {
    id: "topic-cn-network", subjectId: "sub-cn",
    title: "Network Layer",
    description: "IP addressing, subnetting, CIDR, routing algorithms (Dijkstra, Bellman-Ford), NAT, and ICMP.",
    status: "In Progress", estimatedMinutes: 180, difficulty: "Hard", progress: 45,
    notes: "Practice subnetting quickly — given IP and mask, find network ID, broadcast, and host range.",
    resources: [{ label: "Subnetting Practice", url: "#" }, { label: "GATE PYQs – Subnetting", url: "#" }], lastUpdated: "2026-02-19",
  },
  "topic-cn-transport": {
    id: "topic-cn-transport", subjectId: "sub-cn",
    title: "Transport Layer",
    description: "TCP vs UDP, 3-way handshake, congestion control (slow start, AIMD), flow control, and port multiplexing.",
    status: "Not Started", estimatedMinutes: 150, difficulty: "Hard", progress: 0,
    notes: "", resources: [{ label: "TCP State Diagram", url: "#" }], lastUpdated: "2026-02-10",
  },
  "topic-cn-app": {
    id: "topic-cn-app", subjectId: "sub-cn",
    title: "Application Layer",
    description: "HTTP, DNS, DHCP, FTP, SMTP, and socket programming fundamentals.",
    status: "Not Started", estimatedMinutes: 120, difficulty: "Easy", progress: 0,
    notes: "", resources: [{ label: "DNS Resolution Walkthrough", url: "#" }], lastUpdated: "2026-02-10",
  },

  // DSA Topics
  "topic-dsa-arrays": {
    id: "topic-dsa-arrays", subjectId: "sub-dsa",
    title: "Arrays & Strings",
    description: "Array manipulation, two-pointer technique, sliding window, prefix sums, and string matching algorithms.",
    status: "Completed", estimatedMinutes: 180, difficulty: "Easy", progress: 100,
    notes: "Two-pointer works on sorted arrays. Sliding window for subarray problems with constraints.",
    resources: [{ label: "LeetCode Array Patterns", url: "#" }, { label: "KMP Algorithm Explained", url: "#" }], lastUpdated: "2026-02-11",
  },
  "topic-dsa-linkedlist": {
    id: "topic-dsa-linkedlist", subjectId: "sub-dsa",
    title: "Linked Lists",
    description: "Singly, doubly, circular linked lists, fast-slow pointers, reversal, merge, and cycle detection.",
    status: "Completed", estimatedMinutes: 120, difficulty: "Easy", progress: 100,
    notes: "Floyd's cycle detection: slow + fast pointers. To find cycle start, reset one pointer to head.",
    resources: [{ label: "Linked List Visualizer", url: "#" }], lastUpdated: "2026-02-12",
  },
  "topic-dsa-trees": {
    id: "topic-dsa-trees", subjectId: "sub-dsa",
    title: "Trees & BST",
    description: "Binary trees, BST operations, AVL trees, tree traversals (inorder, preorder, postorder, level-order).",
    status: "Completed", estimatedMinutes: 180, difficulty: "Medium", progress: 100,
    notes: "Inorder traversal of BST gives sorted order. AVL rotations: LL, RR, LR, RL.",
    resources: [{ label: "Tree Traversal Animations", url: "#" }, { label: "AVL Tree Simulator", url: "#" }], lastUpdated: "2026-02-14",
  },
  "topic-dsa-graphs": {
    id: "topic-dsa-graphs", subjectId: "sub-dsa",
    title: "Graph Algorithms",
    description: "BFS, DFS, Dijkstra, Bellman-Ford, Floyd-Warshall, Kruskal, Prim, topological sort, and cycle detection.",
    status: "Not Started", estimatedMinutes: 240, difficulty: "Hard", progress: 0,
    notes: "", resources: [{ label: "Graph Algorithm Visualizer", url: "#" }, { label: "GATE PYQs – Graphs", url: "#" }], lastUpdated: "2026-02-20",
  },
  "topic-dsa-dp": {
    id: "topic-dsa-dp", subjectId: "sub-dsa",
    title: "Dynamic Programming",
    description: "Memoization, tabulation, 0/1 knapsack, LCS, LIS, matrix chain multiplication, and state optimization.",
    status: "Not Started", estimatedMinutes: 240, difficulty: "Hard", progress: 0,
    notes: "", resources: [{ label: "DP Patterns Guide", url: "#" }, { label: "Aditya Verma DP Playlist", url: "#" }], lastUpdated: "2026-02-21",
  },
  "topic-dsa-sorting": {
    id: "topic-dsa-sorting", subjectId: "sub-dsa",
    title: "Sorting & Searching",
    description: "Merge sort, quick sort, heap sort, counting sort, binary search variations, and order statistics.",
    status: "Not Started", estimatedMinutes: 150, difficulty: "Medium", progress: 0,
    notes: "", resources: [{ label: "Sorting Visualizer", url: "#" }], lastUpdated: "2026-02-13",
  },
};

// ─── Subjects (now top-level) ──────────────────────────────────

export const subjects: Record<string, Subject> = {
  "sub-dbms": {
    id: "sub-dbms",
    title: "Database Management System",
    description: "Comprehensive study of database design, querying, normalization, transactions, and storage structures.",
    status: "In Progress", estimatedMinutes: 870, progress: 49,
    topicIds: ["topic-dbms-er", "topic-dbms-relational", "topic-dbms-normalization", "topic-dbms-sql", "topic-dbms-transactions", "topic-dbms-indexing"],
    lastUpdated: "2026-02-20",
  },
  "sub-os": {
    id: "sub-os",
    title: "Operating System",
    description: "Core OS concepts including process management, scheduling, memory, synchronization, and file systems.",
    status: "In Progress", estimatedMinutes: 750, progress: 88,
    topicIds: ["topic-os-cpu", "topic-os-deadlock", "topic-os-memory", "topic-os-sync", "topic-os-fs"],
    lastUpdated: "2026-02-20",
  },
  "sub-cn": {
    id: "sub-cn",
    title: "Computer Networks",
    description: "Network architecture, protocols across OSI/TCP-IP layers, routing, transport mechanisms, and application protocols.",
    status: "In Progress", estimatedMinutes: 690, progress: 54,
    topicIds: ["topic-cn-intro", "topic-cn-datalink", "topic-cn-network", "topic-cn-transport", "topic-cn-app"],
    lastUpdated: "2026-02-19",
  },
  "sub-dsa": {
    id: "sub-dsa",
    title: "Data Structures & Algorithms",
    description: "Fundamental data structures, algorithmic paradigms, sorting, searching, graph algorithms, and dynamic programming.",
    status: "In Progress", estimatedMinutes: 1110, progress: 78,
    topicIds: ["topic-dsa-arrays", "topic-dsa-linkedlist", "topic-dsa-trees", "topic-dsa-graphs", "topic-dsa-dp", "topic-dsa-sorting"],
    lastUpdated: "2026-02-21",
  },
};

// ─── Subject list (ordered) ───────────────────────────────────

export const subjectList: Subject[] = [
  subjects["sub-dbms"],
  subjects["sub-os"],
  subjects["sub-cn"],
  subjects["sub-dsa"],
];

// ─── Helper functions ──────────────────────────────────────────

export function getSubjectById(id: string): Subject | undefined {
  return subjects[id];
}

export function getTopicById(id: string): TopicDetail | undefined {
  return topics[id];
}

export function getTopicsForSubject(subjectId: string): TopicDetail[] {
  const sub = getSubjectById(subjectId);
  if (!sub) return [];
  return sub.topicIds.map((id) => topics[id]).filter(Boolean);
}

/** Check if a topic is unlocked (previous topic must be completed) */
export function isTopicUnlocked(subjectId: string, topicId: string): boolean {
  const sub = getSubjectById(subjectId);
  if (!sub) return false;
  const idx = sub.topicIds.indexOf(topicId);
  if (idx <= 0) return true; // first topic is always unlocked
  const prevTopic = topics[sub.topicIds[idx - 1]];
  return prevTopic?.progress === 100;
}

export function formatMinutes(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
