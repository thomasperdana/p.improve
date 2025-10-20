/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { GoogleGenAI, Type } from "@google/genai";

// --- State ---
let userApiKey: string | null = null;
const API_KEY_STORAGE_KEY = 'gemini-api-key';

// --- DOM Element References ---
const originalPromptEl = document.getElementById('original-prompt') as HTMLTextAreaElement;
const improveButtonEl = document.getElementById('improve-button') as HTMLButtonElement;
const statusEl = document.getElementById('status') as HTMLParagraphElement;
const improvedPromptEl = document.getElementById('improved-prompt') as HTMLTextAreaElement;
const explanationEl = document.getElementById('explanation') as HTMLTextAreaElement;

const copyOriginalButtonEl = document.getElementById('copy-original-button') as HTMLButtonElement;
const copyImprovedButtonEl = document.getElementById('copy-improved-button') as HTMLButtonElement;
const copyExplanationButtonEl = document.getElementById('copy-explanation-button') as HTMLButtonElement;

// API Key Modal Elements
const settingsButtonEl = document.getElementById('settings-button') as HTMLButtonElement;
const apiKeyModalEl = document.getElementById('api-key-modal') as HTMLDivElement;
const closeModalButtonEl = document.getElementById('close-modal-button') as HTMLButtonElement;
const saveKeyButtonEl = document.getElementById('save-key-button') as HTMLButtonElement;
const apiKeyInputEl = document.getElementById('api-key-input') as HTMLInputElement;

/**
 * Initializes the application by setting up event listeners and loading the API key.
 */
function initializeApp() {
  improveButtonEl?.addEventListener('click', handleImproveClick);
  
  // Setup copy buttons
  copyOriginalButtonEl?.addEventListener('click', () => copyToClipboard(originalPromptEl, copyOriginalButtonEl));
  copyImprovedButtonEl?.addEventListener('click', () => copyToClipboard(improvedPromptEl, copyImprovedButtonEl));
  copyExplanationButtonEl?.addEventListener('click', () => copyToClipboard(explanationEl, copyExplanationButtonEl));

  // Setup API Key Modal listeners
  settingsButtonEl?.addEventListener('click', showApiKeyModal);
  closeModalButtonEl?.addEventListener('click', hideApiKeyModal);
  saveKeyButtonEl?.addEventListener('click', saveApiKey);
  apiKeyModalEl?.addEventListener('click', (e) => {
    if (e.target === apiKeyModalEl) {
      hideApiKeyModal();
    }
  });


  // Load API key from local storage
  userApiKey = localStorage.getItem(API_KEY_STORAGE_KEY);
  if (!userApiKey) {
    showApiKeyModal();
    statusEl.textContent = "Please set your Gemini API Key to begin.";
  }
  updateUiForApiKey();
}

// --- API Key Management ---

function showApiKeyModal() {
  apiKeyInputEl.value = userApiKey || '';
  apiKeyModalEl.classList.remove('hidden');
}

function hideApiKeyModal() {
  apiKeyModalEl.classList.add('hidden');
}

function saveApiKey() {
  const key = apiKeyInputEl.value.trim();
  if (key) {
    userApiKey = key;
    localStorage.setItem(API_KEY_STORAGE_KEY, key);
    statusEl.textContent = "API Key saved. You can now improve your prompts!";
    hideApiKeyModal();
  } else {
    userApiKey = null;
    localStorage.removeItem(API_KEY_STORAGE_KEY);
    statusEl.textContent = "API Key removed. Please set a key to continue.";
  }
  updateUiForApiKey();
}

function updateUiForApiKey() {
  improveButtonEl.disabled = !userApiKey;
}


/**
 * Copies text to the clipboard and provides visual feedback.
 * @param textarea The textarea element to copy from.
 * @param button The button element that was clicked.
 */
async function copyToClipboard(textarea: HTMLTextAreaElement, button: HTMLButtonElement) {
  if (!textarea.value || !button) return;

  try {
    await navigator.clipboard.writeText(textarea.value);
    
    const originalContent = button.innerHTML;
    button.innerHTML = '<span>Copied!</span>';
    button.disabled = true;

    setTimeout(() => {
      button.innerHTML = originalContent;
      button.disabled = false;
    }, 2000);
  } catch (err) {
    console.error('Failed to copy text: ', err);
  }
}

/**
 * Handles the click event for the "Improve" button.
 */
async function handleImproveClick() {
  if (!userApiKey) {
    statusEl.textContent = "Please set your API key in the settings first.";
    showApiKeyModal();
    return;
  }

  const originalPrompt = originalPromptEl.value?.trim();
  if (!originalPrompt) {
    statusEl.textContent = "Please enter a prompt first.";
    return;
  }

  setLoadingState(true);
  clearOutputs();
  statusEl.textContent = "Optimizing with AI...";

  try {
    const ai = new GoogleGenAI({ apiKey: userApiKey });
    
    const responseSchema = {
      type: Type.OBJECT,
      properties: {
        improvedPrompt: { type: Type.STRING, description: "The rewritten, improved prompt." },
        explanation: { type: Type.STRING, description: "A brief explanation of why the new prompt is better." },
      },
      required: ["improvedPrompt", "explanation"],
    };

    const result = await ai.models.generateContent({
      model: 'gemini-2.5-pro',
      contents: {
        parts: [{
          text: `You are an expert prompt engineer. Your task is to rewrite the following user-provided prompt to be more effective for a large language model. Provide the improved prompt and a brief explanation of why your version is better. The user's prompt is: "${originalPrompt}"`
        }]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: responseSchema,
      },
    });

    const parsedResponse = JSON.parse(result.text);
    
    if (parsedResponse.improvedPrompt && parsedResponse.explanation) {
      improvedPromptEl.value = parsedResponse.improvedPrompt;
      explanationEl.value = parsedResponse.explanation;
      statusEl.textContent = "Prompt improved successfully!";
    } else {
      throw new Error("Invalid response format from the AI.");
    }
  } catch (error) {
    console.error("Error improving prompt:", error);
    if (error.message.includes('API key not valid')) {
       statusEl.textContent = "Your API Key is not valid. Please check it in settings.";
       showApiKeyModal();
    } else {
       statusEl.textContent = "An error occurred. Please check the console and try again.";
    }
    explanationEl.value = `Error Details: ${error.message}`;
  } finally {
    setLoadingState(false);
  }
}

/**
 * Sets the loading state of the UI.
 * @param isLoading - Whether the application is in a loading state.
 */
function setLoadingState(isLoading: boolean) {
  improveButtonEl.disabled = isLoading;
  improveButtonEl.innerHTML = isLoading 
    ? `<span>Improving...</span>` 
    : 'Improve Prompt';
}

/**
 * Clears the output text areas.
 */
function clearOutputs() {
  improvedPromptEl.value = '';
  explanationEl.value = '';
}

// Start the application once the DOM is fully loaded.
document.addEventListener('DOMContentLoaded', initializeApp);