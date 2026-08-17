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
   NAVIGATION
========================================= */

function goHome() {

    window.location.href =
        "athlete.html";

}


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
        params.get("goal_id");


    try {

        let goal = null;


        /*
         * If goal_id is in the URL,
         * load exactly that goal.
         */

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


            goal = data;

        }


        /*
         * Fallback:
         * newest goal belonging to
         * the logged-in athlete.
         */

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


            goal = data;

        }


        if (!goal) {

            showError(
                "No current goal has been assigned yet."
            );

            return;
        }


        currentGoal = goal;


        /*
         * Load program first because
         * progress depends on its start date.
         */

        await loadProgram();


        /*
         * Load weeks and sessions
         * belonging to this program.
         */

        await loadWeeks();


        /*
         * Render after all data has
         * been loaded.
         */

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
   LOAD PROGRAM
========================================= */

async function loadProgram() {

    if (
        !currentGoal ||
        !currentGoal.program_id
    ) {

        currentProgram = null;

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

        currentProgram = null;

        return;
    }


    currentProgram = data;

}


/* =========================================
   LOAD WEEKS
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
        weeks || [];


    /*
     * No weeks.
     */

    if (!currentWeeks.length) {

        currentSessions = [];

        return;
    }


    const weekIds =
        currentWeeks.map(
            function (week) {

                return week.id;

            }
        );


    /*
     * Load only sessions belonging
     * to the loaded weeks.
     */

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
        sessions || [];

}


/* =========================================
   RENDER GOAL
========================================= */

function renderGoal() {

    if (!currentGoal) {
        return;
    }


    /*
     * GOAL NAME
     *
     * Example:
     * Berlin
     */

    const title =
        document.querySelector(
            ".goal-main-info h2"
        );


    if (title) {

        title.textContent =
            currentGoal.goal_name ||
            "Current Goal";

    }


    /*
     * Show distance and target time
     * below the Goal Name.
     */

    const description =
        document.querySelector(
            ".goal-main-info p"
        );


    if (description) {

        const parts = [];


        if (
            currentGoal.distance !== null &&
            currentGoal.distance !== undefined &&
            currentGoal.distance !== ""
        ) {

            parts.push(
                formatDistance(
                    currentGoal.distance
                )
            );

        }


        if (
            currentGoal.target_time !== null &&
            currentGoal.target_time !== undefined &&
            currentGoal.target_time !== ""
        ) {

            parts.push(
                String(
                    currentGoal.target_time
                )
            );

        }


        description.textContent =
            parts.length
                ?
                parts.join(" — ")
                :
                "Training goal assigned by your coach.";

    }


    /*
     * Target date.
     */

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
                ></rect>

                <line
                    x1="8"
                    y1="2"
                    x2="8"
                    y2="6"
                ></line>

                <line
                    x1="16"
                    y1="2"
                    x2="16"
                    y2="6"
                ></line>

                <line
                    x1="3"
                    y1="10"
                    x2="21"
                    y2="10"
                ></line>

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


    /*
     * Calculate progress.
     */

    updateGoalProgress();

}


/* =========================================
   PROGRESS
========================================= */

function updateGoalProgress() {

    if (
        !currentProgram ||
        !currentProgram.start_date ||
        !currentGoal ||
        !currentGoal.target_date
    ) {

        setProgress(0);

        return;
    }


    const start =
        parseDate(
            currentProgram.start_date
        );


    const end =
        parseDate(
            currentGoal.target_date
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


    /*
     * Same calculation as agreed:
     *
     * 5 days = 20% per day
     * 100 days = 1% per day
     *
     * On the start date = 0%.
     */

    if (totalDays <= 0) {

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
                Math.floor(
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
        percentage
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


    const safePercentage =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    percentage
                ) || 0
            )
        );


    if (circle) {

        const radius = 50;

        const circumference =
            2 *
            Math.PI *
            radius;


        circle.style.strokeDasharray =
            circumference;


        circle.style.strokeDashoffset =
            circumference -
            (
                safePercentage /
                100
            ) *
            circumference;

    }


    if (number) {

        number.textContent =
            Math.round(
                safePercentage
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

            list.innerHTML = `

                <div class="athlete-empty">

                    No training sessions yet.

                </div>

            `;

        }


        return;
    }


    /*
     * Automatically select the
     * week containing today's date.
     */

    selectedWeekId =
        chooseCurrentWeek();


    selector.innerHTML =
        currentWeeks
            .map(
                function (week) {

                    const active =
                        week.id ===
                        selectedWeekId;


                    const state =
                        getWeekState(
                            week
                        );


                    return `

                        <button
                            type="button"
                            class="
                                week-button
                                ${active ? "active" : ""}
                                ${state}
                            "
                            onclick="
                                selectWeek(
                                    '${escapeAttribute(
                                        week.id
                                    )}'
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


                            ${
                                week.weekly_km !== null &&
                                week.weekly_km !== undefined &&
                                week.weekly_km !== ""
                                ?
                                `
                                <small class="weekly-mileage">

                                    ${escapeHtml(
                                        formatWeeklyKm(
                                            week.weekly_km
                                        )
                                    )}

                                </small>
                                `
                                :
                                ""
                            }


                            ${
                                week.start_date &&
                                week.end_date
                                ?
                                `
                                <small class="week-dates">

                                    ${escapeHtml(
                                        formatShortDate(
                                            week.start_date
                                        )
                                    )}
                                    –
                                    ${escapeHtml(
                                        formatShortDate(
                                            week.end_date
                                        )
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


/* =========================================
   CURRENT WEEK
========================================= */

function chooseCurrentWeek() {

    const today =
        startOfToday();


    const current =
        currentWeeks.find(
            function (week) {

                if (
                    !week.start_date ||
                    !week.end_date
                ) {

                    return false;
                }


                const start =
                    parseDate(
                        week.start_date
                    );


                const end =
                    parseDate(
                        week.end_date
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


/* =========================================
   WEEK STATE
========================================= */

function getWeekState(
    week
) {

    const today =
        startOfToday();


    if (
        week.end_date
    ) {

        const end =
            parseDate(
                week.end_date
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
            parseDate(
                week.start_date
            );


        const end =
            parseDate(
                week.end_date
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


/* =========================================
   SELECT WEEK
========================================= */

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
            function (button) {

                button.classList.remove(
                    "active"
                );

            }
        );


    const index =
        currentWeeks.findIndex(
            function (week) {

                return (
                    String(
                        week.id
                    ) ===
                    String(
                        weekId
                    )
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
            .add("active");

    }


    updateWeekIndicator();

    renderSelectedWeek();

}


/* =========================================
   WEEK INDICATOR
========================================= */

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
            function (week) {

                return (
                    String(
                        week.id
                    ) ===
                    String(
                        selectedWeekId
                    )
                );

            }
        );


    const percentage =
        currentWeeks.length > 0
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
        Math.max(
            0,
            percentage
        ) +
        "%";

}


/* =========================================
   SELECTED WEEK SESSIONS
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
            function (item) {

                return (
                    String(
                        item.id
                    ) ===
                    String(
                        selectedWeekId
                    )
                );

            }
        );


    if (!week) {

        list.innerHTML = `

            <div class="athlete-empty">

                No training week selected.

            </div>

        `;

        return;
    }


    const sessions =
        currentSessions.filter(
            function (session) {

                return (
                    String(
                        session.week_id
                    ) ===
                    String(
                        week.id
                    )
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
        parseDate(
            session.workout_date
        );


    const isToday =
        sessionDate.getTime() ===
        today.getTime();


    const isPast =
        sessionDate <
        today;


    let stateClass = "";


    if (isToday) {

        stateClass =
            " today-workout";

    } else if (isPast) {

        stateClass =
            " past-workout";

    }


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


    /*
     * Session details:
     *
     * 10 km
     * 45 min
     * 4:30 /km
     */

    const details = [];


    if (
        session.distance_km !== null &&
        session.distance_km !== undefined &&
        session.distance_km !== ""
    ) {

        details.push(
            formatDistance(
                session.distance_km
            )
        );

    }


    if (
        session.duration_minutes !== null &&
        session.duration_minutes !== undefined &&
        session.duration_minutes !== ""
    ) {

        details.push(
            formatMinutes(
                session.duration_minutes
            )
        );

    }


    if (
        session.pace !== null &&
        session.pace !== undefined &&
        session.pace !== ""
    ) {

        details.push(
            formatPace(
                session.pace
            )
        );

    }


    /*
     * Coach note.
     */

    const coachNote =
        getCoachNote(
            session.notes
        );


    return `

        <article
            class="
                workout-card
                ${stateClass}
            "
        >


            <!-- DATE -->

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



            <!-- RUN ICON -->

            <div class="workout-icon run-icon">

                <svg viewBox="0 0 24 24">

                    <path
                        d="M13 4a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"
                    ></path>

                    <path
                        d="M9 8l4-2 3 4"
                    ></path>

                    <path
                        d="M8 22l3-7 4-3"
                    ></path>

                    <path
                        d="M5 14l4-2"
                    ></path>

                </svg>

            </div>



            <!-- SESSION INFORMATION -->

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



                <!-- COACH NOTE -->

                ${
                    coachNote
                    ?
                    `
                    <div class="coach-note">

                        <span class="coach-note-label">

                            COACH NOTE

                        </span>


                        <div class="coach-note-text">

                            ${escapeHtml(
                                coachNote
                            ).replaceAll(
                                "\n",
                                "<br>"
                            )}

                        </div>

                    </div>
                    `
                    :
                    ""
                }



                <!-- TODAY -->

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



                <!-- FEEDBACK -->

                <button
                    class="feedback-button"
                    type="button"
                    onclick="
                        addSessionFeedback(
                            '${escapeAttribute(
                                session.id
                            )}'
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
   COACH NOTE
========================================= */

function getCoachNote(
    notes
) {

    if (
        !notes ||
        typeof notes !== "string"
    ) {

        return "";

    }


    /*
     * The Coach Note is everything
     * before Athlete feedback.
     */

    if (
        notes.includes(
            "Athlete feedback:"
        )
    ) {

        return notes
            .split(
                "Athlete feedback:"
            )[0]
            .trim();

    }


    return notes.trim();

}


/* =========================================
   ATHLETE FEEDBACK
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


/* =========================================
   ADD FEEDBACK
========================================= */

async function addSessionFeedback(
    sessionId
) {

    const session =
        currentSessions.find(
            function (item) {

                return (
                    String(
                        item.id
                    ) ===
                    String(
                        sessionId
                    )
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
        feedback === null
    ) {

        return;
    }


    const cleaned =
        feedback.trim();


    /*
     * Preserve the Coach Note.
     */

    const coachNote =
        getCoachNote(
            session.notes
        );


    let newNotes =
        coachNote;


    if (cleaned) {

        newNotes =
            coachNote
                ?
                (
                    coachNote +
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
   EXISTING BUTTON FUNCTIONS
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
   FORMATTING
========================================= */

function formatDistance(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "";

    }


    const number =
        Number(
            value
        );


    if (
        Number.isFinite(
            number
        )
    ) {

        return (
            number % 1 === 0
                ?
                number.toString()
                :
                number.toFixed(2)
                    .replace(
                        /0+$/,
                        ""
                    )
                    .replace(
                        /\.$/,
                        ""
                    )
        ) +
        " km";

    }


    return String(
        value
    ) +
    " km";

}


function formatMinutes(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "";

    }


    return (
        String(
            value
        ) +
        " min"
    );

}


function formatPace(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "";

    }


    const pace =
        String(
            value
        ).trim();


    /*
     * Do not add /km twice.
     */

    if (
        pace.toLowerCase()
            .includes(
                "/km"
            )
    ) {

        return pace;

    }


    return pace +
        " /km";

}


function formatWeeklyKm(
    value
) {

    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {

        return "";

    }


    return formatDistance(
        value
    );

}


/* =========================================
   DATE HELPERS
========================================= */

function parseDate(
    value
) {

    if (
        value instanceof Date
    ) {

        const result =
            new Date(
                value
            );

        result.setHours(
            0,
            0,
            0,
            0
        );

        return result;

    }


    const date =
        new Date(
            String(
                value
            ) +
            "T00:00:00"
        );


    date.setHours(
        0,
        0,
        0,
        0
    );


    return date;

}


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


    return parseDate(
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


function formatShortDate(
    value
) {

    if (!value) {
        return "";
    }


    return parseDate(
        value
    ).toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric"
        }
    );

}


/* =========================================
   SECURITY / TEXT
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


function escapeAttribute(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "\\",
            "\\\\"
        )
        .replaceAll(
            "'",
            "\\'"
        );

}


/* =========================================
   ERROR
========================================= */

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
   DYNAMIC STYLES
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

        /* EMPTY */

        .athlete-empty {

            color: #777;

            padding: 22px 4px;

            font-size: 13px;

        }


        /* WEEK */

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


        /* WEEKLY MILEAGE */

        .week-button .weekly-mileage {

            color: #C6FF00 !important;

            font-size: 9px !important;

            font-weight: 700;

            margin-top: 4px;

        }


        /* WEEK DATES */

        .week-button .week-dates {

            color: #777;

            font-size: 8px;

            font-weight: 400;

            text-transform: none;

            letter-spacing: 0;

        }


        /* CURRENT WEEK */

        .week-button.current-week {

            border-color:
                #C6FF00 !important;

        }


        /* PAST WEEK */

        .week-button.past-week {

            opacity: .42;

            filter: grayscale(.7);

        }


        /* PAST SESSION */

        .workout-card.past-workout {

            opacity: .42;

            filter: grayscale(.65);

            transition:
                opacity .25s ease;

        }


        /* TODAY */

        .workout-card.today-workout {

            border-color:
                #C6FF00 !important;

            box-shadow:
                0 0 0 1px
                rgba(
                    198,
                    255,
                    0,
                    .12
                );

        }


        .today-label {

            display: inline-block;

            margin-top: 7px;

            color: #C6FF00;

            font-size: 9px;

            font-weight: 800;

            letter-spacing: 1px;

        }


        /* COACH NOTE */

        .coach-note {

            margin-top: 10px;

            padding: 10px 12px;

            background:
                rgba(
                    255,
                    255,
                    255,
                    .035
                );

            border-left:
                2px solid
                #C6FF00;

            border-radius: 5px;

        }


        .coach-note-label {

            display: block;

            margin-bottom: 5px;

            color: #C6FF00;

            font-size: 8px;

            font-weight: 800;

            letter-spacing: 1px;

        }


        .coach-note-text {

            color: #aaa;

            font-size: 11px;

            line-height: 1.5;

            white-space: normal;

            overflow-wrap: anywhere;

            word-break: break-word;

        }


        /* FEEDBACK */

        .feedback-button {

            display: block;

            margin-top: 10px;

            background: transparent;

            color: #C6FF00;

            border:
                1px solid
                #333;

            border-radius: 7px;

            padding: 7px 10px;

            font-size: 10px;

            cursor: pointer;

        }


        .feedback-button:hover {

            border-color:
                #C6FF00;

        }

    `;


    document.head.appendChild(
        style
    );

                               }
