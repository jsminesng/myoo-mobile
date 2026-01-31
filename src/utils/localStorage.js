// 로컬스토리지에 DiaryEntry 저장/불러오기 유틸리티

const STORAGE_KEY = "diaryEntries";

// localStorage 사용 가능 여부 확인
const isLocalStorageAvailable = () => {
  try {
    const test = "__localStorage_test__";
    localStorage.setItem(test, test);
    localStorage.removeItem(test);
    return true;
  } catch (e) {
    console.error("localStorage is not available:", e);
    return false;
  }
};

// File을 base64로 변환
export const fileToBase64 = (file) => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("No file provided"));
      return;
    }

    try {
      const reader = new FileReader();
      reader.onload = () => {
        if (reader.result) {
          resolve(reader.result);
        } else {
          reject(new Error("FileReader returned no result"));
        }
      };
      reader.onerror = (error) => {
        console.error("FileReader error:", error);
        reject(
          new Error(
            "Failed to read file: " + (error.message || "Unknown error")
          )
        );
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Error creating FileReader:", error);
      reject(new Error("Failed to create FileReader: " + error.message));
    }
  });
};

// DiaryEntry 저장
export const saveDiaryEntry = async (entry) => {
  try {
    // localStorage 사용 가능 여부 확인
    if (!isLocalStorageAvailable()) {
      throw new Error(
        "localStorage is not available. Please check your browser settings."
      );
    }

    console.log("Saving diary entry:", entry);
    let entries = getDiaryEntries();
    console.log("Existing entries count:", entries.length);

    // media 파일 크기 체크 및 압축 (이미지인 경우)
    let processedMedia = entry.media;
    if (entry.media) {
      const maxFileSize = 2 * 1024 * 1024; // 2MB 제한
      if (entry.media.size > maxFileSize) {
        console.log("File too large, compressing...", entry.media.size);
        if (entry.media.type.startsWith("image/")) {
          processedMedia = await compressImage(entry.media);
          console.log("Compressed file size:", processedMedia.size);
        } else {
          throw new Error(
            `파일 크기가 너무 큽니다 (${Math.round(
              entry.media.size / 1024 / 1024
            )}MB). 2MB 이하의 파일을 사용해주세요.`
          );
        }
      }
    }

    // media 파일이 있으면 base64로 변환
    let mediaBase64 = null;
    if (processedMedia) {
      console.log("Converting media to base64...");
      mediaBase64 = await fileToBase64(processedMedia);
      console.log("Media converted, size:", mediaBase64?.length);
    }

    const diaryEntry = {
      id: entry.id || Date.now().toString(),
      date: entry.date,
      word: entry.word,
      feeling: entry.feeling, // 이미 base64 이미지
      note: entry.note || "",
      media: mediaBase64,
      mediaType: processedMedia ? processedMedia.type : null, // 이미지인지 비디오인지 구분
    };

    entries.push(diaryEntry);

    // JSON 직렬화 시도
    let serialized;
    try {
      serialized = JSON.stringify(entries);
      console.log("Serialized data size:", serialized.length);
    } catch (serializeError) {
      console.error("JSON.stringify failed:", serializeError);
      throw new Error(
        "Failed to serialize diary entry: " + serializeError.message
      );
    }

    // localStorage 용량 체크 (대략적인 추정)
    const estimatedSize = serialized.length;
    const maxSize = 4 * 1024 * 1024; // 4MB (안전 마진 포함)

    // 용량 초과 시 오래된 항목 삭제
    if (estimatedSize > maxSize) {
      console.warn(
        "Warning: Data size exceeds limit, freeing up space...",
        estimatedSize
      );
      entries = freeUpSpace(maxSize * 0.8); // 80% 수준으로 유지
      serialized = JSON.stringify(entries);
      console.log("After cleanup, size:", serialized.length);
    }

    // localStorage에 저장 시도
    try {
      localStorage.setItem(STORAGE_KEY, serialized);
      console.log("Successfully saved to localStorage");

      // 저장 확인
      const verify = localStorage.getItem(STORAGE_KEY);
      if (!verify) {
        throw new Error("Storage verification failed - data was not saved");
      }
      console.log("Storage verified successfully");
    } catch (storageError) {
      console.error("localStorage.setItem failed:", storageError);

      // QuotaExceededError 처리 - 오래된 항목 삭제 후 재시도
      if (
        storageError.name === "QuotaExceededError" ||
        storageError.code === 22
      ) {
        console.log("Quota exceeded, attempting to free up space...");
        entries = freeUpSpace(maxSize * 0.7); // 더 많이 삭제
        serialized = JSON.stringify(entries);

        try {
          localStorage.setItem(STORAGE_KEY, serialized);
          console.log("Successfully saved after cleanup");
        } catch (retryError) {
          throw new Error(
            "저장 공간이 부족합니다. 일부 항목을 삭제한 후 다시 시도해주세요."
          );
        }
      } else {
        throw new Error(
          "Failed to save to localStorage: " + storageError.message
        );
      }
    }

    return diaryEntry;
  } catch (error) {
    console.error("Error saving diary entry:", error);
    throw error;
  }
};

// 모든 DiaryEntry 불러오기
export const getDiaryEntries = () => {
  try {
    if (!isLocalStorageAvailable()) {
      console.warn("localStorage is not available");
      return [];
    }
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error("Error loading diary entries:", error);
    return [];
  }
};

// 특정 ID의 DiaryEntry 삭제
export const deleteDiaryEntry = (id) => {
  try {
    if (!isLocalStorageAvailable()) {
      throw new Error("localStorage is not available");
    }
    const entries = getDiaryEntries();
    const filtered = entries.filter((entry) => entry.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (error) {
    console.error("Error deleting diary entry:", error);
    throw error;
  }
};

// 모든 DiaryEntry 삭제
export const clearDiaryEntries = () => {
  try {
    if (!isLocalStorageAvailable()) {
      console.warn("localStorage is not available");
      return;
    }
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing diary entries:", error);
  }
};

// 오래된 항목들을 삭제하여 공간 확보 (가장 오래된 것부터 삭제)
const freeUpSpace = (targetSize) => {
  const entries = getDiaryEntries();
  if (entries.length === 0) return [];

  // 날짜순으로 정렬 (오래된 것부터)
  const sortedEntries = [...entries].sort((a, b) => {
    const dateA = a.date ? new Date(a.date.replace(/\./g, "-")) : new Date(0);
    const dateB = b.date ? new Date(b.date.replace(/\./g, "-")) : new Date(0);
    return dateA - dateB;
  });

  let currentSize = JSON.stringify(entries).length;
  const entriesToKeep = [];

  // 최신 항목부터 유지하면서 용량 체크
  for (let i = sortedEntries.length - 1; i >= 0; i--) {
    const testEntries = [...entriesToKeep, sortedEntries[i]];
    const testSize = JSON.stringify(testEntries).length;

    if (testSize <= targetSize) {
      entriesToKeep.unshift(sortedEntries[i]);
    } else {
      console.log(
        `Removing old entry to free up space: ${sortedEntries[i].date}`
      );
      break;
    }
  }

  return entriesToKeep;
};

// 이미지 압축 (선택사항)
const compressImage = (file, maxWidth = 1920, quality = 0.8) => {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      resolve(file); // 이미지가 아니면 그대로 반환
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // 크기 조정
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);

        canvas.toBlob(
          (blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: file.type,
                lastModified: Date.now(),
              });
              resolve(compressedFile);
            } else {
              resolve(file);
            }
          },
          file.type,
          quality
        );
      };
      img.onerror = () => resolve(file);
      img.src = e.target.result;
    };
    reader.onerror = () => resolve(file);
    reader.readAsDataURL(file);
  });
};
