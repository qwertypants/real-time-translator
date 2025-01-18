document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();

    // DOM elements
    const inputText = document.getElementById('inputText');
    const sourceText = document.getElementById('sourceText');
    const translationText = document.getElementById('translationText');
    const pronunciationGuide = document.getElementById('pronunciationGuide');
    const copySourceButton = document.getElementById('copySourceButton');
    const copyTranslationButton = document.getElementById('copyTranslationButton');
    const chineseVariantToggle = document.getElementById('chineseVariantToggle');
    const toggleLabel = document.getElementById('toggleLabel');
    const sourceCount = document.getElementById('sourceCount');
    const translationCount = document.getElementById('translationCount');
    const playSourceButton = document.getElementById('playSourceButton');
    const playTranslationButton = document.getElementById('playTranslationButton');

    let translateTimeout;
    let currentTarget = 'zh'; // Default to simplified Chinese
    let currentAudio = null;

    // Audio playback function
    async function playAudio(text, lang) {
        // Stop any currently playing audio
        if (currentAudio) {
            currentAudio.pause();
            currentAudio = null;
        }

        if (!text.trim()) return;

        try {
            // For English, use Web Speech API
            if (lang === 'en') {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = 'en-US';
                window.speechSynthesis.speak(utterance);
                return;
            }

            // For Chinese, use server-side TTS
            const response = await fetch('/speak', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    lang: lang === 'zh-TW' ? 'zh-tw' : 'zh-cn'
                })
            });

            if (!response.ok) throw new Error('Audio generation failed');

            const blob = await response.blob();
            const audioUrl = URL.createObjectURL(blob);
            currentAudio = new Audio(audioUrl);

            // Clean up after playback
            currentAudio.onended = () => {
                URL.revokeObjectURL(audioUrl);
                currentAudio = null;
            };

            currentAudio.play();
        } catch (error) {
            console.error('Audio playback failed:', error);
        }
    }

    // Update character counts
    function updateCharacterCount(text, countElement) {
        const count = text ? text.length : 0;
        countElement.textContent = `${count} characters`;
    }

    // Update toggle label
    function updateToggleLabel() {
        toggleLabel.textContent = currentTarget === 'zh' ? 'Simplified Chinese' : 'Traditional Chinese';
    }

    // Update source text immediately
    function updateSourceText(text) {
        sourceText.textContent = text || '';
        updateCharacterCount(text, sourceCount);
    }

    // Translation function
    async function translateText(text) {
        if (!text.trim()) {
            sourceText.textContent = '';
            translationText.textContent = '';
            pronunciationGuide.textContent = '';
            updateCharacterCount('', sourceCount);
            updateCharacterCount('', translationCount);
            return;
        }

        // Show loading state
        translationText.textContent = 'Translating...';
        pronunciationGuide.textContent = '';

        try {
            const response = await fetch('/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    text: text,
                    source: 'en',
                    target: currentTarget
                })
            });

            if (!response.ok) {
                throw new Error('Translation request failed');
            }

            const data = await response.json();
            if (data.error) {
                translationText.textContent = 'Translation error occurred';
                pronunciationGuide.textContent = '';
                console.error('Translation error:', data.error);
                return;
            }

            translationText.textContent = data.translation;
            pronunciationGuide.textContent = data.pronunciation;
            updateCharacterCount(data.translation, translationCount);
        } catch (error) {
            translationText.textContent = 'Translation service unavailable';
            pronunciationGuide.textContent = '';
            console.error('Translation request failed:', error);
        }
    }

    // Audio button handlers
    playSourceButton.addEventListener('click', function() {
        const text = sourceText.textContent;
        if (text) playAudio(text, 'en');
    });

    playTranslationButton.addEventListener('click', function() {
        const text = translationText.textContent;
        if (text) playAudio(text, currentTarget);
    });

    // Input event handler with debouncing
    inputText.addEventListener('input', function() {
        // Update source text immediately
        updateSourceText(this.value);

        // Debounce translation request
        clearTimeout(translateTimeout);
        translateTimeout = setTimeout(() => {
            translateText(this.value);
        }, 300); // Wait 300ms after last keystroke before translating
    });

    // Chinese variant toggle handler
    chineseVariantToggle.addEventListener('change', function() {
        currentTarget = this.checked ? 'zh-TW' : 'zh';
        updateToggleLabel();
        if (inputText.value.trim()) {
            translateText(inputText.value);
        }
    });

    // Copy button handlers
    copySourceButton.addEventListener('click', async function() {
        const textToCopy = sourceText.textContent;
        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            // Visual feedback
            copySourceButton.style.color = 'var(--primary-cyan)';
            setTimeout(() => {
                copySourceButton.style.color = 'var(--primary-black)';
            }, 1000);
        } catch (err) {
            console.error('Failed to copy source text:', err);
        }
    });

    copyTranslationButton.addEventListener('click', async function() {
        const textToCopy = translationText.textContent;
        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy);
            // Visual feedback
            copyTranslationButton.style.color = 'var(--primary-cyan)';
            setTimeout(() => {
                copyTranslationButton.style.color = 'var(--primary-black)';
            }, 1000);
        } catch (err) {
            console.error('Failed to copy translation text:', err);
        }
    });


    // Initialize toggle label and character counts
    updateToggleLabel();
    updateCharacterCount('', sourceCount);
    updateCharacterCount('', translationCount);
});