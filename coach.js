/* =========================================
   TWETE COACH DASHBOARD
   REAL SUPABASE DATA
========================================= */


/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";

const coachSupabase =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================
   GLOBAL DATA
========================================= */

let athletes = [];
let programs = [];


/* =========================================
   DATE
========================================= */

function updateDate() {

    const element =
        document.getElementById("currentDate");

    if (!element) {
        return;
    }

    const today = new Date();

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
   HTML SAFETY
========================================= */

function escapeHtml(value) {

    return String(value ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/* =========================================
   GET INITIALS
========================================= */

function getInitials(name) {

    if (!name) {
        return "A";
    }

    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(function(part) {
            return part.charAt(0);
        })
        .join("")
        .toUpperCase();
}


/* =========================================
   LOAD ALL ATHLETES
========================================= */

async function loadAthletes() {

    const container =
        document.getElementById(
            "athleteSelectionGrid"
        );

    if (!container) {
        return;
    }


    container.innerHTML = `
        <div class="loading-athletes">
            Loading athletes...
        </div>
    `;


    /*
        IMPORTANT:

        We do NOT use a hard-coded athlete.

        Every profile with:

            role = "athlete"

        will automatically appear.
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
                "role",
                "athlete"
            )
            .order(
                "full_name",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Supabase athlete error:",
            error
        );


        container.innerHTML = `
            <div class="empty-athletes database-error">

                <strong>
                    Could not load athletes
                </strong>

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;

        return;
    }


    athletes = data || [];


    /*
        Update athlete count
    */

    const count =
        document.getElementById(
            "athleteCount"
        );

    if (count) {

        count.textContent =
            athletes.length;

    }


    renderAthletes(
        athletes
    );
}


/* =========================================
   RENDER ATHLETES
========================================= */

function renderAthletes(list) {

    const container =
        document.getElementById(
            "athleteSelectionGrid"
        );

    if (!container) {
        return;
    }


    if (!list.length) {

        container.innerHTML = `
            <div class="empty-athletes">

                No registered athletes found.

                <br><br>

                When an athlete creates an
                account, they will appear here
                automatically.

            </div>
        `;

        return;
    }


    container.innerHTML =
        list.map(function(athlete) {

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


            /*
                Profile picture
            */

            let avatar;


            if (
                athlete.avatar_url &&
                athlete.avatar_url.trim() !== ""
            ) {

                avatar = `

                    <img
                        class="selection-avatar"
                        src="${escapeHtml(
                            athlete.avatar_url
                        )}"
                        alt="${escapeHtml(
                            name
                        )}"
                        onerror="
                            this.style.display='none';
                            this.nextElementSibling.style.display='flex';
                        "
                    >

                    <div
                        class="
                            selection-avatar
                            selection-avatar-placeholder
                        "
                        style="display:none;"
                    >
                        ${escapeHtml(
                            getInitials(name)
                        )}
                    </div>

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


            return `

                <article
                    class="athlete-selection-card"
                    onclick="
                        selectAthlete(
                            '${athlete.id}'
                        )
                    "
                >

                    ${avatar}


                    <div
                        class="selection-info"
                    >

                        <h3>
                            ${escapeHtml(
                                name
                            )}
                        </h3>


                        <p>
                            ${escapeHtml(
                                details ||
                                "Athlete"
                            )}
                        </p>


                        <div
                            class="selection-email"
                        >

                            ${escapeHtml(
                                athlete.email ||
                                ""
                            )}

                        </div>

                    </div>


                    <div
                        class="selection-arrow"
                    >
                        ›
                    </div>

                </article>

            `;

        })
        .join("");
}


/* =========================================
   SEARCH ATHLETES
========================================= */

function setupAthleteSearch() {

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

            const query =
                search.value
                    .trim()
                    .toLowerCase();


            if (!query) {

                renderAthletes(
                    athletes
                );

                return;
            }


            const filtered =
                athletes.filter(
                    function(athlete) {

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


                        const discipline =
                            (
                                athlete.discipline ||
                                ""
                            ).toLowerCase();


                        return (
                            name.includes(query) ||
                            email.includes(query) ||
                            discipline.includes(query)
                        );

                    }
                );


            renderAthletes(
                filtered
            );

        }
    );
}


/* =========================================
   SELECT ATHLETE
========================================= */

function selectAthlete(
    athleteId
) {

    if (!athleteId) {
        return;
    }


    /*
        Use the Supabase UUID.

        We do NOT use the athlete's name
        or email to identify them.
    */

    window.location.href =
        "coach-athlete.html?athlete_id=" +
        encodeURIComponent(
            athleteId
        );
}


/* =========================================
   LOAD PROGRAMS
========================================= */

async function loadPrograms() {

    /*
        Load all programs.

        Later we can connect these directly
        to the selected athlete pages.
    */

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

        updateProgramNumbers();

        renderEndingPrograms();

        return;
    }


    programs =
        data || [];


    updateProgramNumbers();

    renderEndingPrograms();
}


/* =========================================
   UPDATE PROGRAM NUMBERS
========================================= */

function updateProgramNumbers() {

    const activePrograms =
        programs.filter(
            function(program) {

                return (
                    program.status ===
                    "active"
                );

            }
        );


    const endingSoon =
        activePrograms.filter(
            function(program) {

                const days =
                    daysUntil(
                        program.end_date
                    );


                return (
                    days !== null &&
                    days >= 0 &&
                    days <= 7
                );

            }
        );


    const athletesWithPrograms =
        new Set(
            activePrograms.map(
                function(program) {
                    return program.athlete_id;
                }
            )
        );


    const athletesWithoutPrograms =
        athletes.filter(
            function(athlete) {

                return !athletesWithPrograms.has(
                    athlete.id
                );

            }
        );


    const activeElement =
        document.getElementById(
            "activePrograms"
        );

    const endingElement =
        document.getElementById(
            "endingPrograms"
        );

    const noProgramElement =
        document.getElementById(
            "noProgram"
        );


    if (activeElement) {

        activeElement.textContent =
            activePrograms.length;

    }


    if (endingElement) {

        endingElement.textContent =
            endingSoon.length;

    }


    if (noProgramElement) {

        noProgramElement.textContent =
            athletesWithoutPrograms.length;

    }
}


/* =========================================
   DAYS UNTIL DATE
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
   RENDER PROGRAMS ENDING SOON
========================================= */

function renderEndingPrograms() {

    const container =
        document.getElementById(
            "endingAthletes"
        );

    if (!container) {
        return;
    }


    const endingPrograms =
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


    if (!endingPrograms.length) {

        container.innerHTML = `

            <div class="empty-athletes">

                No programs are ending
                within the next 7 days.

            </div>

        `;

        return;
    }


    container.innerHTML =
        endingPrograms
            .map(function(program) {

                const athlete =
                    athletes.find(
                        function(item) {

                            return (
                                item.id ===
                                program.athlete_id
                            );

                        }
                    );


                /*
                    If the athlete isn't currently
                    visible in profiles, don't show
                    a broken card.
                */

                if (!athlete) {
                    return "";
                }


                const days =
                    daysUntil(
                        program.end_date
                    );


                let urgency =
                    "";


                if (days <= 3) {

                    urgency =
                        "urgent";

                } else {

                    urgency =
                        "warning";

                }


                let dayText;


                if (days === 0) {

                    dayText =
                        "Ends today";

                } else if (days === 1) {

                    dayText =
                        "1 day remaining";

                } else {

                    dayText =
                        days +
                        " days remaining";

                }


                let avatar;


                if (
                    athlete.avatar_url
                ) {

                    avatar = `

                        <img
                            class="selection-avatar"
                            src="${escapeHtml(
                                athlete.avatar_url
                            )}"
                            alt=""
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
                                getInitials(
                                    athlete.full_name
                                )
                            )}

                        </div>

                    `;

                }


                return `

                    <article
                        class="
                            ending-athlete
                            ${urgency}
                        "
                    >

                        <div
                            class="athlete-main"
                        >

                            ${avatar}


                            <div>

                                <h3>

                                    ${escapeHtml(
                                        athlete.full_name ||
                                        "Athlete"
                                    )}

                                </h3>


                                <div
                                    class="athlete-goal"
                                >

                                    ${escapeHtml(
                                        program.name ||
                                        "Training Program"
                                    )}

                                </div>


                                <div
                                    class="athlete-pb"
                                >

                                    ${escapeHtml(
                                        athlete.email ||
                                        ""
                                    )}

                                </div>

                            </div>

                        </div>


                        <div
                            class="program-end"
                        >

                            <span>
                                Program ends
                            </span>


                            <div
                                class="program-date"
                            >

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


                        <div
                            class="progress-area"
                        >

                            <span>
                                Status
                            </span>

                            <strong>
                                Active
                            </strong>

                        </div>


                        <button
                            class="edit-program"
                            onclick="
                                selectAthlete(
                                    '${athlete.id}'
                                )
                            "
                        >

                            Open Athlete

                            <span>
                                ›
                            </span>

                        </button>

                    </article>

                `;

            })
            .join("");
}


/* =========================================
   LOAD COACH PROFILE
========================================= */

async function loadCoachProfile() {

    const {
        data: {
            user
        }
    } =
        await coachSupabase
            .auth
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


    if (error) {

        console.error(
            "Coach profile error:",
            error
        );

        return;
    }


    if (!data) {
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

    try {

        await coachSupabase
            .auth
            .signOut();

    } catch (error) {

        console.error(
            "Logout error:",
            error
        );

    }


    localStorage.removeItem(
        "strideLabRole"
    );


    window.location.href =
        "index.html";
}


/* =========================================
   INITIALIZE DASHBOARD
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        updateDate();

        setupAthleteSearch();

        await loadCoachProfile();

        await loadAthletes();

        await loadPrograms();

    }
);
