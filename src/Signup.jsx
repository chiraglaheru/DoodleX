import { useState } from "react";

function Signup({ onSignup }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">

      <div className="bg-white border rounded-xl p-8 w-[360px] shadow-sm">

        <h1 className="text-2xl font-bold text-center mb-6">
          Create Account
        </h1>

        <input
          placeholder="Name"
          className="border w-full p-2 mb-3 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="Email"
          className="border w-full p-2 mb-3 rounded"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="border w-full p-2 mb-4 rounded"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={() => onSignup(name, email, password)}
          className="bg-green-500 text-white w-full p-2 rounded"
        >
          Sign Up
        </button>

      </div>
    </div>
  );
}

export default Signup;