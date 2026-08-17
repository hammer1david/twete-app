/* =========================================
   TWETE COACH DASHBOARD
   REAL SUPABASE ATHLETE DATA
========================================= */


/* =========================================
   SUPABASE
========================================= */

const COACH_SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const COACH_SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";


const coachSupabase =
    window.supabase.createClient(
        COACH_SUPABASE_URL,
        COACH_SUPABASE_KEY
    );


/* =========================================
   IMPORTANT
   FOR NOW WE ONLY SHOW THIS ATHLETE
========================================= */

const TARGET_ATHLETE_EMAIL =
    "gitonga.hammer@gmail.com";


/* =========================================
   DATA
========================================= */

let athlete = null;

let programs = [];


/* =========================================
   DATE
========================================= */

function updateDate() {

    const element =
        document.getElementById(
            "currentDate"
        );

    if (!element) {
        return;
    }


    const today =
        new Date();


    element.textContent =
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
   INITIALS
========================================= */

function getInitials(name) {

    if (!name) {
        return "A";
    }


    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            function(part) {
                return part.charAt(0);
            }
        )
        .join("")
        .toUpperCase();

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(value) {

    return String(
        value ?? ""
    )
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");

}


/* =========================================
   LOAD ATHLETE
========================================= */

async function loadAthlete() {

    const grid =
        document.getElementById(
            "athleteSelectionGrid"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = `
        <div class="loading-athletes">
            Loading athlete...
        </div>
    `;


    /*
       IMPORTANT:

       The email is stored in profiles.email,
       so we search for the real account.
    */

    const {
        data,
        error
    } =
        await coachSupabase
            .from("profiles")
            .select(`
                id,
                email,
                full_name,
                avatar_url,
                country,
                discipline,
                preferred_distance,
                experience_level,
                role
            `)
            .eq(
                "email",
                TARGET_ATHLETE_EMAIL
            )
            .eq(
                "role",
                "athlete"
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Athlete loading error:",
            error
        );


        grid.innerHTML = `
            <div class="empty-athletes database-error">

                Could not load the athlete.

                <br><br>

                ${escapeHtml(error.message)}

            </div>
        `;

        return;
    }


    if (!data) {

        grid.innerHTML = `
            <div class="empty-athletes">

                No athlete account was found for:

                <br><br>

                <strong>
                    ${TARGET_ATHLETE_EMAIL}
                </strong>

            </div>
        `;

        document.getElementById(
            "athleteCount"
        ).textContent = "0";

        return;
    }


    athlete = data;


    document.getElementById(
        "athleteCount"
    ).textContent = "1";


    renderAthlete();


    await loadPrograms();

}


/* =========================================
   RENDER ATHLETE
========================================= */

function renderAthlete() {

    const grid =
        document.getElementById(
            "athleteSelectionGrid"
        );


    if (!grid || !athlete) {
        return;
    }


    const name =
        athlete.full_name ||
        "Unnamed athlete";


    const details = [

        athlete.discipline,

        athlete.preferred_distance,

        athlete.experience_level

    ]
        .filter(Boolean)
        .join(" • ");


    let avatar;


    if (athlete.avatar_url) {

        avatar = `

            <img
                class="selection-avatar"
                src="${escapeHtml(
                    athlete.avatar_url
                )}"
                alt="${escapeHtml(name)}"
            >

        `;

    } else {

        avatar = `

            <div
                class="
                    selection-avatar
                    selection-avatar-placeholder
                "
            >

                ${escapeHtml(
                    getInitials(name)
                )}

            </div>

        `;

    }


    grid.innerHTML = `

        <article
            class="athlete-selection-card"
            onclick="selectAthlete()"
        >

            ${avatar}


            <div class="selection-info">

                <h3>
                    ${escapeHtml(name)}
                </h3>


                <p>
                    ${escapeHtml(
                        details ||
                        "Athlete"
                    )}
                </p>


                <div class="selection-email">

                    ${escapeHtml(
                        athlete.email
                    )}

                </div>

            </div>


            <div class="selection-arrow">
                ›
            </div>

        </article>

    `;


    setupSearch();

}


/* =========================================
   SEARCH
========================================= */

function setupSearch() {

    const search =
        document.getElementById(
            "athleteSearch"
        );


    if (!search) {
        return;
    }


    search.addEventListener(
        "input",
        function() {

            if (!athlete) {
                return;
            }


            const query =
                search.value
                    .trim()
                    .toLowerCase();


            const name =
                (
                    athlete.full_name ||
                    ""
                ).toLowerCase();


            const email =
                (
                    athlete.email ||
                    ""
                ).toLowerCase();


            const grid =
                document.getElementById(
                    "athleteSelectionGrid"
                );


            if (
                name.includes(query) ||
                email.includes(query)
            ) {

                renderAthlete();

            } else {

                grid.innerHTML = `

                    <div class="empty-athletes">

                        No athlete found.

                    </div>

                `;

            }

        }
    );

}


/* =========================================
   SELECT ATHLETE
========================================= */

function selectAthlete() {

    if (!athlete) {
        return;
    }


    /*
       We use the UUID.

       This is much safer than passing
       the athlete's name.
    */

    const athleteId =
        encodeURIComponent(
            athlete.id
        );


    window.location.href =
        "coach-athlete.html?athlete_id=" +
        athleteId;

}


/* =========================================
   LOAD PROGRAMS
========================================= */

async function loadPrograms() {

    if (!athlete) {
        return;
    }


    const {
        data,
        error
    } =
        await coachSupabase
            .from("programs")
            .select(`
                id,
                athlete_id,
                name,
                start_date,
                end_date,
                status
            `)
            .eq(
                "athlete_id",
                athlete.id
            )
            .order(
                "end_date",
                {
                    ascending: true,
                    nullsFirst: false
                }
            );


    if (error) {

        console.error(
            "Program loading error:",
            error
        );

        programs = [];

    } else {

        programs =
            data || [];

    }


    updateProgramNumbers();

    renderEndingPrograms();

}


/* =========================================
   UPDATE DASHBOARD NUMBERS
========================================= */

function updateProgramNumbers() {

    const active =
        programs.filter(
            function(program) {

                return program.status ===
                    "active";

            }
        );


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    const ending =
        active.filter(
            function(program) {

                if (!program.end_date) {
                    return false;
                }


                const end =
                    new Date(
                        program.end_date
                    );


                end.setHours(
                    0,
                    0,
                    0,
                    0
                );


                const days =
                    Math.ceil(
                        (
                            end - today
                        ) /
                        86400000
                    );


                return (
                    days >= 0 &&
                    days <= 7
                );

            }
        );


    document.getElementById(
        "activePrograms"
    ).textContent =
        active.length;


    document.getElementById(
        "endingPrograms"
    ).textContent =
        ending.length;


    document.getElementById(
        "noProgram"
    ).textContent =
        active.length === 0
            ? "1"
            : "0";

}


/* =========================================
   DAYS UNTIL
========================================= */

function daysUntil(
    dateString
) {

    if (!dateString) {
        return null;
    }


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    const end =
        new Date(
            dateString
        );


    end.setHours(
        0,
        0,
        0,
        0
    );


    return Math.ceil(
        (
            end - today
        ) /
        86400000
    );

}


/* =========================================
   FORMAT DATE
========================================= */

function formatDate(
    dateString
) {

    if (!dateString) {
        return "No end date";
    }


    return new Date(
        dateString
    ).toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

}


/* =========================================
   RENDER ENDING PROGRAMS
========================================= */

function renderEndingPrograms() {

    const container =
        document.getElementById(
            "endingAthletes"
        );


    if (!container) {
        return;
    }


    const ending =
        programs.filter(
            function(program) {

                const days =
                    daysUntil(
                        program.end_date
                    );


                return (
                    program.status ===
                    "active" &&
                    days !== null &&
                    days >= 0 &&
                    days <= 7
                );

            }
        );


    if (!ending.length) {

        container.innerHTML = `

            <div class="empty-athletes">

                No programs are ending within
                the next 7 days.

            </div>

        `;

        return;
    }


    container.innerHTML =
        ending
            .map(
                function(program) {

                    const days =
                        daysUntil(
                            program.end_date
                        );


                    const urgency =
                        days <= 3
                            ? "urgent"
                            : "warning";


                    const dayText =
                        days === 0
                            ? "Ends today"
                            : days === 1
                                ? "1 day remaining"
                                : `${days} days remaining`;


                    return `

                        <article
                            class="
                                ending-athlete
                                ${urgency}
                            "
                        >

                            <div class="athlete-main">

                                ${
                                    athlete.avatar_url

                                    ?

                                    `
                                    <img
                                        class="selection-avatar"
                                        src="${escapeHtml(
                                            athlete.avatar_url
                                        )}"
                                        alt=""
                                    >
                                    `

                                    :

                                    `
                                    <div
                                        class="
                                            selection-avatar
                                            selection-avatar-placeholder
                                        "
                                    >
                                        ${escapeHtml(
                                            getInitials(
                                                athlete.full_name
                                            )
                                        )}
                                    </div>
                                    `
                                }


                                <div>

                                    <h3>
                                        ${escapeHtml(
                                            athlete.full_name
                                        )}
                                    </h3>


                                    <div class="athlete-goal">

                                        ${escapeHtml(
                                            program.name ||
                                            "Training Program"
                                        )}

                                    </div>


                                    <div class="athlete-pb">

                                        ${
                                            escapeHtml(
                                                athlete.email
                                            )
                                        }

                                    </div>

                                </div>

                            </div>


                            <div class="program-end">

                                <span>
                                    Program ends
                                </span>


                                <div class="program-date">

                                    ${formatDate(
                                        program.end_date
                                    )}

                                </div>


                                <span
                                    class="
                                        days-badge
                                        ${urgency}
                                    "
                                >

                                    ◷
                                    ${dayText}

                                </span>

                            </div>


                            <div class="progress-area">

                                <span>
                                    Status
                                </span>

                                <strong>
                                    Active
                                </strong>

                            </div>


                            <button
                                class="edit-program"
                                onclick="selectAthlete()"
                            >

                                Open Athlete

                                <span>
                                    ›
                                </span>

                            </button>

                        </article>

                    `;

                }
            )
            .join("");

}


/* =========================================
   COACH PROFILE
========================================= */

async function loadCoachProfile() {

    const {
        data: {
            user
        }
    } =
        await coachSupabase.auth
            .getUser();


    if (!user) {
        return;
    }


    const {
        data,
        error
    } =
        await coachSupabase
            .from("profiles")
            .select(`
                full_name,
                avatar_url,
                role
            `)
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


    if (error || !data) {
        return;
    }


    const nameElement =
        document.getElementById(
            "coachName"
        );


    const avatarElement =
        document.getElementById(
            "coachAvatar"
        );


    if (nameElement) {

        nameElement.textContent =
            data.full_name ||
            "Coach";

    }


    if (
        avatarElement &&
        data.avatar_url
    ) {

        avatarElement.innerHTML = `

            <img
                src="${escapeHtml(
                    data.avatar_url
                )}"
                alt="Coach"
                style="
                    width:100%;
                    height:100%;
                    border-radius:50%;
                    object-fit:cover;
                "
            >

        `;

    } else if (avatarElement) {

        avatarElement.textContent =
            getInitials(
                data.full_name ||
                "Coach"
            );

    }

}


/* =========================================
   NAVIGATION
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

async function logout() {

    await coachSupabase.auth.signOut();


    localStorage.removeItem(
        "strideLabRole"
    );


    window.location.href =
        "index.html";

}


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        updateDate();

        await loadCoachProfile();

        await loadAthlete();

    }
);
