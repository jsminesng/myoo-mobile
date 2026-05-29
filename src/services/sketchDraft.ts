let currentSketchDraft: string | null = null;

export const setSketchDraft = (sketch: string | undefined) => {
  currentSketchDraft = sketch || null;
};

export const getSketchDraft = () => currentSketchDraft;

export const clearSketchDraft = () => {
  currentSketchDraft = null;
};
