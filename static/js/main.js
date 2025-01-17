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

    // Translation function
    async function translateText(text) {
        if (!text.trim()) {
            sourceText.textContent = '';
            translationText.textContent = '';
            return;
        }

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

            const data = await response.json();
            if (data.error) {
                console.error('Translation error:', data.error);
                return;
            }

            sourceText.textContent = data.source_text;
            translationText.textContent = data.translation;
        } catch (error) {
            console.error('Translation request failed:', error);
        }
    }

    // Input event handler with debouncing
    inputText.addEventListener('input', function() {
        clearTimeout(translateTimeout);
        translateTimeout = setTimeout(() => {
            translateText(this.value);
        }, 300);
    });

    // Chinese variant toggle handler
    chineseVariantToggle.addEventListener('change', function() {
        currentTarget = this.checked ? 'zh-TW' : 'zh';
        updateToggleLabel();
        if (inputText.value) {
            translateText(inputText.value);
        }
    });

    // Copy button handler
    copyButton.addEventListener('click', async function() {
        const textToCopy = `${sourceText.textContent}\n${translationText.textContent}`;
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
