const API_BASE = "http://localhost:5000/api";

export const generateTest = async (data) => {
  const res = await fetch(`${API_BASE}/assessment/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return res.json();
};

export const submitTest = async (data) => {
  const res = await fetch(`${API_BASE}/assessment/submit`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data)
  });

  return res.json();
};