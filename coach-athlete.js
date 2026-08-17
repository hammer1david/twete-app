/* =========================================
   TWETE COACH
   ATHLETE MANAGEMENT
========================================= */


const SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";


const SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================
   ATHLETE ID
========================================= */

const params =
    new URLSearchParams(
        window.location.search
    );


const athleteId =
    params.get(
        "athlete_id"
    );


let athlete = null;

let goals = [];


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        if (!athleteId) {

            showError(
                "No athlete was selected."
            );

            return;
        }


        await loadAthlete();

        await loadGoals();

    }
);


/* =========================================
   LOAD ATHLETE
========================================= */

async function loadAthlete() {

    const container =
        document.getElementById(
            "athleteProfile"
        );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                email,
                full_name,
                avatar_url,
                country,
                discipline,
                preferred_distance,
                experience_level
            `)
            .eq(
                "id",
                athleteId
            )
            .eq(
                "role",
                "athlete"
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Athlete error:",
            error
        );

        container.innerHTML = `
            <div class="empty error">

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;

        return;
    }


    if (!data) {

        container.innerHTML = `
            <div class="empty error">

                Athlete could not be found.

            </div>
        `;

        return;
    }


    athlete = data;


    renderAthlete();

}


/* =========================================
   RENDER ATHLETE
========================================= */

function renderAthlete() {

    const container =
        document.getElementById(
            "athleteProfile"
        );


    const name =
        athlete.full_name ||
        "Unnamed athlete";


    const details = [

        athlete.country,

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
                class="profile-picture"
                src="${escapeHtml(
                    athlete.avatar_url
                )}"
                alt="${escapeHtml(
                    name
                )}"
            >

        `;

    } else {

        avatar = `

            <div
                class="
                    profile-picture
                    profile-placeholder
                "
            >

                ${escapeHtml(
                    getInitials(name)
                )}

            </div>

        `;

    }


    container.innerHTML = `

        ${avatar}


        <div
            class="profile-info"
        >

            <h1>
                ${escapeHtml(name)}
            </h1>


            <div
                class="profile-email"
            >

                ${escapeHtml(
                    athlete.email ||
                    ""
                )}

            </div>


            <div
                class="profile-details"
            >

                ${escapeHtml(
                    details ||
                    "Athlete"
                )}

            </div>

        </div>

    `;

}


/* =========================================
   LOAD GOALS
========================================= */

async function loadGoals() {

    const container =
        document.getElementById(
            "goalsList"
        );


    container.innerHTML = `
        <div class="loading">
            Loading goals...
        </div>
    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("goals")
            .select(`
                id,
                athlete_id,
                distance,
                current_pb,
                target_time,
                target_date,
                progress,
                created_at
            `)
            .eq(
                "athlete_id",
                athleteId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Goals error:",
            error
        );


        container.innerHTML = `
            <div class="empty error">

                Could not load goals.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;

        return;
    }


    goals =
        data || [];


    renderGoals();

}


/* =========================================
   RENDER GOALS
========================================= */

function renderGoals() {

    const container =
        document.getElementById(
            "goalsList"
        );


    if (!goals.length) {

        container.innerHTML = `

            <div class="empty">

                This athlete has no goals yet.

                <br><br>

                Click
                <strong>+ Add Goal</strong>
                to create the first one.

            </div>

        `;

        return;
    }


    container.innerHTML =
        goals
            .map(
                function(goal) {

                    return `

                        <div
                            class="goal-card"
                        >

                            <div
                                class="goal-main"
                            >

                                <div
                                    class="goal-distance"
                                >

                                    ${escapeHtml(
                                        goal.distance
                                    )}

                                </div>


                                <div
                                    class="goal-target"
                                >

                                    Target:
                                    <strong>
                                        ${escapeHtml(
                                            goal.target_time
                                        )}
                                    </strong>

                                </div>


                                <div
                                    class="goal-info"
                                >

                                    Current PB:
                                    ${
                                        escapeHtml(
                                            goal.current_pb ||
                                            "Not set"
                                        )
                                    }

                                    ${
                                        goal.target_date
                                        ?
                                        `
                                        &nbsp; • &nbsp;

                                        Target date:
                                        ${formatDate(
                                            goal.target_date
                                        )}
                                        `
                                        :
                                        ""
                                    }

                                </div>

                            </div>


                            <div
                                class="goal-actions"
                            >

                                <button
                                    class="delete-button"
                                    onclick="
                                        deleteGoal(
                                            '${goal.id}'
                                        )
                                    "
                                >

                                    Delete

                                </button>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");

}


/* =========================================
   OPEN GOAL MODAL
========================================= */

function openGoalModal() {

    document
        .getElementById(
            "goalModal"
        )
        .classList.add(
            "show"
        );

}


/* =========================================
   CLOSE GOAL MODAL
========================================= */

function closeGoalModal() {

    document
        .getElementById(
            "goalModal"
        )
        .classList.remove(
            "show"
        );

}


/* =========================================
   SAVE GOAL
========================================= */

async function saveGoal() {

    if (!athleteId) {
        return;
    }


    const distance =
        document
            .getElementById(
                "goalDistance"
            )
            .value;


    const currentPB =
        document
            .getElementById(
                "goalCurrentPB"
            )
            .value
            .trim();


    const targetTime =
        document
            .getElementById(
                "goalTargetTime"
            )
            .value
            .trim();


    const targetDate =
        document
            .getElementById(
                "goalTargetDate"
            )
            .value;


    if (!targetTime) {

        alert(
            "Please enter a target time."
        );

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("goals")
            .insert({

                athlete_id:
                    athleteId,

                distance:
                    distance,

                current_pb:
                    currentPB ||
                    null,

                target_time:
                    targetTime,

                target_date:
                    targetDate ||
                    null,

                progress:
                    0

            })
            .select()
            .single();


    if (error) {

        console.error(
            "Save goal error:",
            error
        );


        alert(
            "Could not save goal:\n\n" +
            error.message
        );

        return;
    }


    console.log(
        "Goal created:",
        data
    );


    closeGoalModal();


    /*
       Clear form
    */

    document
        .getElementById(
            "goalCurrentPB"
        )
        .value = "";


    document
        .getElementById(
            "goalTargetTime"
        )
        .value = "";


    document
        .getElementById(
            "goalTargetDate"
        )
        .value = "";


    await loadGoals();

}


/* =========================================
   DELETE GOAL
========================================= */

async function deleteGoal(
    goalId
) {

    const confirmed =
        confirm(
            "Delete this goal?"
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("goals")
            .delete()
            .eq(
                "id",
                goalId
            );


    if (error) {

        console.error(
            "Delete goal error:",
            error
        );


        alert(
            "Could not delete goal:\n\n" +
            error.message
        );

        return;
    }


    await loadGoals();

}


/* =========================================
   BACK
========================================= */

function goBack() {

    window.location.href =
        "coach.html";

}


/* =========================================
   DATE
========================================= */

function formatDate(
    value
) {

    if (!value) {
        return "";
    }


    return new Date(
        value
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
                    .charAt(0)
                    .toUpperCase();

            }
        )
        .join("");

}


/* =========================================
   HTML ESCAPE
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
   ERROR
========================================= */

function showError(
    message
) {

    document.body.innerHTML = `

        <div
            style="
                color:white;
                background:#050505;
                min-height:100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                text-align:center;
                padding:30px;
                font-family:Arial;
            "
        >

            <div>

                <h2>
                    ${escapeHtml(
                        message
                    )}
                </h2>


                <button
                    onclick="goBack()"
                    style="
                        margin-top:20px;
                        padding:10px 18px;
                        border:0;
                        border-radius:8px;
                        background:#C6FF00;
                        cursor:pointer;
                    "
                >

                    ← Back to Athletes

                </button>

            </div>

        </div>

    `;

}