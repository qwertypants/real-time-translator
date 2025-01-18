document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();

    // DOM elements
    const inputText = document.getElementById('inputText');
    const sourceText = document.getElementById('sourceText');
    const translationText = document.getElementById('translationText');
    const pronunciationGuide = document.getElementById('pronunciationGuide');
    const copyButton = document.getElementById('copyButton');
    const chineseVariantToggle = document.getElementById('chineseVariantToggle');
    const toggleLabel = document.getElementById('toggleLabel');
    const sourceCount = document.getElementById('sourceCount');
    const translationCount = document.getElementById('translationCount');
    const playSourceButton = document.getElementById('playSourceButton');
    const playTranslationButton = document.getElementById('playTranslationButton');
    const shareButton = document.getElementById('shareButton');
    const shareModal = new bootstrap.Modal(document.getElementById('shareModal'));
    const shareUrl = document.getElementById('shareUrl');
    const copyShareButton = document.getElementById('copyShareButton');

    let translateTimeout;
    let currentTarget = 'zh'; // Default to simplified Chinese
    let currentAudio = null;

    // Check for shared translation data
    const sharedData = {{ shared_data | tojson | safe if shared_data else 'null' }};
    if (sharedData) {
        inputText.value = sharedData.source_text;
        sourceText.textContent = sharedData.source_text;
        translationText.textContent = sharedData.translation;
        pronunciationGuide.textContent = sharedData.pronunciation;
        updateCharacterCount(sharedData.source_text, sourceCount);
        updateCharacterCount(sharedData.translation, translationCount);
    }

    // Share button handler
    shareButton.addEventListener('click', async function() {
        const text = sourceText.textContent;
        const translation = translationText.textContent;
        const pronunciation = pronunciationGuide.textContent;

        if (!text || !translation) return;

        try {
            const response = await fetch('/share', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    source_text: text,
                    translation: translation,
                    pronunciation: pronunciation
                })
            });

            if (!response.ok) throw new Error('Share request failed');

            const data = await response.json();
            shareUrl.value = data.share_url;
            shareModal.show();
        } catch (error) {
            console.error('Share failed:', error);
        }
    });

    // Copy share URL button handler
    copyShareButton.addEventListener('click', async function() {
        try {
            await navigator.clipboard.writeText(shareUrl.value);
            copyShareButton.innerHTML = '<i data-feather="check"></i> Copied!';
            feather.replace();
            setTimeout(() => {
                copyShareButton.innerHTML = '<i data-feather="copy"></i> Copy';
                feather.replace();
            }, 2000);
        } catch (err) {
            console.error('Failed to copy URL:', err);
        }
    });

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

    // Copy button handler
    copyButton.addEventListener('click', async function() {
        const textToCopy = sourceText.textContent && translationText.textContent ?
            `${sourceText.textContent}\n${translationText.textContent}` : '';

        if (!textToCopy) return;

        try {
            await navigator.clipboard.writeText(textToCopy);

            // Visual feedback
            copyButton.style.color = 'var(--primary-cyan)';
            setTimeout(() => {
                copyButton.style.color = 'var(--primary-black)';
            }, 1000);
        } catch (err) {
            console.error('Failed to copy text:', err);
        }
    });

    // Initialize toggle label and character counts
    updateToggleLabel();
    updateCharacterCount('', sourceCount);
    updateCharacterCount('', translationCount);
});