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
let workoutFeedback = {};


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function () {

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
   LOAD PAGE
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
   LOAD WEEKS + SESSIONS
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


    const title =
        document.querySelector(
            ".goal-main-info h2"
        );


    if (title) {

        title.textContent =
            currentGoal.goal_name ||
            "Current Goal";

    }


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
                ) + " min"
            );

        }


        description.textContent =
            parts.length
                ?
                parts.join(" — ")
                :
                "Training goal assigned by your coach.";

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


        renderSessions([]);

        return;
    }


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


    if (current) {
        return current.id;
    }


    const future =
        currentWeeks.find(
            function (week) {

                return (
                    week.start_date &&
                    parseDate(
                        week.start_date
                    ) > today
                );

            }
        );


    if (future) {
        return future.id;
    }


    return currentWeeks[
        currentWeeks.length - 1
    ].id;

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


    const week =
        currentWeeks.find(
            function (item) {
                return item.id === weekId;
            }
        );


    if (!week) {
        return;
    }


    renderWeeksOnly();

    renderSelectedWeek();

}


function renderWeeksOnly() {

    const selector =
        document.querySelector(
            ".week-selector"
        );


    if (!selector) {
        return;
    }


    selector
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
                return week.id === selectedWeekId;
            }
        );


    const buttons =
        selector.querySelectorAll(
            ".week-button"
        );


    if (
        index >= 0 &&
        buttons[index]
    ) {

        buttons[index].classList.add(
            "active"
        );

    }


    updateWeekIndicator();

}


/* =========================================
   SELECTED WEEK
========================================= */

function renderSelectedWeek() {

    const week =
        currentWeeks.find(
            function (item) {
                return item.id === selectedWeekId;
            }
        );


    if (!week) {

        renderSessions([]);

        return;
    }


    const sessions =
        currentSessions.filter(
            function (session) {

                return (
                    session.week_id ===
                    week.id
                );

            }
        );


    renderSessions(
        sessions
    );

}


/* =========================================
   WEEK INDICATOR
========================================= */

function updateWeekIndicator() {

    const fill =
        document.querySelector(
            ".week-indicator-fill"
        );


    if (!fill || !currentWeeks.length) {
        return;
    }


    const index =
        currentWeeks.findIndex(
            function (week) {

                return (
                    week.id ===
                    selectedWeekId
                );

            }
        );


    if (index < 0) {

        fill.style.width =
            "0%";

        return;
    }


    const percentage =
        currentWeeks.length === 1
            ?
            100
            :
            (
                index /
                (
                    currentWeeks.length - 1
                )
            ) *
            100;


    fill.style.width =
        Math.max(
            0,
            Math.min(
                100,
                percentage
            )
        ) +
        "%";

}


/* =========================================
   WEEK STATE
========================================= */

function getWeekState(
    week
) {

    if (
        !week.end_date
    ) {

        return "";

    }


    const today =
        startOfToday();

    const end =
        parseDate(
            week.end_date
        );


    if (end < today) {

        return "past-week";

    }


    if (
        week.start_date &&
        today >=
        parseDate(
            week.start_date
        ) &&
        today <= end
    ) {

        return "current-week";

    }


    return "";

}


/* =========================================
   SESSIONS
========================================= */

function renderSessions(
    sessions
) {

    const list =
        document.getElementById(
            "workoutList"
        );


    if (!list) {
        return;
    }


    if (!sessions.length) {

        list.innerHTML = `
            <div class="athlete-empty">
                No training sessions in this week yet.
            </div>
        `;

        return;
    }


    list.innerHTML =
        sessions
            .map(
                createSessionCard
            )
            .join("");

}


/* =========================================
   SESSION CARD
========================================= */

function createSessionCard(
    session
) {

    const sessionDate =
        parseDate(
            session.workout_date
        );


    const today =
        startOfToday();


    const isToday =
        sameDay(
            sessionDate,
            today
        );


    const isPast =
        sessionDate <
        today;


    const details =
        formatSessionDetails(
            session
        );


    const coachNote =
        getCoachNote(
            session.notes
        );


    const athleteFeedback =
        getAthleteFeedback(
            session.notes
        );


    return `

        <article
            class="
                workout-card
                ${isToday ? "today-workout" : ""}
                ${isPast ? "past-workout" : ""}
            "
        >

            <div class="workout-day">

                <strong>
                    ${escapeHtml(
                        formatDay(
                            session.workout_date
                        )
                    )}
                </strong>

                <span>
                    ${escapeHtml(
                        formatShortDate(
                            session.workout_date
                        )
                    )}
                </span>

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

            </div>


            <div class="workout-icon">

                ${getWorkoutIcon(
                    session.workout_type
                )}

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
                    details
                    ?
                    `
                    <div class="workout-details">
                        ${escapeHtml(
                            details
                        )}
                    </div>
                    `
                    :
                    ""
                }


                ${
                    session.notes &&
                    !coachNote &&
                    !athleteFeedback
                    ?
                    `
                    <div class="workout-description">
                        ${escapeHtml(
                            session.notes
                        )}
                    </div>
                    `
                    :
                    ""
                }


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


                ${
                    athleteFeedback
                    ?
                    `
                    <div class="athlete-feedback">

                        <span class="athlete-feedback-label">
                            YOUR FEEDBACK
                        </span>

                        <div class="athlete-feedback-text">
                            ${escapeHtml(
                                athleteFeedback
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


                <button
                    type="button"
                    class="feedback-button"
                    onclick="
                        addFeedback(
                            '${escapeAttribute(
                                session.id
                            )}'
                        )
                    "
                >

                    ${
                        athleteFeedback
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
   SESSION DETAILS
========================================= */

function formatSessionDetails(
    session
) {

    const parts = [];


    if (
        session.distance_km !== null &&
        session.distance_km !== undefined &&
        session.distance_km !== ""
    ) {

        parts.push(
            `${session.distance_km} km`
        );

    }


    if (
        session.duration_minutes !== null &&
        session.duration_minutes !== undefined &&
        session.duration_minutes !== ""
    ) {

        parts.push(
            `${session.duration_minutes} min`
        );

    }


    if (
        session.pace !== null &&
        session.pace !== undefined &&
        session.pace !== ""
    ) {

        parts.push(
            `${session.pace} /km`
        );

    }


    return parts.join(
        " • "
    );

}


/* =========================================
   FEEDBACK
========================================= */

async function addFeedback(
    sessionId
) {

    const session =
        currentSessions.find(
            function (item) {
                return (
                    String(item.id) ===
                    String(sessionId)
                );
            }
        );


    if (!session) {
        return;
    }


    const existingText =
        getAthleteFeedback(
            session.notes
        );


    /* =====================================
       LOAD OPTIONAL STRUCTURED FEEDBACK
    ====================================== */

    let structuredFeedback =
        null;


    try {

        const {
            data,
            error
        } =
            await goalSupabase
                .from(
                    "workout_feedback"
                )
                .select(`
                    id,
                    workout_id,
                    athlete_id,
                    feeling,
                    effort,
                    comment
                `)
                .eq(
                    "workout_id",
                    session.id
                )
                .maybeSingle();


        if (!error) {
            structuredFeedback =
                data;
        }

    } catch (error) {

        console.error(
            "Could not load structured feedback:",
            error
        );

    }


    const modal =
        document.createElement(
            "div"
        );


    modal.className =
        "feedback-modal";


    modal.innerHTML = `

        <div class="feedback-modal-box">

            <h3>
                ${
                    existingText
                        ? "Edit Feedback"
                        : "Add Feedback"
                }
            </h3>


            <label class="feedback-field-label">
                Anything we should know?
            </label>


            <textarea
                id="feedbackInput"
                placeholder="Wind, weather, how the session felt, anything unusual..."
            >${escapeHtml(
                existingText
            )}</textarea>


            <!-- OPTIONAL EXTENDED FEEDBACK -->

            <button
                type="button"
                class="more-feedback-button"
                id="moreFeedbackButton"
            >
                + Give more feedback
            </button>


            <div
                class="extended-feedback"
                id="extendedFeedback"
                ${
                    structuredFeedback
                        ? ""
                        : "hidden"
                }
            >

                <div class="extended-feedback-title">
                    How did the session feel?
                </div>


                <div class="feeling-options">

                    <button
                        type="button"
                        class="feeling-option ${
                            structuredFeedback?.feeling ===
                            "great"
                                ? "selected"
                                : ""
                        }"
                        data-feeling="great"
                    >
                        😄
                        <span>Great</span>
                    </button>


                    <button
                        type="button"
                        class="feeling-option ${
                            structuredFeedback?.feeling ===
                            "good"
                                ? "selected"
                                : ""
                        }"
                        data-feeling="good"
                    >
                        🙂
                        <span>Good</span>
                    </button>


                    <button
                        type="button"
                        class="feeling-option ${
                            structuredFeedback?.feeling ===
                            "okay"
                                ? "selected"
                                : ""
                        }"
                        data-feeling="okay"
                    >
                        😐
                        <span>Okay</span>
                    </button>


                    <button
                        type="button"
                        class="feeling-option ${
                            structuredFeedback?.feeling ===
                            "bad"
                                ? "selected"
                                : ""
                        }"
                        data-feeling="bad"
                    >
                        😣
                        <span>Bad</span>
                    </button>

                </div>


                <div class="effort-section">

                    <div class="effort-header">

                        <span>
                            Effort
                        </span>

                        <strong
                            id="effortValue"
                        >
                            ${
                                structuredFeedback?.effort ||
                                5
                            }/10
                        </strong>

                    </div>


                    <input
                        id="effortInput"
                        type="range"
                        min="1"
                        max="10"
                        step="1"
                        value="${
                            structuredFeedback?.effort ||
                            5
                        }"
                    >

                    <div class="effort-labels">
                        <span>Easy</span>
                        <span>Hard</span>
                    </div>

                </div>

            </div>


            <div class="feedback-modal-buttons">

                <button
                    type="button"
                    class="feedback-cancel"
                >
                    Cancel
                </button>


                <button
                    type="button"
                    class="feedback-save"
                >
                    Save Feedback
                </button>

            </div>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const textarea =
        modal.querySelector(
            "#feedbackInput"
        );


    const extended =
        modal.querySelector(
            "#extendedFeedback"
        );


    const moreButton =
        modal.querySelector(
            "#moreFeedbackButton"
        );


    const effortInput =
        modal.querySelector(
            "#effortInput"
        );


    const effortValue =
        modal.querySelector(
            "#effortValue"
        );


    let selectedFeeling =
        structuredFeedback?.feeling ||
        null;


    /* =====================================
       SHOW / HIDE EXTENDED FEEDBACK
    ====================================== */

    moreButton.onclick =
        function () {

            const isHidden =
                extended.hidden;


            extended.hidden =
                !isHidden;


            moreButton.textContent =
                isHidden
                    ? "− Hide extra feedback"
                    : "+ Give more feedback";

        };


    if (structuredFeedback) {

        moreButton.textContent =
            "− Hide extra feedback";

    }


    /* =====================================
       FEELING SELECTION
    ====================================== */

    modal
        .querySelectorAll(
            ".feeling-option"
        )
        .forEach(
            function (button) {

                button.onclick =
                    function () {

                        modal
                            .querySelectorAll(
                                ".feeling-option"
                            )
                            .forEach(
                                function (item) {

                                    item.classList.remove(
                                        "selected"
                                    );

                                }
                            );


                        button.classList.add(
                            "selected"
                        );


                        selectedFeeling =
                            button.dataset.feeling;

                    };

            }
        );


    /* =====================================
       EFFORT SLIDER
    ====================================== */

    effortInput.oninput =
        function () {

            effortValue.textContent =
                effortInput.value +
                "/10";

        };


    /* =====================================
       CANCEL
    ====================================== */

    modal
        .querySelector(
            ".feedback-cancel"
        )
        .onclick =
        function () {

            modal.remove();

        };


    /* =====================================
       SAVE
    ====================================== */

    modal
        .querySelector(
            ".feedback-save"
        )
        .onclick =
        async function () {

            const feedbackText =
                textarea.value.trim();


            /*
             * Text is optional if athlete
             * provided structured feedback.
             */

            if (
                !feedbackText &&
                extended.hidden
            ) {

                alert(
                    "Please enter some feedback or use the optional feedback section."
                );

                return;
            }


            /* =================================
               SAVE EXISTING TEXT FEEDBACK
            ================================== */

            if (feedbackText) {

                const newNotes =
                    setAthleteFeedback(
                        session.notes,
                        feedbackText
                    );


                const {
                    data,
                    error
                } =
                    await goalSupabase
                        .from("workouts")
                        .update({
                            notes:
                                newNotes
                        })
                        .eq(
                            "id",
                            session.id
                        )
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
                        .maybeSingle();


                if (error) {

                    console.error(
                        "Feedback save error:",
                        error
                    );


                    alert(
                        "Could not save feedback."
                    );

                    return;
                }


                if (data) {

                    const index =
                        currentSessions
                            .findIndex(
                                function (item) {

                                    return (
                                        String(
                                            item.id
                                        ) ===
                                        String(
                                            session.id
                                        )
                                    );

                                }
                            );


                    if (index >= 0) {

                        currentSessions[index] =
                            data;

                    }

                }

            }


            /* =================================
               SAVE OPTIONAL EXTRA FEEDBACK
            ================================== */

            if (!extended.hidden) {

                const {
                    data: {
                        user
                    }
                } =
                    await goalSupabase
                        .auth
                        .getUser();


                if (!user) {

                    alert(
                        "Please log in again."
                    );

                    return;
                }


                const {
                    error:
                        structuredError
                } =
                    await goalSupabase
                        .from(
                            "workout_feedback"
                        )
                        .upsert(
                            {

                                workout_id:
                                    session.id,

                                athlete_id:
                                    user.id,

                                feeling:
                                    selectedFeeling,

                                effort:
                                    Number(
                                        effortInput.value
                                    ),

                                comment:
                                    feedbackText ||
                                    null,

                                updated_at:
                                    new Date()
                                        .toISOString()

                            },
                            {

                                onConflict:
                                    "workout_id,athlete_id"

                            }
                        );


                if (structuredError) {

                    console.error(
                        "Structured feedback error:",
                        structuredError
                    );


                    alert(
                        "Your text feedback was saved, but the additional feedback could not be saved."
                    );

                    return;

                }

            }


            modal.remove();


            renderSelectedWeek();

        };

}


/* =========================================
   NOTES FORMAT
========================================= */

function getCoachNote(
    notes
) {

    if (!notes) {
        return "";
    }


    const text =
        String(
            notes
        );


    const match =
        text.match(
            /\[COACH_NOTE\]([\s\S]*?)(?=\[ATHLETE_FEEDBACK\]|$)/
        );


    if (match) {

        return match[1].trim();

    }


    /*
     * Backwards compatibility:
     * notes without our markers are
     * treated as coach notes.
     */

    if (
        !text.includes(
            "[ATHLETE_FEEDBACK]"
        )
    ) {

        return text.trim();

    }


    return "";

}


function getAthleteFeedback(
    notes
) {

    if (!notes) {
        return "";
    }


    const text =
        String(
            notes
        );


    const match =
        text.match(
            /\[ATHLETE_FEEDBACK\]([\s\S]*)$/
        );


    return match
        ?
        match[1].trim()
        :
        "";

}


function setAthleteFeedback(
    notes,
    feedback
) {

    const existingCoachNote =
        getCoachNote(
            notes
        );


    const cleanCoachNote =
        existingCoachNote
            .replace(
                /^\[COACH_NOTE\]/,
                ""
            )
            .trim();


    return (
        "[COACH_NOTE]\n" +
        cleanCoachNote +
        "\n\n" +
        "[ATHLETE_FEEDBACK]\n" +
        feedback
    ).trim();

}


/* =========================================
   ICONS
========================================= */

function getWorkoutIcon(
    type
) {

    const value =
        String(
            type || ""
        ).toLowerCase();


    if (
        value.includes("interval")
    ) {

        return `

            <svg
                viewBox="0 0 24 24"
            >

                <rect
                    x="4"
                    y="8"
                    width="16"
                    height="8"
                    rx="2"
                ></rect>

                <path
                    d="M8 12h8"
                ></path>

                <path
                    d="M10 10l-2 2 2 2"
                ></path>

                <path
                    d="M14 10l2 2-2 2"
                ></path>

            </svg>

        `;

    }


    if (
        value.includes("strength")
    ) {

        return `

            <svg
                viewBox="0 0 24 24"
            >

                <path
                    d="M6 9v6"
                ></path>

                <path
                    d="M4 10v4"
                ></path>

                <path
                    d="M18 9v6"
                ></path>

                <path
                    d="M20 10v4"
                ></path>

                <path
                    d="M6 12h12"
                ></path>

            </svg>

        `;

    }


    return `

        <svg
            viewBox="0 0 24 24"
        >

            <circle
                cx="12"
                cy="12"
                r="8"
            ></circle>

            <path
                d="M12 4c2 3 2 6 0 9"
            ></path>

            <path
                d="M12 13l4 4"
            ></path>

        </svg>

    `;

}


/* =========================================
   DATE HELPERS
========================================= */

function parseDate(
    value
) {

    if (!value) {
        return new Date(
            NaN
        );
    }


    const parts =
        String(
            value
        ).split("-");


    if (
        parts.length === 3
    ) {

        return new Date(
            Number(parts[0]),
            Number(parts[1]) - 1,
            Number(parts[2])
        );

    }


    const date =
        new Date(
            value
        );


    return new Date(
        date.getFullYear(),
        date.getMonth(),
        date.getDate()
    );

}


function startOfToday() {

    const now =
        new Date();

    return new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate()
    );

}


function sameDay(
    a,
    b
) {

    return (
        a &&
        b &&
        a.getFullYear() ===
            b.getFullYear() &&
        a.getMonth() ===
            b.getMonth() &&
        a.getDate() ===
            b.getDate()
    );

}


function formatDate(
    value
) {

    const date =
        parseDate(
            value
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "Not set";

    }


    return date.toLocaleDateString(
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

    const date =
        parseDate(
            value
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric"
        }
    );

}


function formatDay(
    value
) {

    const date =
        parseDate(
            value
        );


    if (
        isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date
        .toLocaleDateString(
            "en-US",
            {
                weekday: "short"
            }
        )
        .toUpperCase();

}


/* =========================================
   FORMAT
========================================= */

function formatDistance(
    distance
) {

    const value =
        Number(
            distance
        );


    if (
        !Number.isNaN(
            value
        )
    ) {

        return `${value} km`;

    }


    return `${distance} km`;

}


function formatWeeklyKm(
    km
) {

    return `${km} km`;

}


/* =========================================
   SECURITY HELPERS
========================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            "&quot;"
        );

}


/* =========================================
   ERROR
========================================= */

function showError(
    message
) {

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
