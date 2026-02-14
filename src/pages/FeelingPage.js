import React, { useEffect } from "react";

function FeelingPage({
  canvasRef,
  isDrawing,
  setIsDrawing,
  setCurrentPage,
  setDrawnFaceImage,
}) {
  // 터치 이벤트를 non-passive로 등록하여 preventDefault 사용 가능하게 함
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleTouchStart = (e) => {
      e.preventDefault();
      setIsDrawing(true);
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      const touch = e.touches[0];
      ctx.beginPath();
      // CSS 좌표 사용 (ctx.scale이 이미 적용되어 있음)
      ctx.moveTo(touch.clientX - rect.left, touch.clientY - rect.top);
    };

    const handleTouchMove = (e) => {
      e.preventDefault();
      if (!isDrawing) return;
      const rect = canvas.getBoundingClientRect();
      const ctx = canvas.getContext("2d");
      const touch = e.touches[0];
      // CSS 좌표 사용 (ctx.scale이 이미 적용되어 있음)
      ctx.lineTo(touch.clientX - rect.left, touch.clientY - rect.top);
      ctx.stroke();
    };

    const handleTouchEnd = (e) => {
      e.preventDefault();
      setIsDrawing(false);
    };

    // non-passive 이벤트 리스너 등록
    canvas.addEventListener("touchstart", handleTouchStart, { passive: false });
    canvas.addEventListener("touchmove", handleTouchMove, { passive: false });
    canvas.addEventListener("touchend", handleTouchEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleTouchStart);
      canvas.removeEventListener("touchmove", handleTouchMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [canvasRef, isDrawing, setIsDrawing]);

  return (
    <div className="App">
      <div className="main-container">
        {/* Back button */}
        <button
          className="back-button"
          onClick={() => setCurrentPage("input")}
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
        <div className="feeling-question-section">
          <div className="feeling-question-text">How are you</div>
          <div className="feeling-question-text">feeling today?</div>
        </div>

        {/* Emotion face with canvas */}
        <div className="emotion-face-container">
          <div className="emotion-face">
            <div className="emotion-eyes">
              <div className="emotion-eye"></div>
              <div className="emotion-eye"></div>
            </div>
            <div className="emotion-mouth"></div>
          </div>
          <canvas
            ref={canvasRef}
            className="drawing-canvas"
            onMouseDown={(e) => {
              e.preventDefault();
              setIsDrawing(true);
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const ctx = canvas.getContext("2d");
              ctx.beginPath();
              // CSS 좌표 사용 (ctx.scale이 이미 적용되어 있음)
              ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
            }}
            onMouseMove={(e) => {
              e.preventDefault();
              if (!isDrawing) return;
              const canvas = canvasRef.current;
              if (!canvas) return;
              const rect = canvas.getBoundingClientRect();
              const ctx = canvas.getContext("2d");
              // CSS 좌표 사용 (ctx.scale이 이미 적용되어 있음)
              ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
              ctx.stroke();
            }}
            onMouseUp={(e) => {
              e.preventDefault();
              setIsDrawing(false);
            }}
            onMouseLeave={(e) => {
              e.preventDefault();
              setIsDrawing(false);
            }}
          />
        </div>

        {/* Clear button */}
        <div className="clear-button-section">
          <button
            className="clear-button"
            onClick={() => {
              const canvas = canvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext("2d");
                ctx.clearRect(0, 0, canvas.width, canvas.height);
              }
            }}
          >
            Clear All
          </button>
        </div>

        {/* Next button */}
        <div className="next-button-section">
          <button
            type="button"
            className="next-button"
            onClick={() => {
              // feeling 페이지를 떠날 때 그린 얼굴 이미지 저장
              if (canvasRef.current) {
                const canvas = canvasRef.current;
                const ctx = canvas.getContext("2d");
                const imageData = ctx.getImageData(
                  0,
                  0,
                  canvas.width,
                  canvas.height
                );
                const hasContent = imageData.data.some((channel, index) => {
                  return index % 4 !== 3 && channel !== 0;
                });

                if (hasContent) {
                  const imageDataUrl = canvas.toDataURL("image/png");
                  setDrawnFaceImage(imageDataUrl);
                }
              }
              setCurrentPage("note");
            }}
          >
            Next →
          </button>
        </div>
      </div>
    </div>
  );
}

export default FeelingPage;
