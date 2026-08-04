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


    const { data, error } = await sb
        .from("announcements")
        .select("*")
        .eq("name", playerName)
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
        checkUnreadAnnouncements();
	listenForForceLogout();


    });

}


//Verify player login
async function verifyPlayerLogin() {

    const playerID = localStorage.getItem("playerID");

    if (!playerID) {
        window.location.href = "login.html";
        return false;
    }


    const { data: playerRow, error } = await sb
        .from("spellboundPlayers")
        .select("playerID, forceLogout")
        .eq("playerID", playerID)
        .single();


    if (error || !playerRow) {
        localStorage.clear();
        window.location.href = "login.html";
        return false;
    }

    if (playerRow.forceLogout === true) {

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
        .select("playerID, name")
        .order("name");

    if (error) {
        console.log(error);
        return;
    }

    data.forEach(player => {

        const option = document.createElement("option");

        option.value = player.playerID;
        option.textContent = player.name;

        select.appendChild(option);

    });

}


async function forceEveryoneLogout() {

    const { error } = await sb
        .from("spellboundPlayers")
        .update({
            forceLogout: true
        })
        .neq("playerID", "");


    if (error) {
        console.log("Logout error:", error);
        alert("Could not log everyone out.");
        return;
    }


    alert("Everyone has been logged out.");

}


function listenForForceLogout() {

    const playerID = localStorage.getItem("playerID");

    console.log("Force logout listener started for", playerID);

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

                console.log("Force logout received", payload);


                if (payload.new.forceLogout === true) {

                    localStorage.clear();

                    window.location.href = "login.html";

                }

            }
        )
        .subscribe();

}