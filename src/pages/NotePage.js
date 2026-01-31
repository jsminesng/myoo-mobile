import React from "react";

function NotePage({ noteValue, setNoteValue, setCurrentPage }) {
  return (
    <div className="App">
      <div className="main-container">
        {/* Back button */}
        <button
          className="back-button"
          onClick={() => setCurrentPage("feeling")}
          style={{
            position: "absolute",
            top: "20px",
            left: "20px",
            zIndex: 1000,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#364C41"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Header */}
        <div className="header"></div>

        {/* Chat section with avatar */}
        <div className="chat-section">
          <div className="chat-bubble" style={{ visibility: "hidden" }}>
            If you need some advise..
          </div>
          <div className="avatar feeling-avatar"></div>
        </div>

        {/* Question section */}
        <div className="note-question-section">
          <div className="note-question-text">Leave a note</div>
          <div className="note-question-text">for yourself.</div>
        </div>

        {/* Note input field */}
        <div className="note-input-section">
          <textarea
            ref={(el) => {
              if (el) {
                el.style.height = "auto";
                el.style.height = `${Math.min(el.scrollHeight, 400)}px`;
              }
            }}
            className="note-input"
            value={noteValue}
            onChange={(e) => {
              setNoteValue(e.target.value);
              const textarea = e.target;
              textarea.style.height = "auto";
              textarea.style.height = `${Math.min(
                textarea.scrollHeight,
                400
              )}px`;
            }}
            placeholder=""
          />
        </div>

        {/* Next button */}
        <div className="next-button-section">
          <button
            className="next-button"
            onClick={() => setCurrentPage("upload")}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

export default NotePage;





