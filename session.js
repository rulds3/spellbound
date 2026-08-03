    	    const SUPABASE_URL = "https://ninumgueglotdpyewmhg.supabase.co";
       	    const SUPABASE_KEY = 				 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbnVtZ3VlZ2xvdGRweWV3bWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjQ5NjcsImV4cCI6MjEwMDk0MDk2N30.CyBpEIcTWG9J9Ijx1q1Hh6ZEtX1r4t5UeQCA6BmplhM";
	    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let announcementChannel = null;

function listenForAnnouncements() {

    const playerID = sessionStorage.getItem("playerID");

    if (!playerID) {
        return;
    }

    if (announcementChannel) {
        return;
    }


    announcementChannel = sb
.channel("player-announcements-" + playerID)
    .on(
        "postgres_changes",
        {
            event:"UPDATE",
            schema:"public",
            table:"announcements",
            filter:`playerID=eq.${playerID}`
        },

        payload => {

            const announcement = payload.new;


            if (
                announcement.sent === true &&
                announcement.read === false
            ) {
                showAnnouncementPopup(announcement);
            }

        }

    )
    .subscribe();

}


function showAnnouncementPopup(announcement) {

    const popup = document.getElementById("announcementPopup");

    if (!popup) {
        return;
    }


    document.getElementById("popupTitle").textContent =
        announcement.title;

    document.getElementById("popupMessage").innerHTML =
        announcement.announcement;


    popup.style.display = "flex";


    const closeButton = document.getElementById("closeAnnouncement");


    if (closeButton) {

        closeButton.onclick = async function() {

    closeButton.disabled = true;

    popup.style.display = "none";

    const { error } = await sb
        .from("announcements")
        .update({
            read: true
        })
        .eq("id", announcement.id);

    if (error) {
        console.log("Could not mark announcement read:", error);
    }

};

    }

}

async function checkUnreadAnnouncements() {

    const playerID = sessionStorage.getItem("playerID");

    if (!playerID) {
        return;
    }


    const { data, error } = await sb
        .from("announcements")
        .select("*")
        .eq("playerID", playerID)
        .eq("sent", true)
        .eq("read", false)
        .order("id", { ascending: false })
        .limit(1);


    if (error) {
        console.log(error);
        return;
    }


    if (data && data.length > 0) {
        showAnnouncementPopup(data[0]);
    }

}

window.addEventListener("load", async () => {

    const loggedIn = await verifyPlayerLogin();

    if (!loggedIn) {
        return;
    }

    listenForAnnouncements();
    checkUnreadAnnouncements();

});

async function verifyPlayerLogin() {

    const playerID = sessionStorage.getItem("playerID");

    if (!playerID) {
        window.location.href = "login.html";
        return false;
    }


    const { data: playerRow, error } = await sb
        .from("spellboundPlayers")
        .select("playerID")
        .eq("playerID", playerID)
        .single();


    if (error || !playerRow) {
        sessionStorage.clear();
        window.location.href = "login.html";
        return false;
    }


    return true;
}






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

