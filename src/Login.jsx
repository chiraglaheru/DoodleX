import { useState } from "react";

function Login({ onLogin, goSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">

      <div className="bg-white border rounded-xl p-8 w-[360px] shadow-sm">

        <h1 className="text-2xl font-bold text-center mb-6">
          PawFeed 🐾
        </h1>

        <input
          type="email"
          placeholder="Email"
          className="border w-full p-2 mb-3 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="border w-full p-2 mb-4 rounded-md bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-400"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        <button
          onClick={() => onLogin(email, password)}
          className="bg-blue-500 hover:bg-blue-600 text-white w-full py-2 rounded-md font-semibold"
        >
          Log In
        </button>

        {/* SWITCH TO SIGNUP */}
        <p className="text-center text-sm text-gray-500 mt-4">
          Don’t have an account?
        </p>

        <p
          onClick={goSignup}
          className="text-center text-sm text-blue-500 mt-2 cursor-pointer"
        >
          Create account
        </p>

      </div>

    </div>
  );
}

export default Login;