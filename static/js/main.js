document.addEventListener('DOMContentLoaded', function() {
    // Initialize Feather icons
    feather.replace();

    // DOM elements
    const inputText = document.getElementById('inputText');
    const sourceText = document.getElementById('sourceText');
    const translationText = document.getElementById('translationText');
    const copyButton = document.getElementById('copyButton');
    const chineseVariantToggle = document.getElementById('chineseVariantToggle');
    const toggleLabel = document.getElementById('toggleLabel');

    let translateTimeout;
    let currentTarget = 'zh'; // Default to simplified Chinese

    // Update toggle label
    function updateToggleLabel() {
        toggleLabel.textContent = currentTarget === 'zh' ? 'Simplified Chinese' : 'Traditional Chinese';
    }

    // Update source text immediately
    function updateSourceText(text) {
        sourceText.textContent = text || '';
    }

    // Translation function
    async function translateText(text) {
        if (!text.trim()) {
            sourceText.textContent = '';
            translationText.textContent = '';
            return;
        }

        // Show loading state
        translationText.textContent = 'Translating...';

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
                console.error('Translation error:', data.error);
                return;
            }

            translationText.textContent = data.translation;
        } catch (error) {
            translationText.textContent = 'Translation service unavailable';
            console.error('Translation request failed:', error);
        }
    }

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

    // Initialize toggle label
    updateToggleLabel();
});