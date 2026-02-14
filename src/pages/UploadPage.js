import React from "react";
import { saveDiaryEntry } from "../utils/localStorage";

function UploadPage({
  fileInputRef,
  uploadedFile,
  setUploadedFile,
  savedInputValue,
  drawnFaceImage,
  noteValue,
  setNoteValue,
  setWords,
  setShowLayerMessage,
  setCurrentPage,
  setInputValue,
  setSavedInputValue,
  setDrawnFaceImage,
  canvasRef,
}) {
  return (
    <div className="App">
      <div className="main-container">
        {/* Back button */}
        <button
          className="back-button"
          onClick={() => setCurrentPage("note")}
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
        <div className="upload-question-section">
          <div className="upload-question-text">Want to add</div>
          <div className="upload-question-text">a photo or a</div>
          <div className="upload-question-text">video?</div>
        </div>

        {/* Upload box */}
        <div className="upload-section">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*,video/*"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files[0];
              if (file) {
                setUploadedFile(file);
              }
            }}
          />
          <div
            className="upload-box"
            onClick={() => fileInputRef.current?.click()}
          >
            {uploadedFile ? (
              uploadedFile.type.startsWith("image/") ? (
                <img
                  src={URL.createObjectURL(uploadedFile)}
                  alt="Uploaded"
                  className="uploaded-preview"
                />
              ) : (
                <video
                  src={URL.createObjectURL(uploadedFile)}
                  className="uploaded-preview"
                  controls
                />
              )
            ) : (
              <>
                <svg
                  className="upload-icon"
                  width="40"
                  height="40"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#364C41"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="17 8 12 3 7 8" />
                  <line x1="12" y1="3" x2="12" y2="15" />
                </svg>
                <div className="upload-text">upload</div>
              </>
            )}
          </div>
        </div>

        {/* Next button */}
        <div className="next-button-section">
          <button
            type="button"
            className="next-button"
            onClick={async () => {
              // 단어와 얼굴이 있으면 저장 후 메인으로, 없으면 그냥 메인으로
              if (savedInputValue && drawnFaceImage) {
                const today = new Date();
                const year = today.getFullYear();
                const month = String(today.getMonth() + 1).padStart(2, "0");
                const day = String(today.getDate()).padStart(2, "0");
                const dateString = `${year}.${month}.${day}`;

                try {
                  await saveDiaryEntry({
                    date: dateString,
                    word: savedInputValue,
                    feeling: drawnFaceImage,
                    note: noteValue || "",
                    media: uploadedFile,
                  });
                  console.log("Diary entry saved to localStorage");
                } catch (error) {
                  console.error("Failed to save to localStorage:", error);
                }

                const newWord = {
                  text: savedInputValue,
                  icon: true,
                  faceImage: drawnFaceImage,
                  note: noteValue,
                  uploadedFile: uploadedFile,
                  date: dateString,
                };
                setWords((prev) => [...prev, newWord]);
                setShowLayerMessage(true);
                setCurrentPage("input");
              } else {
                // 조건 미충족이어도 메인으로 돌아가기 (갇히지 않도록)
                setCurrentPage("input");
              }
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

export default UploadPage;
