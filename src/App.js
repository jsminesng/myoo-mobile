import "./App.css";
import { useState, useEffect, useRef } from "react";
import FeelingPage from "./pages/FeelingPage";
import NotePage from "./pages/NotePage";
import UploadPage from "./pages/UploadPage";
import DetailPage from "./pages/DetailPage";
import ChatPage from "./pages/ChatPage";
import AuthPage from "./pages/AuthPage";
import OnboardingPage from "./pages/OnboardingPage";
import WordBubbles from "./components/WordBubbles";
import { getDiaryEntries } from "./utils/diaryStorage";
import { isSupabaseConfigured } from "./utils/supabaseClient";
import {
  getCurrentUser,
  getProfile,
  onAuthStateChange,
  signOutUser,
} from "./utils/auth";

function App() {
  const [inputValue, setInputValue] = useState("");
  const [currentPage, setCurrentPage] = useState("input"); // 'input', 'feeling', 'note', 'upload', or 'detail'
  const [selectedWordIndex, setSelectedWordIndex] = useState(null); // 선택된 단어 박스의 인덱스
  const [isDrawing, setIsDrawing] = useState(false);
  const [noteValue, setNoteValue] = useState("");
  const [uploadedFile, setUploadedFile] = useState(null);
  const [drawnFaceImage, setDrawnFaceImage] = useState(null);
  const [savedInputValue, setSavedInputValue] = useState(""); // 메인 페이지에서 입력한 단어 저장
  const [showLayerMessage, setShowLayerMessage] = useState(false); // "One more layer added!" 메시지 표시
  const [bubbleLayout] = useState([]); // 정적인 버블 위치/회전 정보
  const [authLoading, setAuthLoading] = useState(isSupabaseConfigured);
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const inputRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [words, setWords] = useState([]);

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    let isMounted = true;

    const initializeAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        if (!isMounted) return;
        setUser(currentUser);
      } catch (error) {
        console.error("Failed to initialize auth:", error);
      } finally {
        if (isMounted) setAuthLoading(false);
      }
    };

    initializeAuth();

    const { data } = onAuthStateChange((nextUser) => {
      if (!isMounted) return;
      setUser(nextUser);
      if (!nextUser) {
        setProfile(null);
        setWords([]);
        setIsProfileModalOpen(false);
      }
    });

    return () => {
      isMounted = false;
      data.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !user?.id) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let isMounted = true;
    const loadProfile = async () => {
      try {
        setProfileLoading(true);
        const profileData = await getProfile(user.id);
        if (isMounted) {
          setProfile(profileData);
        }
      } catch (error) {
        console.error("Failed to load profile:", error);
      } finally {
        if (isMounted) {
          setProfileLoading(false);
        }
      }
    };
    loadProfile();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // 사용자별 다이어리 항목 불러오기
  useEffect(() => {
    if (isSupabaseConfigured && !user) {
      setWords([]);
      return;
    }

    let isMounted = true;

    const loadEntries = async () => {
      try {
        const entries = await getDiaryEntries();
        if (!isMounted) return;
        if (entries.length === 0) {
          setWords([]);
          return;
        }

        // 저장소 항목을 words 형식으로 변환
        const loadedWords = entries.map((entry) => ({
          text: entry.word || "",
          icon: !!entry.feeling,
          faceImage: entry.feeling || null,
          note: entry.note || "",
          uploadedFile: entry.media || null,
          date: entry.date || "",
          id: entry.id,
          mediaType: entry.mediaType || null,
        }));

        setWords(loadedWords);
      } catch (error) {
        console.error("Failed to load diary entries:", error);
      }
    };

    loadEntries();
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Canvas 초기화
  useEffect(() => {
    if (currentPage === "feeling" && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");

      // 캔버스 크기 설정
      const container = canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        
        // CSS 크기와 내부 해상도를 일치시킴
        canvas.style.width = rect.width + "px";
        canvas.style.height = rect.height + "px";
        canvas.width = rect.width;
        canvas.height = rect.height;

        // 그리기 스타일 설정
        ctx.strokeStyle = "#364C41";
        ctx.lineWidth = 3;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [currentPage]);

  // "One more layer added" 메시지 표시 후 5초 뒤 랜딩 페이지로 이동
  useEffect(() => {
    if (showLayerMessage) {
      const timer = setTimeout(() => {
        setShowLayerMessage(false);
        // 상태 초기화
        setInputValue("");
        setSavedInputValue("");
        setUploadedFile(null);
        setNoteValue("");
        setDrawnFaceImage(null);
        // 캔버스도 초기화
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          ctx.clearRect(
            0,
            0,
            canvasRef.current.width,
            canvasRef.current.height
          );
        }
      }, 5000); // 5초 후

      return () => clearTimeout(timer);
    }
  }, [showLayerMessage]);

  if (isSupabaseConfigured && authLoading) {
    return (
      <div className="App">
        <div className="main-container">
          <div className="question-section" style={{ marginTop: "200px" }}>
            <div className="question-text">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (isSupabaseConfigured && !user) {
    return <AuthPage />;
  }

  if (isSupabaseConfigured && user && profileLoading) {
    return (
      <div className="App">
        <div className="main-container">
          <div className="question-section" style={{ marginTop: "200px" }}>
            <div className="question-text">Loading...</div>
          </div>
        </div>
      </div>
    );
  }

  if (
    isSupabaseConfigured &&
    user &&
    (!profile || !profile.onboarding_completed)
  ) {
    return (
      <OnboardingPage
        user={user}
        onComplete={(nextProfile) => {
          setProfile(nextProfile);
        }}
      />
    );
  }

  const profileId = user?.email ? `@${user.email.split("@")[0]}` : "@guest";
  const profileName = profile?.display_name || "User";
  const greetingName = profile?.display_name || user?.email?.split("@")[0] || "there";

  if (currentPage === "feeling") {
    return (
      <FeelingPage
        canvasRef={canvasRef}
        isDrawing={isDrawing}
        setIsDrawing={setIsDrawing}
        setCurrentPage={setCurrentPage}
        setDrawnFaceImage={setDrawnFaceImage}
      />
    );
  }

  if (currentPage === "note") {
    return (
      <NotePage
        noteValue={noteValue}
        setNoteValue={setNoteValue}
        setCurrentPage={setCurrentPage}
      />
    );
  }

  if (currentPage === "upload") {
    return (
      <UploadPage
        fileInputRef={fileInputRef}
        uploadedFile={uploadedFile}
        setUploadedFile={setUploadedFile}
        savedInputValue={savedInputValue}
        drawnFaceImage={drawnFaceImage}
        noteValue={noteValue}
        setNoteValue={setNoteValue}
        setWords={setWords}
        setShowLayerMessage={setShowLayerMessage}
        setCurrentPage={setCurrentPage}
        setInputValue={setInputValue}
        setSavedInputValue={setSavedInputValue}
        setDrawnFaceImage={setDrawnFaceImage}
        canvasRef={canvasRef}
      />
    );
  }

  // Chat page
  if (currentPage === "chat") {
    const selectedWord =
      selectedWordIndex !== null ? words[selectedWordIndex] : null;
    return (
      <ChatPage
        setCurrentPage={setCurrentPage}
        selectedDiaryEntry={selectedWord}
        username={greetingName}
      />
    );
  }

  // Detail page (diary entry view)
  if (currentPage === "detail" && selectedWordIndex !== null) {
    const selectedWord = words[selectedWordIndex];
    return (
      <DetailPage
        selectedWord={selectedWord}
        setCurrentPage={setCurrentPage}
        setSelectedWordIndex={setSelectedWordIndex}
        setSelectedWordForChat={(word) => {
          // 선택된 일기를 저장하여 챗봇 페이지에서 사용
          setSelectedWordIndex(words.findIndex((w) => w.id === word.id));
        }}
      />
    );
  }

  // "One more layer added" 페이지 (전체 화면)
  if (showLayerMessage) {
    // 가장 최근에 추가된 버블 찾기
    const latestWord = words.length > 0 ? words[words.length - 1] : null;

    return (
      <div className="App">
        <div className="main-container layer-added-container">
          {/* Chat bubble with "Great job!" */}
          <div className="chat-section layer-added-chat-section">
            <div className="chat-bubble layer-added-chat-bubble">
              Great job!
            </div>
            <div
              className="avatar layer-added-avatar"
              onClick={() => setCurrentPage("chat")}
              style={{ cursor: "pointer" }}
            ></div>
          </div>

          {/* "One more layer added!" 텍스트 */}
          <div className="layer-message-section layer-added-message-section">
            <div className="layer-message-text">One more layer added!</div>
          </div>

          {/* 방금 추가된 버블 (중앙) */}
          {latestWord && (
            <div className="layer-added-new-bubble-container">
              <div className="word-bubble layer-added-new-bubble">
                {latestWord.text}
                {latestWord.icon && latestWord.faceImage && (
                  <span className="circle-icon">
                    <img
                      src={latestWord.faceImage}
                      alt="Face"
                      className="face-image"
                    />
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 기존 버블들 (하단) */}
          <WordBubbles
            words={words.slice(0, -1)} // 마지막 버블 제외
            bubbleLayout={bubbleLayout}
            currentPage={currentPage}
            setSelectedWordIndex={setSelectedWordIndex}
            setCurrentPage={setCurrentPage}
            setInputValue={setInputValue}
            inputRef={inputRef}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <div className="main-container">
        {/* Header */}
        <div className="header">
          <button
            type="button"
            className="settings-icon"
            onClick={() => setIsProfileModalOpen(true)}
            aria-label="Open profile"
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
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4m0 12v4M5.64 5.64l2.83 2.83m7.06 7.06l2.83 2.83M2 12h4m12 0h4M5.64 18.36l2.83-2.83m7.06-7.06l2.83-2.83" />
            </svg>
          </button>
        </div>

        {/* Chat bubble */}
        <div className="chat-section">
          <div className="chat-bubble">If you need some advise..</div>
          <div
            className="avatar"
            onClick={() => setCurrentPage("chat")}
            style={{ cursor: "pointer" }}
          ></div>
        </div>

        {/* Main question */}
        <div className="question-section">
          <div className="question-text">
            <span className="greeting">
              Hi <span className="highlight">{greetingName}</span>!
            </span>
          </div>
          <div className="question-text">What's one</div>
          <div className="question-text">word for your</div>
          <div className="question-text">day today?</div>
        </div>

        {/* Input field */}
        <div className="input-section">
          <div className={`input-field ${inputValue ? "has-text" : ""}`}>
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && inputValue.trim()) {
                  setSavedInputValue(inputValue); // 입력한 단어 저장
                  setCurrentPage("feeling");
                }
              }}
              placeholder=""
              className="input-text"
            />
          </div>
          {inputValue && (
            <div
              className="submit-button"
              onClick={() => {
                setSavedInputValue(inputValue); // 입력한 단어 저장
                setCurrentPage("feeling");
              }}
            >
              <svg
                className="submit-arrow"
                width="20"
                height="20"
                viewBox="0 0 20 20"
                fill="none"
              >
                <path
                  d="M7 4L13 10L7 16"
                  stroke="#364C41"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}
        </div>

        {/* Word bubbles */}
        <WordBubbles
          words={words}
          bubbleLayout={bubbleLayout}
          currentPage={currentPage}
          setSelectedWordIndex={setSelectedWordIndex}
          setCurrentPage={setCurrentPage}
          setInputValue={setInputValue}
          inputRef={inputRef}
        />

        {isProfileModalOpen && (
          <div
            className="profile-modal-overlay"
            onClick={() => setIsProfileModalOpen(false)}
          >
            <div
              className="profile-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="profile-modal-header">
                <div className="profile-modal-title">Profile</div>
                <button
                  type="button"
                  className="profile-close-button"
                  onClick={() => setIsProfileModalOpen(false)}
                >
                  x
                </button>
              </div>

              <div className="profile-field">
                <div className="profile-label">ID</div>
                <div className="profile-value-row">
                  <div className="profile-value">{profileId}</div>
                </div>
              </div>

              <div className="profile-field">
                <div className="profile-label">Password</div>
                <div className="profile-value-row">
                  <div className="profile-value">********</div>
                  <button type="button" className="profile-edit-button">
                    ✎
                  </button>
                </div>
              </div>

              <div className="profile-field">
                <div className="profile-label">Name</div>
                <div className="profile-value-row">
                  <div className="profile-value">{profileName}</div>
                  <button type="button" className="profile-edit-button">
                    ✎
                  </button>
                </div>
              </div>

              {isSupabaseConfigured && user ? (
                <button
                  type="button"
                  className="profile-logout-button"
                  onClick={async () => {
                    try {
                      await signOutUser();
                      setCurrentPage("input");
                      setIsProfileModalOpen(false);
                    } catch (error) {
                      console.error("Failed to sign out:", error);
                    }
                  }}
                >
                  Logout
                </button>
              ) : null}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
