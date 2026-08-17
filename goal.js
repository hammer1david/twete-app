/* =========================================
   TWETE ATHLETE GOAL PAGE
========================================= */


const GOAL_SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";


const GOAL_SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";


const goalSupabase =
    window.supabase.createClient(
        GOAL_SUPABASE_URL,
        GOAL_SUPABASE_KEY
    );


let currentGoal = null;

let currentProgram = null;

let currentWeeks = [];

let currentSessions = [];

let selectedWeekId = null;


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

        injectAthleteGoalStyles();

        await loadGoalPage();

    }
);


/* =========================================
   HOME
========================================= */

function goHome() {

    window.location.href =
        "athlete.html";

}


/* =========================================
   MESSAGES
========================================= */

function openMessages() {

    window.location.href =
        "messages.html";

}


/* =========================================
   LOAD GOAL
========================================= */

async function loadGoalPage() {

    const params =
        new URLSearchParams(
            window.location.search
        );


    const goalId =
        params.get(
            "goal_id"
        );


    try {

        let goal = null;


        if (goalId) {

            const {
                data,
                error
            } =
                await goalSupabase
                    .from("goals")
                    .select(`
                        id,
                        athlete_id,
                        program_id,
                        goal_name,
                        distance,
                        target_time,
                        target_date,
                        created_at
                    `)
                    .eq(
                        "id",
                        goalId
                    )
                    .maybeSingle();


            if (error) {
                throw error;
            }


            goal =
                data;

        }


        if (!goal) {

            const {
                data: {
                    user
                }
            } =
                await goalSupabase
                    .auth
                    .getUser();


            if (!user) {

                showError(
                    "Please log in again."
                );

                return;
            }


            const {
                data,
                error
            } =
                await goalSupabase
                    .from("goals")
                    .select(`
                        id,
                        athlete_id,
                        program_id,
                        goal_name,
                        distance,
                        target_time,
                        target_date,
                        created_at
                    `)
                    .eq(
                        "athlete_id",
                        user.id
                    )
                    .order(
                        "created_at",
                        {
                            ascending: false
                        }
                    )
                    .limit(1)
                    .maybeSingle();


            if (error) {
                throw error;
            }


            goal =
                data;

        }


        if (!goal) {

            showError(
                "No current goal has been assigned yet."
            );

            return;
        }


        currentGoal =
            goal;


        await loadProgram();

        await loadWeeks();

        renderGoal();

        renderWeeks();


    } catch (error) {

        console.error(
            "Goal page error:",
            error
        );


        showError(
            "Could not load your training plan."
        );

    }

}


/* =========================================
   PROGRAM
========================================= */

async function loadProgram() {

    if (
        !currentGoal ||
        !currentGoal.program_id
    ) {

        currentProgram =
            null;

        return;
    }


    const {
        data,
        error
    } =
        await goalSupabase
            .from("programs")
            .select(`
                id,
                athlete_id,
                name,
                start_date,
                end_date,
                status,
                coach_update_at,
                athlete_received_at,
                updated_at
            `)
            .eq(
                "id",
                currentGoal.program_id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Program loading error:",
            error
        );

        currentProgram =
            null;

        return;
    }


    currentProgram =
        data;

}


/* =========================================
   WEEKS + SESSIONS
========================================= */

async function loadWeeks() {

    if (
        !currentGoal ||
        !currentGoal.program_id
    ) {

        currentWeeks = [];

        currentSessions = [];

        return;
    }


    const {
        data: weeks,
        error: weeksError
    } =
        await goalSupabase
            .from("training_weeks")
            .select(`
                id,
                program_id,
                week_number,
                start_date,
                end_date,
                weekly_km,
                week_label,
                created_at
            `)
            .eq(
                "program_id",
                currentGoal.program_id
            )
            .order(
                "week_number",
                {
                    ascending: true
                }
            );


    if (weeksError) {

        console.error(
            "Weeks loading error:",
            weeksError
        );

        currentWeeks = [];

        currentSessions = [];

        return;
    }


    currentWeeks =
        weeks ||
        [];


    if (!currentWeeks.length) {

        currentSessions = [];

        return;
    }


    const weekIds =
        currentWeeks.map(
            week =>
                week.id
        );


    const {
        data: sessions,
        error: sessionsError
    } =
        await goalSupabase
            .from("workouts")
            .select(`
                id,
                athlete_id,
                week_id,
                workout_date,
                workout_type,
                title,
                distance_km,
                duration_minutes,
                pace,
                notes,
                completed
            `)
            .in(
                "week_id",
                weekIds
            )
            .order(
                "workout_date",
                {
                    ascending: true
                }
            );


    if (sessionsError) {

        console.error(
            "Sessions loading error:",
            sessionsError
        );

        currentSessions = [];

        return;
    }


    currentSessions =
        sessions ||
        [];

}


/* =========================================
   RENDER GOAL
========================================= */

function renderGoal() {

    if (!currentGoal) {
        return;
    }


    const title =
        document.querySelector(
            ".goal-main-info h2"
        );


    if (title) {

        title.textContent =
            currentGoal.distance &&
            currentGoal.target_time
                ?
                currentGoal.distance +
                " — " +
                currentGoal.target_time
                :
                (
                    currentGoal.goal_name ||
                    "Current Goal"
                );

    }


    const date =
        document.querySelector(
            ".goal-date"
        );


    if (date) {

        date.innerHTML = `

            <svg viewBox="0 0 24 24">

                <rect
                    x="3"
                    y="4"
                    width="18"
                    height="17"
                    rx="2"
                >
                </rect>

                <line
                    x1="8"
                    y1="2"
                    x2="8"
                    y2="6"
                >
                </line>

                <line
                    x1="16"
                    y1="2"
                    x2="16"
                    y2="6"
                >
                </line>

                <line
                    x1="3"
                    y1="10"
                    x2="21"
                    y2="10"
                >
                </line>

            </svg>

            Target date:
            ${escapeHtml(
                currentGoal.target_date
                    ?
                    formatDate(
                        currentGoal.target_date
                    )
                    :
                    "Not set"
            )}

        `;

    }


    const pb =
        document.querySelector(
            ".goal-main-info p"
        );


    if (pb) {

        pb.textContent =
            "Training goal assigned by your coach.";

    }


    updateGoalProgress();

}


/* =========================================
   GOAL PROGRESS
========================================= */

function updateGoalProgress() {

    if (
        !currentProgram ||
        !currentProgram.start_date ||
        !currentGoal ||
        !currentGoal.target_date
    ) {

        setProgress(
            0
        );

        return;
    }


    const start =
        new Date(
            currentProgram.start_date +
            "T00:00:00"
        );


    const end =
        new Date(
            currentGoal.target_date +
            "T00:00:00"
        );


    const today =
        startOfToday();


    const totalDays =
        Math.round(
            (
                end -
                start
            ) /
            86400000
        );


    if (
        totalDays <= 0
    ) {

        setProgress(
            today >= end
                ?
                100
                :
                0
        );

        return;

    }


    const elapsedDays =
        Math.max(
            0,
            Math.min(
                totalDays,
                Math.round(
                    (
                        today -
                        start
                    ) /
                    86400000
                )
            )
        );


    const percentage =
        (
            elapsedDays /
            totalDays
        ) *
        100;


    setProgress(
        Math.max(
            0,
            Math.min(
                100,
                percentage
            )
        )
    );

}


function setProgress(
    percentage
) {

    const circle =
        document.querySelector(
            ".progress-circle-value"
        );


    const number =
        document.querySelector(
            ".progress-number strong"
        );


    if (circle) {

        const radius =
            50;


        const circumference =
            2 *
            Math.PI *
            radius;


        circle.style.strokeDasharray =
            circumference;


        circle.style.strokeDashoffset =
            circumference -
            (
                percentage /
                100
            ) *
            circumference;

    }


    if (number) {

        number.textContent =
            Math.round(
                percentage
            ) +
            "%";

    }

}


/* =========================================
   WEEKS
========================================= */

function renderWeeks() {

    const selector =
        document.querySelector(
            ".week-selector"
        );


    const indicator =
        document.querySelector(
            ".week-indicator-fill"
        );


    if (!selector) {
        return;
    }


    if (!currentWeeks.length) {

        selector.innerHTML = `

            <div class="athlete-empty">
                No training weeks yet.
            </div>

        `;


        const list =
            document.getElementById(
                "workoutList"
            );


        if (list) {

            list.innerHTML =
                "";

        }


        return;
    }


    selectedWeekId =
        chooseCurrentWeek();


    selector.innerHTML =
        currentWeeks
            .map(
                function(week) {

                    const active =
                        week.id ===
                        selectedWeekId;


                    const state =
                        getWeekState(
                            week
                        );


                    return `

                        <button
                            class="
                                week-button
                                ${active ? "active" : ""}
                                ${state}
                            "
                            onclick="
                                selectWeek(
                                    '${week.id}'
                                )
                            "
                        >

                            <span>

                                WEEK
                                ${escapeHtml(
                                    week.week_number
                                )}

                            </span>


                            ${
                                week.week_label
                                ?
                                `
                                <small>

                                    ${escapeHtml(
                                        week.week_label
                                    )}

                                </small>
                                `
                                :
                                ""
                            }

                        </button>

                    `;

                }
            )
            .join("");


    updateWeekIndicator();

    renderSelectedWeek();

}


function chooseCurrentWeek() {

    const today =
        startOfToday();


    const current =
        currentWeeks.find(
            function(week) {

                if (
                    !week.start_date ||
                    !week.end_date
                ) {

                    return false;

                }


                const start =
                    new Date(
                        week.start_date +
                        "T00:00:00"
                    );


                const end =
                    new Date(
                        week.end_date +
                        "T23:59:59"
                    );


                return (
                    today >= start &&
                    today <= end
                );

            }
        );


    return current
        ?
        current.id
        :
        currentWeeks[0].id;

}


function getWeekState(
    week
) {

    const today =
        startOfToday();


    if (
        week.end_date
    ) {

        const end =
            new Date(
                week.end_date +
                "T23:59:59"
            );


        if (
            today > end
        ) {

            return "past-week";

        }

    }


    if (
        week.start_date &&
        week.end_date
    ) {

        const start =
            new Date(
                week.start_date +
                "T00:00:00"
            );


        const end =
            new Date(
                week.end_date +
                "T23:59:59"
            );


        if (
            today >= start &&
            today <= end
        ) {

            return "current-week";

        }

    }


    return "";

}


function selectWeek(
    weekId
) {

    selectedWeekId =
        weekId;


    document
        .querySelectorAll(
            ".week-button"
        )
        .forEach(
            function(button) {

                button.classList.remove(
                    "active"
                );

            }
        );


    const index =
        currentWeeks.findIndex(
            function(week) {

                return (
                    week.id ===
                    weekId
                );

            }
        );


    const buttons =
        document.querySelectorAll(
            ".week-button"
        );


    if (
        buttons[index]
    ) {

        buttons[index]
            .classList
            .add(
                "active"
            );

    }


    updateWeekIndicator();

    renderSelectedWeek();

}


function updateWeekIndicator() {

    const indicator =
        document.querySelector(
            ".week-indicator-fill"
        );


    if (!indicator) {
        return;
    }


    const index =
        currentWeeks.findIndex(
            function(week) {

                return (
                    week.id ===
                    selectedWeekId
                );

            }
        );


    const percentage =
        currentWeeks.length
            ?
            (
                (
                    index + 1
                ) /
                currentWeeks.length
            ) *
            100
            :
            0;


    indicator.style.width =
        percentage +
        "%";

}


/* =========================================
   SESSIONS
========================================= */

function renderSelectedWeek() {

    const list =
        document.getElementById(
            "workoutList"
        );


    if (!list) {
        return;
    }


    const week =
        currentWeeks.find(
            function(item) {

                return (
                    item.id ===
                    selectedWeekId
                );

            }
        );


    if (!week) {

        list.innerHTML =
            "";

        return;

    }


    const sessions =
        currentSessions.filter(
            function(session) {

                return (
                    session.week_id ===
                    week.id
                );

            }
        );


    list.innerHTML =
        sessions.length
            ?
            sessions
                .map(
                    createSessionCard
                )
                .join("")
            :
            `
                <div class="athlete-empty">

                    No sessions in this week yet.

                </div>
            `;

}


/* =========================================
   SESSION CARD
========================================= */

function createSessionCard(
    session
) {

    const today =
        startOfToday();


    const sessionDate =
        new Date(
            session.workout_date +
            "T00:00:00"
        );


    const isToday =
        sessionDate.getTime() ===
        today.getTime();


    const isPast =
        sessionDate <
        today;


    const stateClass =
        isToday
            ?
            " today-workout"
            :
            (
                isPast
                    ?
                    " past-workout"
                    :
                    ""
            );


    const day =
        sessionDate.toLocaleDateString(
            "en-US",
            {
                weekday: "short"
            }
        );


    const date =
        sessionDate.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric"
            }
        );


    const details = [];


    if (
        session.distance_km !== null &&
        session.distance_km !== undefined
    ) {

        details.push(
            session.distance_km +
            " km"
        );

    }


    if (
        session.duration_minutes !== null &&
        session.duration_minutes !== undefined
    ) {

        details.push(
            session.duration_minutes +
            " min"
        );

    }


    if (session.pace) {

        details.push(
            session.pace +
            " /km"
        );

    }


    return `

        <article
            class="
                workout-card
                ${stateClass}
            "
        >

            <div class="workout-day">

                <strong>
                    ${escapeHtml(
                        day
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        date
                    )}
                </span>

            </div>


            <div class="workout-icon run-icon">

                <svg viewBox="0 0 24 24">

                    <path
                        d="M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
                    >
                    </path>

                    <path
                        d="M9 8l4-2 3 4"
                    >
                    </path>

                    <path
                        d="M8 22l3-7 4-3"
                    >
                    </path>

                    <path
                        d="M5 14l4-2"
                    >
                    </path>

                </svg>

            </div>


            <div class="workout-info">

                <h3>

                    ${escapeHtml(
                        session.title ||
                        session.workout_type ||
                        "Training"
                    )}

                </h3>


                ${
                    details.length
                    ?
                    `
                    <p class="workout-details">

                        ${escapeHtml(
                            details.join(
                                " • "
                            )
                        )}

                    </p>
                    `
                    :
                    ""
                }


                ${
                    session.workout_type
                    ?
                    `
                    <p class="workout-description">

                        ${escapeHtml(
                            session.workout_type
                        )}

                    </p>
                    `
                    :
                    ""
                }


                ${
                    isToday
                    ?
                    `
                    <span class="today-label">

                        TODAY

                    </span>
                    `
                    :
                    ""
                }


                <button
                    class="feedback-button"
                    type="button"
                    onclick="
                        addSessionFeedback(
                            '${session.id}'
                        )
                    "
                >

                    ${
                        hasAthleteFeedback(
                            session.notes
                        )
                        ?
                        "Edit Feedback"
                        :
                        "Add Feedback"
                    }

                </button>

            </div>

        </article>

    `;

}


/* =========================================
   FEEDBACK
========================================= */

function hasAthleteFeedback(
    notes
) {

    return (
        typeof notes === "string" &&
        notes.includes(
            "Athlete feedback:"
        )
    );

}


function getAthleteFeedback(
    notes
) {

    if (
        !hasAthleteFeedback(
            notes
        )
    ) {

        return "";

    }


    return notes
        .split(
            "Athlete feedback:"
        )[1]
        .trim();

}


async function addSessionFeedback(
    sessionId
) {

    const session =
        currentSessions.find(
            function(item) {

                return (
                    item.id ===
                    sessionId
                );

            }
        );


    if (!session) {
        return;
    }


    const existingFeedback =
        getAthleteFeedback(
            session.notes
        );


    const feedback =
        prompt(
            "Write your feedback for this session:",
            existingFeedback
        );


    if (
        feedback ===
        null
    ) {

        return;

    }


    const cleaned =
        feedback.trim();


    let originalNotes =
        session.notes ||
        "";


    if (
        hasAthleteFeedback(
            originalNotes
        )
    ) {

        originalNotes =
            originalNotes
                .split(
                    "Athlete feedback:"
                )[0]
                .trim();

    }


    let newNotes =
        originalNotes;


    if (cleaned) {

        newNotes =
            originalNotes
                ?
                (
                    originalNotes +
                    "\n\nAthlete feedback:\n" +
                    cleaned
                )
                :
                "Athlete feedback:\n" +
                cleaned;

    }


    const {
        error
    } =
        await goalSupabase
            .from("workouts")
            .update({

                notes:
                    newNotes ||
                    null

            })
            .eq(
                "id",
                sessionId
            );


    if (error) {

        console.error(
            "Feedback error:",
            error
        );


        alert(
            "Could not save your feedback."
        );


        return;

    }


    session.notes =
        newNotes ||
        null;


    renderSelectedWeek();

}


/* =========================================
   OLD FUNCTIONS
========================================= */

function toggleWorkout() {

    return;

}


function startWorkout() {

    return;

}


function viewFullPlan() {

    if (
        currentGoal &&
        currentGoal.id
    ) {

        window.location.href =
            "goal.html?goal_id=" +
            encodeURIComponent(
                currentGoal.id
            );

    }

}


function addFeedback() {

    alert(
        "Please add feedback directly to the session you want to comment on."
    );

}


/* =========================================
   HELPERS
========================================= */

function startOfToday() {

    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    return today;

}


function formatDate(
    value
) {

    if (!value) {
        return "";
    }


    return new Date(
        value +
        "T00:00:00"
    ).toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

}


function escapeHtml(
    value
) {

    return String(
        value ??
        ""
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


function showError(
    message
) {

    const title =
        document.querySelector(
            ".goal-main-info h2"
        );


    if (title) {

        title.textContent =
            message;

    }


    const list =
        document.getElementById(
            "workoutList"
        );


    if (list) {

        list.innerHTML = `

            <div class="athlete-empty">

                ${escapeHtml(
                    message
                )}

            </div>

        `;

    }

}


/* =========================================
   DYNAMIC ATHLETE STYLES
========================================= */

function injectAthleteGoalStyles() {

    if (
        document.getElementById(
            "athleteGoalDynamicStyles"
        )
    ) {

        return;

    }


    const style =
        document.createElement(
            "style"
        );


    style.id =
        "athleteGoalDynamicStyles";


    style.textContent = `

        .athlete-empty {

            color: #777;

            padding: 22px 4px;

            font-size: 13px;

        }


        .week-button {

            position: relative;

        }


        .week-button small {

            display: block;

            margin-top: 3px;

            color: #888;

            font-size: 8px;

            text-transform: uppercase;

            letter-spacing: .4px;

        }


        .week-button.current-week {

            border-color: #C6FF00 !important;

        }


        .week-button.past-week {

            opacity: .42;

            filter: grayscale(.7);

        }


        .workout-card.past-workout {

            opacity: .42;

            filter: grayscale(.65);

            transition:
                opacity .25s ease;

        }


        .workout-card.today-workout {

            border-color:
                #C6FF00 !important;

            box-shadow:
                0 0 0 1px
                rgba(198,255,0,.12);

        }


        .today-label {

            display: inline-block;

            margin-top: 7px;

            color: #C6FF00;

            font-size: 9px;

            font-weight: 800;

            letter-spacing: 1px;

        }


        .feedback-button {

            display: block;

            margin-top: 10px;

            background: transparent;

            color: #C6FF00;

            border: 1px solid #333;

            border-radius: 7px;

            padding: 7px 10px;

            font-size: 10px;

            cursor: pointer;

        }


        .feedback-button:hover {

            border-color: #C6FF00;

        }

    `;


    document.head.appendChild(
        style
    );

}
