import React, { useState } from "react";
import { generateTest, submitTest } from "../sevices/api";

const TestPage = () => {
  const [moduleId, setModuleId] = useState("");
  const [difficulty, setDifficulty] = useState("Easy");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);

  const handleGenerate = async () => {
    const data = await generateTest({
      module_id: Number(moduleId),
      difficulty,
      num_questions: 5
    });

    setQuestions(data.questions || []);
    setResult(null);
  };

  const handleOptionChange = (questionId, optionKey) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: optionKey
    }));
  };

  const handleSubmit = async () => {
    const formattedAnswers = Object.keys(answers).map(qid => ({
      question_id: Number(qid),
      selected_answer: answers[qid]
    }));

    const data = await submitTest({
      user_id: 1,
      module_id: Number(moduleId),
      answers: formattedAnswers
    });

    setResult(data);
  };

  return (
    <div style={{ padding: "20px" }}>
      <h2>Generate Test</h2>

      <input
        type="number"
        placeholder="Module ID"
        value={moduleId}
        onChange={e => setModuleId(e.target.value)}
      />

      <select
        value={difficulty}
        onChange={e => setDifficulty(e.target.value)}
      >
        <option>Easy</option>
        <option>Medium</option>
        <option>Hard</option>
      </select>

      <button onClick={handleGenerate}>Generate</button>

      {questions.map(q => (
        <div key={q.id} style={{ marginTop: "20px" }}>
          <p><strong>{q.question}</strong></p>
          {Object.entries(q.options).map(([key, value]) => (
            <label key={key} style={{ display: "block" }}>
              <input
                type="radio"
                name={`question-${q.id}`}
                value={key}
                onChange={() => handleOptionChange(q.id, key)}
              />
              {key}: {value}
            </label>
          ))}
        </div>
      ))}

      {questions.length > 0 && (
        <button onClick={handleSubmit} style={{ marginTop: "20px" }}>
          Submit
        </button>
      )}

      {result && (
        <div style={{ marginTop: "20px" }}>
          <h3>Result</h3>
          <p>Score: {result.score}</p>
          <p>Percentage: {result.percentage}%</p>

          <h4>Weak Topics:</h4>
          <ul>
            {result.weak_topics.map(topic => (
              <li key={topic}>{topic}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default TestPage;