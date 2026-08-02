// 30 minutes in milliseconds
const SESSION_TIMEOUT = 30 * 60 * 1000;

let logoutTimer;

function logout() {
    sessionStorage.clear();
    alert("You have been logged out due to inactivity.");
    window.location.href = "login.html";
}

function resetLogoutTimer() {
    clearTimeout(logoutTimer);
    logoutTimer = setTimeout(logout, SESSION_TIMEOUT);
}

// Reset timer whenever the player interacts with the page
document.addEventListener("click", resetLogoutTimer);
document.addEventListener("touchstart", resetLogoutTimer);
document.addEventListener("keydown", resetLogoutTimer);
document.addEventListener("mousemove", resetLogoutTimer);

// Start the timer
resetLogoutTimer();