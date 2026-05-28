import React, { useState, useRef, useEffect } from "react";
import { getDiaryEntries } from "../utils/diaryStorage";
import { invokeDiaryChat } from "../utils/chatApi";
import { saveChatLog } from "../utils/chatStorage";

function ChatPage({ setCurrentPage, selectedDiaryEntry, username = "there" }) {
  const [diaryEntries, setDiaryEntries] = useState([]);
  const [selectedEntryId, setSelectedEntryId] = useState(null);

  // 초기 메시지 생성 - 선택된 일기가 있으면 그에 대한 내용 포함
  const getInitialMessage = () => {
    if (selectedDiaryEntry) {
      const diaryText = selectedDiaryEntry.note || "";
      const diaryWord = selectedDiaryEntry.text || "";
      const diaryDate = selectedDiaryEntry.date || "";

      if (diaryText || diaryWord) {
        return {
          id: 1,
          type: "ai",
          content: `Hi ${username}!\nI see you're looking at your diary entry about "${diaryWord}"${
            diaryDate ? ` from ${diaryDate}` : ""
          }.\nWhat do you need today?`,
          suggestions: [
            "Clear advice",
            "Supportive messages",
            "Write apologies for me",
          ],
        };
      }
    }

    return {
      id: 1,
      type: "ai",
      content: `Hi ${username}!\nWhat do you need today?`,
      suggestions: [
        "Clear advice",
        "Supportive messages",
        "Write apologies for me",
      ],
    };
  };

  const [messages, setMessages] = useState([getInitialMessage()]);
  const [inputValue, setInputValue] = useState("");
  const [clickedSuggestions, setClickedSuggestions] = useState(new Set()); // 클릭된 버튼 추적
  const messagesContainerRef = useRef(null);
  const inputRef = useRef(null);

  // Load diary entries on mount
  useEffect(() => {
    let isMounted = true;

    const loadEntries = async () => {
      const entries = await getDiaryEntries();
      if (!isMounted) return;
      setDiaryEntries(entries);

      // 선택된 일기가 있으면 그것을 사용, 없으면 가장 최근 항목 선택
      if (selectedDiaryEntry) {
        if (selectedDiaryEntry.id) {
          const matchingEntry = entries.find(
            (entry) => entry.id === selectedDiaryEntry.id,
          );
          if (matchingEntry) {
            setSelectedEntryId(matchingEntry.id);
            return;
          }
        }

        const matchingByWord = entries.find(
          (entry) => entry.word === selectedDiaryEntry.text,
        );
        if (matchingByWord) {
          setSelectedEntryId(matchingByWord.id);
          return;
        }
      }

      if (entries.length > 0) {
        const sortedEntries = [...entries].sort((a, b) => {
          const dateA = a.date
            ? new Date(a.date.replace(/\./g, "-"))
            : new Date(0);
          const dateB = b.date
            ? new Date(b.date.replace(/\./g, "-"))
            : new Date(0);
          return dateB - dateA;
        });
        setSelectedEntryId(sortedEntries[0].id);
      }
    };

    loadEntries();
    return () => {
      isMounted = false;
    };
  }, [selectedDiaryEntry]);

  const scrollToBottom = () => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop =
        messagesContainerRef.current.scrollHeight;
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Get the selected diary entry
  const getSelectedEntry = () => {
    if (!selectedEntryId) return null;
    return diaryEntries.find((entry) => entry.id === selectedEntryId);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    // 사용자 메시지 추가
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: inputValue,
    };
    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputValue;
    setInputValue("");

    // 로딩 메시지 추가
    const loadingMessage = {
      id: Date.now() + 1,
      type: "ai",
      content: "Thinking...",
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const selectedEntry = getSelectedEntry();
      const text = await invokeDiaryChat({
        mode: "free_chat",
        userMessage: currentInput,
        diaryEntry: selectedEntry,
      });

      try {
        await saveChatLog({
          entryId: selectedEntry?.id || null,
          mode: "free_chat",
          userMessage: currentInput,
          aiMessage: text,
        });
      } catch (logError) {
        console.error("Chat log save failed:", logError);
      }

      // 로딩 메시지 제거하고 응답 추가
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            type: "ai",
            content: text,
            suggestions: [
              "Clear advice",
              "Supportive messages",
              "Write apologies for me",
            ],
          },
        ];
      });
      scrollToBottom();
    } catch (error) {
      console.error("Error calling diary-chat function:", error);
      // 에러 메시지 표시
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            type: "ai",
            content:
              "Sorry, I'm having trouble connecting to the AI service right now.",
            suggestions: [
              "Clear advice",
              "Supportive messages",
              "Write apologies for me",
            ],
          },
        ];
      });
      scrollToBottom();
    }
  };

  const getModeFromSuggestion = (suggestion) => {
    if (suggestion === "Clear advice") return "clear_advice";
    if (suggestion === "Supportive messages") return "supportive_messages";
    if (suggestion === "Write apologies for me") return "write_apologies";
    return "free_chat";
  };

  // Handle button click - trigger API call with specific prompt type
  const handleSuggestionClick = async (suggestion, messageId) => {
    const selectedEntry = getSelectedEntry();

    // 클릭된 버튼 추적 (메시지 ID와 버튼 텍스트 조합)
    const buttonKey = `${messageId}-${suggestion}`;
    setClickedSuggestions((prev) => new Set([...prev, buttonKey]));

    // Add user message showing which button was clicked
    const userMessage = {
      id: Date.now(),
      type: "user",
      content: suggestion,
    };
    setMessages((prev) => [...prev, userMessage]);

    // Add loading message
    const loadingMessage = {
      id: Date.now() + 1,
      type: "ai",
      content: "Thinking...",
      isLoading: true,
    };
    setMessages((prev) => [...prev, loadingMessage]);

    try {
      const text = await invokeDiaryChat({
        mode: getModeFromSuggestion(suggestion),
        userMessage: suggestion,
        diaryEntry: selectedEntry,
      });

      try {
        await saveChatLog({
          entryId: selectedEntry?.id || null,
          mode: getModeFromSuggestion(suggestion),
          userMessage: suggestion,
          aiMessage: text,
        });
      } catch (logError) {
        console.error("Chat log save failed:", logError);
      }

      // Remove loading message and add response
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            type: "ai",
            content: text,
            suggestions: [
              "Clear advice",
              "Supportive messages",
              "Write apologies for me",
            ],
          },
        ];
      });
      scrollToBottom();
    } catch (error) {
      console.error("Error calling diary-chat function:", error);
      // Error message
      setMessages((prev) => {
        const filtered = prev.filter((msg) => !msg.isLoading);
        return [
          ...filtered,
          {
            id: Date.now() + 2,
            type: "ai",
            content:
              "Sorry, I'm having trouble connecting to the AI service right now.",
            suggestions: [
              "Clear advice",
              "Supportive messages",
              "Write apologies for me",
            ],
          },
        ];
      });
      scrollToBottom();
    }
  };

  // Get selected entry info for display
  const selectedEntry = getSelectedEntry();

  return (
    <div className="App">
      <div className="main-container chat-container">
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
            stroke="#ffffff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Diary entry selector */}
        {diaryEntries.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "20px",
              right: "20px",
              zIndex: 1000,
              background: "rgba(255, 255, 255, 0.1)",
              padding: "8px 12px",
              borderRadius: "8px",
              fontSize: "12px",
              color: "#ffffff",
            }}
          >
            {selectedEntry ? (
              <div>
                <div style={{ fontWeight: "bold", marginBottom: "4px" }}>
                  Reading: {selectedEntry.word || "Untitled"}
                </div>
                {selectedEntry.date && (
                  <div style={{ opacity: 0.8, fontSize: "11px" }}>
                    {selectedEntry.date}
                  </div>
                )}
              </div>
            ) : (
              <div>No entry selected</div>
            )}
          </div>
        )}

        {/* Chat messages */}
        <div className="chat-messages" ref={messagesContainerRef}>
          {messages.map((message) => (
            <div
              key={message.id}
              className={`chat-message ${
                message.type === "ai" ? "ai-message" : "user-message"
              }`}
            >
              {message.type === "ai" && (
                <div className="chat-avatar">
                  <svg
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="avatar-face"
                  >
                    <circle cx="12" cy="12" r="10" fill="#ffffff" />
                    <circle cx="9" cy="10" r="1.5" fill="#364c41" />
                    <circle cx="15" cy="10" r="1.5" fill="#364c41" />
                    <line
                      x1="9"
                      y1="14"
                      x2="15"
                      y2="14"
                      stroke="#364c41"
                      strokeWidth="2"
                      strokeLinecap="round"
                    />
                  </svg>
                </div>
              )}
              <div className="message-content">
                <div className="message-bubble">
                  {message.content.split("\n").map((line, index) => (
                    <div key={index}>{line}</div>
                  ))}
                  {message.suggestions && (
                    <div className="suggestions">
                      {message.suggestions.map((suggestion, index) => {
                        const buttonKey = `${message.id}-${suggestion}`;
                        const isClicked = clickedSuggestions.has(buttonKey);
                        return (
                          <button
                            key={index}
                            className={`suggestion-button ${
                              isClicked ? "clicked" : ""
                            }`}
                            onClick={() =>
                              handleSuggestionClick(suggestion, message.id)
                            }
                          >
                            {suggestion}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Input section */}
        <div className="chat-input-section">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && inputValue.trim()) {
                handleSend();
              }
            }}
            placeholder="Type a message..."
            className="chat-input"
          />
          <button
            className="send-button"
            onClick={handleSend}
            disabled={!inputValue.trim()}
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

export default ChatPage;
