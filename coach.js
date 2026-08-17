/* =========================================
   TWETE COACH
   SIMPLE ATHLETE LIST
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
   LOAD ATHLETES
========================================= */

async function loadAthletes() {

    const grid =
        document.getElementById(
            "athletesGrid"
        );


    const count =
        document.getElementById(
            "athleteCount"
        );


    if (!grid) {
        return;
    }


    grid.innerHTML = `
        <div class="loading">
            Loading athletes...
        </div>
    `;


    console.log(
        "Loading athletes from Supabase..."
    );


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
                role,
                country,
                discipline,
                preferred_distance,
                experience_level
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


    /* ================================
       ERROR
    ================================= */

    if (error) {

        console.error(
            "SUPABASE ERROR:",
            error
        );


        grid.innerHTML = `

            <div
                class="empty error"
            >

                Could not load athletes.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>

        `;


        return;
    }


    console.log(
        "Athletes received:",
        data
    );


    /* ================================
       NO ATHLETES
    ================================= */

    if (
        !data ||
        data.length === 0
    ) {

        count.textContent =
            "0 athletes";


        grid.innerHTML = `

            <div class="empty">

                No athletes found.

                <br><br>

                Athletes registered in
                Supabase will automatically
                appear here.

            </div>

        `;


        return;
    }


    /* ================================
       COUNT
    ================================= */

    count.textContent =

        data.length +
        (
            data.length === 1
                ? " athlete"
                : " athletes"
        );


    /* ================================
       RENDER
    ================================= */

    grid.innerHTML =

        data
            .map(
                function(athlete) {

                    return createAthleteCard(
                        athlete
                    );

                }
            )
            .join("");

}


/* =========================================
   CREATE ATHLETE CARD
========================================= */

function createAthleteCard(
    athlete
) {

    const name =

        athlete.full_name ||
        "Unnamed athlete";


    const email =

        athlete.email ||
        "";


    const details = [

        athlete.discipline,

        athlete.preferred_distance,

        athlete.experience_level

    ]
        .filter(Boolean)
        .join(" • ");


    let avatar;


    /* ================================
       PROFILE PICTURE
    ================================= */

    if (
        athlete.avatar_url &&
        athlete.avatar_url.trim() !== ""
    ) {

        avatar = `

            <img

                class="avatar"

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
                    avatar
                    avatar-placeholder
                "
                style="display:none;"
            >

                ${escapeHtml(
                    getInitials(
                        name
                    )
                )}

            </div>

        `;

    } else {

        avatar = `

            <div
                class="
                    avatar
                    avatar-placeholder
                "
            >

                ${escapeHtml(
                    getInitials(
                        name
                    )
                )}

            </div>

        `;

    }


    return `

        <div

            class="athlete-card"

            onclick="
                selectAthlete(
                    '${athlete.id}'
                )
            "

        >

            ${avatar}


            <div
                class="athlete-info"
            >

                <div
                    class="athlete-name"
                >

                    ${escapeHtml(
                        name
                    )}

                </div>


                <div
                    class="athlete-email"
                >

                    ${escapeHtml(
                        email
                    )}

                </div>


                ${
                    details

                    ?

                    `
                    <div
                        class="athlete-details"
                    >

                        ${escapeHtml(
                            details
                        )}

                    </div>
                    `

                    :

                    ""
                }

            </div>


            <div class="arrow">

                ›

            </div>

        </div>

    `;

}


/* =========================================
   SELECT ATHLETE
========================================= */
function selectAthlete(athleteId) {

    if (!athleteId) {
        return;
    }

    window.location.href =
        "coach-athlete.html?athlete_id=" +
        encodeURIComponent(athleteId);
}


/* =========================================
   INITIALS
========================================= */

function getInitials(
    name
) {

    if (!name) {
        return "A";
    }


    return name

        .trim()

        .split(/\s+/)

        .slice(0, 2)

        .map(
            function(part) {

                return part
                    .charAt(0);

            }
        )

        .join("")

        .toUpperCase();

}


/* =========================================
   ESCAPE HTML
========================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )

        .replaceAll(
            "&",
            "&amp;"
        )

        .replaceAll(
            "<",
            "&lt;"
        )

        .replaceAll(
            ">",
            "&gt;"
        )

        .replaceAll(
            '"',
            "&quot;"
        )

        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        console.log(
            "Twete Coach loaded."
        );


        loadAthletes();

    }
);
