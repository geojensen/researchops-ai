const scriptURL = 'https://script.google.com/macros/s/AKfycbxyvQrcrG1dtGtK4W873-BMkIWrpBM-p0SxXjzH2T7igJ2MDD4DnJaI4CHA1nPuWg0fUQ/exec'

const form = document.forms['contact-form'];
const submitButton = document.getElementById("submit");
const loading = document.getElementById("loading");

function showLoading() {
    submitButton.disabled = true;
    submitButton.style.display = "none";
        loading.style.display = "flex";
}

function hideLoading() {
    submitButton.disabled = false;
    submitButton.style.display = "flex";
    loading.style.display = "none";
}

function EndMessage() {
    var form = document.getElementById("form");
    var responce = document.getElementById("responce");

    form.style.display = "none";
    responce.style.display = "flex";
    hideLoading(); // Hide loading animation when results are received
}

form.addEventListener('submit', e => {
    e.preventDefault();
showLoading(); // Show loading animation when form is submitted
fetch(scriptURL, { method: 'POST', body: new FormData(form) })
    .then(response => EndMessage())
.catch(error => {
    hideLoading(); // Hide loading animation if there's an error
console.error('Error!', error.message);
});
});