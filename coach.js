/* =========================================
   TWETE COACH DASHBOARD
========================================= */


/*
    Example athlete data.

    Later this will come from the
    athlete database/backend.
*/

const athletes = [

    {
        name: "David Gitonga",
        goal: "10 km — 30:30",
        pb: "31:20",
        endDate: "2026-08-21",
        progress: 65
    },

    {
        name: "Joy Chepkemoi",
        goal: "5 km — 15:00",
        pb: "15:22",
        endDate: "2026-08-27",
        progress: 78
    },

    {
        name: "Daniel Kipyego",
        goal: "Half Marathon — 1:08:00",
        pb: "1:09:15",
        endDate: "2026-09-04",
        progress: 40
    },

    {
        name: "Mercy Njeri",
        goal: "10 km — 32:00",
        pb: "33:10",
        endDate: "2026-09-16",
        progress: 20
    },

    {
        name: "Victor Cheruiyot",
        goal: "Marathon — 2:18:00",
        pb: "2:19:45",
        endDate: "2026-10-05",
        progress: 55
    }

];


/* =========================================
   DATE
========================================= */

function updateDate() {

    const dateElement =
        document.getElementById("currentDate");

    const today = new Date();

    dateElement.textContent =
        today.toLocaleDateString(
            "en-US",
            {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric"
            }
        );

}


/* =========================================
   DAYS UNTIL PROGRAM END
========================================= */

function daysUntil(dateString) {

    const today = new Date();

    today.setHours(0, 0, 0, 0);

    const end =
        new Date(dateString);

    end.setHours(0, 0, 0, 0);

    const difference =
        end - today;

    return Math.ceil(
        difference /
        (1000 * 60 * 60 * 24)
    );

}


/* =========================================
   FORMAT DATE
========================================= */

function formatDate(dateString) {

    const date =
        new Date(dateString);

    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

}


/* =========================================
   CREATE ATHLETE CARD
========================================= */

function createAthleteCard(athlete) {

    const days =
        daysUntil(athlete.endDate);


    let urgencyClass = "";

    if (days <= 7) {
        urgencyClass = "warning";
    }

    if (days <= 3) {
        urgencyClass = "urgent";
    }


    let dayText;

    if (days < 0) {

        dayText =
            "Program expired";

    } else if (days === 0) {

        dayText =
            "Ends today";

    } else if (days === 1) {

        dayText =
            "1 day remaining";

    } else {

        dayText =
            days + " days remaining";

    }


    const card =
        document.createElement("article");

    card.className =
        "ending-athlete " +
        urgencyClass;


    card.innerHTML = `

        <div class="athlete-main">

            <div class="athlete-photo"></div>

            <div>

                <h3>
                    ${athlete.name}
                </h3>

                <div class="athlete-goal">
                    ${athlete.goal}
                </div>

                <div class="athlete-pb">
                    PB: ${athlete.pb}
                </div>

            </div>

        </div>


        <div class="program-end">

            <span>
                Program ends
            </span>

            <div class="program-date">
                ${formatDate(athlete.endDate)}
            </div>

            <span class="days-badge ${urgencyClass}">
                ◷ ${dayText}
            </span>

        </div>


        <div class="progress-area">

            <span>
                Progress
            </span>

            <div
                class="progress-circle"
                style="--progress: ${athlete.progress}%"
            >

                <strong>
                    ${athlete.progress}%
                </strong>

            </div>

        </div>


        <button
            class="edit-program"
            onclick="editAthlete('${athlete.name}')"
        >
            Edit Program
            <span>›</span>
        </button>

    `;


    return card;

}


/* =========================================
   LOAD ENDING ATHLETES
========================================= */

function loadEndingAthletes() {

    const container =
        document.getElementById(
            "endingAthletes"
        );


    container.innerHTML = "";


    /*
        Sort by program ending date.

        The athlete whose program ends
        first appears at the top.
    */

    const sorted =
        [...athletes].sort(
            function(a, b) {

                return new Date(a.endDate)
                    -
                    new Date(b.endDate);

            }
        );


    sorted.forEach(
        function(athlete) {

            const card =
                createAthleteCard(
                    athlete
                );

            container.appendChild(card);

        }
    );

}


/* =========================================
   DASHBOARD NUMBERS
========================================= */

function updateDashboardNumbers() {

    document.getElementById(
        "athleteCount"
    ).textContent =
        12;


    document.getElementById(
        "activePrograms"
    ).textContent =
        10;


    const endingSoon =
        athletes.filter(
            function(athlete) {

                const days =
                    daysUntil(
                        athlete.endDate
                    );

                return days >= 0 &&
                       days <= 7;

            }
        );


    document.getElementById(
        "endingPrograms"
    ).textContent =
        endingSoon.length;


    document.getElementById(
        "noProgram"
    ).textContent =
        0;

}


/* =========================================
   EDIT ATHLETE PROGRAM
========================================= */

function editAthlete(name) {

    /*
        Later this will open:

        coach-athlete.html?athlete=David%20Gitonga

        where you can edit the athlete's
        complete training program.
    */

    const encoded =
        encodeURIComponent(name);


    window.location.href =
        "coach-athlete.html?athlete=" +
        encoded;

}


/* =========================================
   SIDEBAR
========================================= */

function showDashboard() {

    window.location.href =
        "coach.html";

}


function openAthletes() {

    window.location.href =
        "coach-athletes.html";

}


function openMessages() {

    window.location.href =
        "coach-messages.html";

}


function openPrograms() {

    window.location.href =
        "coach-programs.html";

}


function openCalendar() {

    window.location.href =
        "coach-calendar.html";

}


function openAnalytics() {

    window.location.href =
        "coach-analytics.html";

}


function openSettings() {

    window.location.href =
        "coach-settings.html";

}


/* =========================================
   ACTIVITY
========================================= */

function viewAllActivity() {

    alert(
        "Activity page will be added next."
    );

}


/* =========================================
   LOGOUT
========================================= */

function logout() {

    const confirmed =
        confirm(
            "Do you want to log out?"
        );


    if (!confirmed) {
        return;
    }


    localStorage.removeItem(
        "strideLabRole"
    );


    window.location.href =
        "index.html";

}


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        updateDate();

        loadEndingAthletes();

        updateDashboardNumbers();

    }
);
