import React, { useState } from "react";
import { upsertProfile } from "../utils/auth";

function OnboardingPage({ user, onComplete }) {
  const [displayName, setDisplayName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const handleContinue = async () => {
    if (!user?.id) return;

    try {
      setIsSubmitting(true);
      setErrorMessage("");
      const profile = await upsertProfile({
        userId: user.id,
        displayName: displayName.trim() || "User",
        onboardingCompleted: true,
      });
      onComplete(profile);
    } catch (error) {
      setErrorMessage(error?.message || "Failed to save profile.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="App">
      <div className="main-container">
        <div className="question-section" style={{ marginTop: "120px" }}>
          <div className="question-text">Before we start,</div>
          <div className="question-text">what should I call you?</div>
        </div>

        <div style={{ padding: "0 24px", marginTop: "40px" }}>
          <input
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="Your name"
            className="chat-input"
            style={{ width: "100%", marginBottom: "16px" }}
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
            onClick={handleContinue}
          >
            {isSubmitting ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default OnboardingPage;

