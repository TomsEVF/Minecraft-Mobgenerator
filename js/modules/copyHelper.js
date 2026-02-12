// Copy-Button mit visuellem Feedback

export function setupCopyButton(buttonId, outputId) {
    const btn = document.getElementById(buttonId);
    const output = document.getElementById(outputId);

    btn.addEventListener('click', async () => {
        try {
            await navigator.clipboard.writeText(output.value);
            btn.textContent = '✅ Kopiert!';
            setTimeout(() => { btn.textContent = '📋 Kopieren'; }, 2000);
        } catch {
            output.select();
            document.execCommand('copy');
            alert('In Zwischenablage kopiert!');
        }
    });
}