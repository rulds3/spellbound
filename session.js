    	    const SUPABASE_URL = "https://ninumgueglotdpyewmhg.supabase.co";
       	    const SUPABASE_KEY = 				 "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5pbnVtZ3VlZ2xvdGRweWV3bWhnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODUzNjQ5NjcsImV4cCI6MjEwMDk0MDk2N30.CyBpEIcTWG9J9Ijx1q1Hh6ZEtX1r4t5UeQCA6BmplhM";
	    const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

//Announcements
let announcementChannel = null;
let forceLogoutChannel = null;

function listenForAnnouncements() {

const playerName = localStorage.getItem("playerName");

    if (!playerName) {
        return;
    }

    if (announcementChannel) {
        return;
    }


    announcementChannel = sb
.channel("player-announcements-" + playerName)
    .on(
        "postgres_changes",
        {
            event:"UPDATE",
            schema:"public",
            table:"announcements",
            filter:`name=eq.${playerName}`
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


    document.getElementById("popupTitle").innerHTML =
        announcement.title;


    document.getElementById("popupMessage").innerHTML =
        announcement.announcement;


    popup.style.display = "flex";


    const closeButton = document.getElementById("closeAnnouncement");


    if (closeButton) {

        closeButton.onclick = async function() {

            popup.style.display = "none";


            const { error } = await sb
                .from("announcements")
                .update({
                    read: true
                })
                .eq("id", announcement.id);


            if (error) {
                console.log(
                    "Could not mark announcement read:",
                    error
                );
            }

        };

    }

}

//Check for unread announcements
async function checkUnreadAnnouncements() {

    const playerName = localStorage.getItem("playerName");

    if (!playerName) {
        return;
    }


    // Only check once per login session
    if (sessionStorage.getItem("checkedAnnouncements")) {
        return;
    }


    sessionStorage.setItem(
        "checkedAnnouncements",
        "true"
    );


    const { data, error } = await sb
        .from("announcements")
        .select("id, title, announcement")
        .eq("name", playerName)
        .eq("sent", true)
        .eq("read", false)
        .order("id", { ascending: false })
        .limit(1);


    if (error) {
        console.log("Announcement check error:", error);
        return;
    }


    if (data && data.length > 0) {
        showAnnouncementPopup(data[0]);
    }

}


//Verify player login
async function verifyPlayerLogin() {

    const playerID = localStorage.getItem("playerID");

    if (!playerID) {
        window.location.href = "login.html";
        return false;
    }


    // Use cached player data first
    const cachedPlayer = localStorage.getItem("playerData");

    if (cachedPlayer) {

        const player = JSON.parse(cachedPlayer);

        if (player.forceLogout === true &&
            player.position?.toLowerCase() !== "admin") {

            localStorage.clear();
            window.location.href = "login.html";
            return false;
        }

        return true;
    }



    // First time only: get player from database
    const { data: playerRow, error } = await sb
        .from("spellboundPlayers")
        .select("playerID, name, position, forceLogout")
        .eq("playerID", playerID)
        .single();


    if (error || !playerRow) {

        localStorage.clear();
        window.location.href = "login.html";
        return false;
    }


    // Save player data for future pages
    localStorage.setItem(
        "playerData",
        JSON.stringify(playerRow)
    );


    if (playerRow.forceLogout === true &&
        playerRow.position?.toLowerCase() !== "admin") {

        localStorage.clear();
        window.location.href = "login.html";
        return false;
    }


    return true;
}

async function loadCharacters() {

    const select = document.getElementById("characterSelect");

    if (!select || select.options.length > 1) {
        return;
    }

    const { data, error } = await sb
        .from("spellboundPlayers")
        .select("playerID, name, position")
	.order("name");

    if (error) {
        console.log(error);
        return;
    }

data.sort((a, b) => {

    // Put Admin last
    if (a.position?.toLowerCase() === "admin") return 1;
    if (b.position?.toLowerCase() === "admin") return -1;

    // Everyone else alphabetically
    return a.name.localeCompare(b.name);

});


    data.forEach(player => {

        const option = document.createElement("option");

        option.value = player.playerID;
        option.textContent = player.name;

        select.appendChild(option);

    });

}


async function forceEveryoneLogout() {

    const confirmed = confirm(
        "Force all non-admin players to logout?"
    );

    if (!confirmed) {
        return;
    }


    // Get all players
    const { data: players, error: fetchError } = await sb
        .from("spellboundPlayers")
        .select("playerID, position");


    if (fetchError) {
        console.log("Player lookup error:", fetchError);
        alert("Could not find players.");
        return;
    }


    // Remove admins from the logout list
    const nonAdminIDs = players
        .filter(player => player.position?.toLowerCase() !== "admin")
        .map(player => player.playerID);


    if (nonAdminIDs.length === 0) {
        alert("No non-admin players found.");
        return;
    }


    // Force logout non-admins only
    const { error: logoutError } = await sb
        .from("spellboundPlayers")
        .update({
            forceLogout: true
        })
        .in("playerID", nonAdminIDs);


    if (logoutError) {
        console.log("Logout error:", logoutError);
        alert("Could not log players out.");
        return;
    }


    alert("All non-admin players have been logged out.");

}


function listenForForceLogout() {

    const playerID = localStorage.getItem("playerID");

    if (!playerID) {
        return;
    }

    if (forceLogoutChannel) {
        return;
    }

    forceLogoutChannel = sb
        .channel("player-force-logout-" + playerID)
        .on(
            "postgres_changes",
            {
                event: "UPDATE",
                schema: "public",
                table: "spellboundPlayers",
                filter: `playerID=eq.${playerID}`
            },
            payload => {

      if (
        payload.new.forceLogout === true &&
        localStorage.getItem("playerPosition")?.toLowerCase() !== "admin"
    ) {

        console.log("Logging this player out");

        localStorage.clear();
        window.location.href = "login.html";
    }

}
        )
        .subscribe();

}

if (document.getElementById("characterSelect")) {

    loadCharacters();

}
else {

    window.addEventListener("load", async () => {

        const loggedIn = await verifyPlayerLogin();

        if (!loggedIn) {
            return;
        }

        listenForAnnouncements();

        await checkUnreadAnnouncements();

        listenForForceLogout();

    });

async function checkAdmin() {

    const playerID = localStorage.getItem("playerID");

    if (!playerID) {
        window.location.href = "login.html";
        return false;
    }


    const { data, error } = await sb
        .from("spellboundPlayers")
        .select("position")
        .eq("playerID", playerID)
        .single();


    if (error || !data) {
        window.location.href = "index.html";
        return false;
    }


    if (data.position?.toLowerCase() !== "admin") {
        window.location.href = "index.html";
        return false;
    }


    return true;
}

}