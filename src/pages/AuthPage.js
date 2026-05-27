import React, { useState } from "react";
import { signInWithEmail, signUpWithEmail } from "../utils/auth";

function AuthPage() {
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!email.trim() || !password.trim()) {
      setErrorMessage("Please enter email and password.");
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      if (mode === "signin") {
        await signInWithEmail(email.trim(), password);
      } else {
        const result = await signUpWithEmail(email.trim(), password);
        if (!result.session) {
          setErrorMessage("Signup complete. Please check your email to verify.");
        }
      }
    } catch (error) {
      setErrorMessage(error?.message || "Authentication failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="App">
      <div className="main-container">
        <div className="question-section" style={{ marginTop: "120px" }}>
          <div className="question-text">Welcome back!</div>
          <div className="question-text" style={{ fontSize: "30px" }}>
            {mode === "signin" ? "Sign in to continue" : "Create your account"}
          </div>
        </div>

        <div style={{ padding: "0 24px", marginTop: "30px" }}>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Email"
            className="chat-input"
            style={{ marginBottom: "12px", width: "100%" }}
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            className="chat-input"
            style={{ marginBottom: "12px", width: "100%" }}
          />
          {errorMessage ? (
            <div style={{ color: "#b23b3b", fontSize: "13px", marginBottom: "12px" }}>
              {errorMessage}
            </div>
          ) : null}
          <button
            type="button"
            className="next-button"
            style={{ width: "100%" }}
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? "Please wait..." : mode === "signin" ? "Sign In" : "Sign Up"}
          </button>

          <button
            type="button"
            className="clear-button"
            style={{
              marginTop: "12px",
              width: "100%",
              backgroundColor: "transparent",
              color: "#364c41",
              border: "1px solid #364c41",
            }}
            onClick={() => {
              setMode((prev) => (prev === "signin" ? "signup" : "signin"));
              setErrorMessage("");
            }}
          >
            {mode === "signin"
              ? "Need an account? Sign up"
              : "Already have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;

