(() => {
    const addressCodes = [103, 101, 111, 64, 114, 101, 115, 101, 97, 114, 99, 104, 111, 112, 115, 46, 97, 105];
    const subject = "Research system design";

    for (const button of document.querySelectorAll("[data-email-contact]")) {
        button.addEventListener("click", () => {
            const address = String.fromCharCode(...addressCodes);
            window.location.href = `mailto:${address}?subject=${encodeURIComponent(subject)}`;
        });
    }
})();
