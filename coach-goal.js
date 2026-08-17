const SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


const params =
    new URLSearchParams(
        window.location.search
    );

const goalId =
    params.get("goal_id");


let goal = null;
let weeks = [];
let sessions = [];

let currentWeekId = null;
let currentEditingSessionId = null;
let currentEditingWeekId = null;


/* =========================================
   OPEN WEEKS
========================================= */

let openWeekIds =
    new Set();


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        if (!goalId) {

            showError(
                "No goal was selected."
            );

            return;
        }

        await loadGoal();

    }
);


/* =========================================
   LOAD GOAL
========================================= */

async function loadGoal() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("goals")
            .select(`
                id,
                athlete_id,
                program_id,
                goal_name,
                distance,
                target_time,
                target_date,
                progress
            `)
            .eq(
                "id",
                goalId
            )
            .maybeSingle();


    if (error) {

        showError(
            error.message
        );

        return;
    }


    if (!data) {

        showError(
            "Goal could not be found."
        );

        return;
    }


    goal = data;


    if (!goal.program_id) {

        const program =
            await createProgramForGoal();

        if (!program) {
            return;
        }

    }


    renderGoal();

    await loadWeeks();

}


/* =========================================
   CREATE PROGRAM
========================================= */

async function createProgramForGoal() {

    const today =
        new Date()
            .toISOString()
            .split("T")[0];


    const {
        data,
        error
    } =
        await supabaseClient
            .from("programs")
            .insert({

                athlete_id:
                    goal.athlete_id,

                name:
                    goal.goal_name ||
                    "Training Program",

                start_date:
                    today,

                end_date:
                    goal.target_date ||
                    null,

                status:
                    "active"

            })
            .select()
            .single();


    if (error) {

        showError(
            error.message
        );

        return null;
    }


    const {
        error: updateError
    } =
        await supabaseClient
            .from("goals")
            .update({
                program_id:
                    data.id
            })
            .eq(
                "id",
                goal.id
            );


    if (updateError) {

        showError(
            updateError.message
        );

        return null;
    }


    goal.program_id =
        data.id;


    return data;

}


/* =========================================
   GOAL
========================================= */

function renderGoal() {

    const progress =
        Math.max(
            0,
            Math.min(
                100,
                Number(
                    goal.progress || 0
                )
            )
        );


    document.getElementById(
        "goalHeader"
    ).innerHTML = `

        <div class="goal-top">

            <div class="goal-title-area">

                <div class="goal-icon">
                    ◎
                </div>

                <div class="goal-name">
                    ${escapeHtml(
                        goal.goal_name ||
                        "Goal"
                    )}
                </div>

            </div>


            <div class="goal-actions">

                <button
                    class="edit-goal-button"
                    onclick="editGoal()"
                >
                    ✎ Edit Goal
                </button>

                <button
                    class="delete-goal-button"
                    onclick="deleteGoal()"
                >
                    🗑 Delete Goal
                </button>

            </div>

        </div>


        <div class="goal-info">

            <div class="goal-details">

                <div>

                    <div class="detail-label">
                        Distance
                    </div>

                    <div class="detail-value">
                        ${escapeHtml(
                            goal.distance || ""
                        )}
                    </div>

                </div>


                <div>

                    <div class="detail-label">
                        Goal Time
                    </div>

                    <div class="detail-value">
                        ${escapeHtml(
                            goal.target_time || ""
                        )}
                    </div>

                </div>


                <div>

                    <div class="detail-label">
                        Goal Date
                    </div>

                    <div class="detail-value">
                        ${
                            goal.target_date
                            ?
                            formatDate(
                                goal.target_date
                            )
                            :
                            "Not set"
                        }
                    </div>

                </div>


                <div>

                    <div class="detail-label">
                        Progress
                    </div>

                    <div class="detail-value">
                        ${progress}%
                    </div>

                </div>

            </div>


            <div class="progress-row">

                <div class="progress-bar">

                    <div
                        class="progress-fill"
                        style="width:${progress}%"
                    ></div>

                </div>

                <div class="progress-number">
                    ${progress}%
                </div>

            </div>

        </div>

    `;

}


/* =========================================
   LOAD WEEKS
========================================= */

async function loadWeeks() {

    const {
        data: weekData,
        error: weekError
    } =
        await supabaseClient
            .from("training_weeks")
            .select(`
                id,
                program_id,
                week_number,
                start_date,
                end_date,
                weekly_km,
                created_at
            `)
            .eq(
                "program_id",
                goal.program_id
            )
            .order(
                "week_number",
                {
                    ascending: true
                }
            );


    if (weekError) {

        showWeeksError(
            weekError.message
        );

        return;
    }


    weeks =
        weekData || [];


    if (weeks.length) {

        const weekIds =
            weeks.map(
                week => week.id
            );


        const {
            data: sessionData,
            error: sessionError
        } =
            await supabaseClient
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


        if (sessionError) {

            showWeeksError(
                sessionError.message
            );

            return;
        }


        sessions =
            sessionData || [];

    } else {

        sessions = [];

    }


    renderWeeks();

}


/* =========================================
   RENDER WEEKS
========================================= */

function renderWeeks() {

    const container =
        document.getElementById(
            "weeksList"
        );


    if (!weeks.length) {

        container.innerHTML = `

            <div class="empty">

                No training weeks yet.

                <br><br>

                Click
                <strong>+ Add Week</strong>
                to create Week 1.

            </div>

        `;

        return;
    }


    container.innerHTML =
        weeks
            .map(
                createWeekCard
            )
            .join("");


    /*
       Restore the open/closed state
       after every reload.
    */

    weeks.forEach(
        function(week) {

            if (
                openWeekIds.has(
                    week.id
                )
            ) {

                const element =
                    document.getElementById(
                        "week-" +
                        week.id
                    );

                if (element) {

                    element.classList.add(
                        "open"
                    );

                }

            }

        }
    );

}


/* =========================================
   CREATE WEEK
========================================= */

function createWeekCard(
    week
) {

    const weekSessions =
        sessions
            .filter(
                session =>
                    session.week_id ===
                    week.id
            )
            .sort(
                (a, b) =>
                    new Date(
                        a.workout_date
                    ) -
                    new Date(
                        b.workout_date
                    )
            );


    let weekDateText =
        "Dates not set";


    if (
        week.start_date &&
        week.end_date
    ) {

        weekDateText =
            formatDate(
                week.start_date
            ) +
            " – " +
            formatDate(
                week.end_date
            );

    } else if (
        week.start_date
    ) {

        weekDateText =
            formatDate(
                week.start_date
            );

    }


    const kmText =
        week.weekly_km !== null &&
        week.weekly_km !== undefined &&
        week.weekly_km !== ""
        ?
        week.weekly_km +
        " km"
        :
        "— km";


    return `

        <div
            class="week-card"
            id="week-${week.id}"
        >


            <div
                class="week-header"
                onclick="
                    toggleWeek(
                        '${week.id}'
                    )
                "
            >

                <div class="week-arrow">
                    ›
                </div>


                <div class="week-title">
                    Week ${week.week_number}
                </div>


                <div class="week-dates">
                    ${escapeHtml(
                        weekDateText
                    )}
                </div>


                <div class="week-km">
                    ${escapeHtml(
                        String(kmText)
                    )}
                </div>


                <div
                    class="week-actions"
                    onclick="
                        event.stopPropagation()
                    "
                >

                    <button
                        class="add-session-button"
                        onclick="
                            openSessionModal(
                                '${week.id}'
                            )
                        "
                    >
                        + Add Session
                    </button>


                    <button
                        class="edit-week-button"
                        onclick="
                            editWeek(
                                '${week.id}'
                            )
                        "
                    >
                        ✎ Edit
                    </button>


                    <button
                        class="delete-week-button"
                        onclick="
                            deleteWeek(
                                '${week.id}'
                            )
                        "
                    >
                        🗑 Delete
                    </button>

                </div>

            </div>


            <div class="sessions">

                ${
                    weekSessions.length
                    ?
                    weekSessions
                        .map(
                            createSessionCard
                        )
                        .join("")
                    :
                    `
                    <div class="no-sessions">
                        No sessions in this week yet.
                    </div>
                    `
                }

            </div>

        </div>

    `;

}


/* =========================================
   SESSION CARD
========================================= */

function createSessionCard(
    session
) {

    const date =
        new Date(
            session.workout_date +
            "T00:00:00"
        );


    const day =
        date.toLocaleDateString(
            "en-US",
            {
                weekday: "short"
            }
        );


    const dateText =
        date.toLocaleDateString(
            "en-US",
            {
                day: "numeric",
                month: "short"
            }
        );


    const details = [

        session.distance_km
            ?
            session.distance_km +
            " km"
            :
            null,

        session.duration_minutes
            ?
            session.duration_minutes +
            " min"
            :
            null,

        session.pace
            ?
            session.pace +
            "/km"
            :
            null

    ]
        .filter(Boolean)
        .join(" • ");


    return `

        <div class="session-card">

            <div class="session-date">

                <div class="session-day">
                    ${day}
                </div>

                <div class="session-date-number">
                    ${dateText}
                </div>

            </div>


            <div class="session-content">

                <div class="session-title">

                    ${escapeHtml(
                        session.title
                    )}

                </div>


                <div class="session-details">

                    ${escapeHtml(
                        session.workout_type ||
                        ""
                    )}

                    ${
                        details
                        ?
                        " • " +
                        escapeHtml(
                            details
                        )
                        :
                        ""
                    }

                </div>


                ${
                    session.notes
                    ?
                    `
                    <div class="session-notes">

                        <div class="session-notes-label">
                            Notes
                        </div>

                        <div class="session-notes-box">
                            ${escapeHtml(
                                session.notes
                            )}
                        </div>

                    </div>
                    `
                    :
                    ""
                }

            </div>


            <div class="session-actions">

                <button
                    class="edit-session-button"
                    onclick="
                        editSession(
                            '${session.id}'
                        )
                    "
                >
                    ✎ Edit
                </button>


                <button
                    class="delete-session-button"
                    onclick="
                        deleteSession(
                            '${session.id}'
                        )
                    "
                >
                    🗑 Delete
                </button>

            </div>

        </div>

    `;

}


/* =========================================
   ADD WEEK
========================================= */

function addWeek() {

    currentEditingWeekId =
        null;


    document.getElementById(
        "weekModalTitle"
    ).textContent =
        "New Week";


    document.getElementById(
        "weekStartDate"
    ).value = "";


    document.getElementById(
        "weekEndDate"
    ).value = "";


    document.getElementById(
        "weekKm"
    ).value = "";


    document
        .getElementById(
            "weekModal"
        )
        .classList.add(
            "show"
        );

}


/* =========================================
   SAVE WEEK
========================================= */

async function saveWeek() {

    const startDate =
        document.getElementById(
            "weekStartDate"
        ).value;


    const endDate =
        document.getElementById(
            "weekEndDate"
        ).value;


    const weeklyKm =
        document.getElementById(
            "weekKm"
        ).value;


    if (!startDate) {

        alert(
            "Please select a start date."
        );

        return;
    }


    if (!endDate) {

        alert(
            "Please select an end date."
        );

        return;
    }


    if (
        new Date(startDate) >
        new Date(endDate)
    ) {

        alert(
            "The end date must be after the start date."
        );

        return;
    }


    const weekData = {

        start_date:
            startDate,

        end_date:
            endDate,

        weekly_km:
            weeklyKm !== ""
            ?
            Number(weeklyKm)
            :
            null

    };


    let error = null;

    let newWeekId = null;


    if (currentEditingWeekId) {

        const result =
            await supabaseClient
                .from("training_weeks")
                .update(
                    weekData
                )
                .eq(
                    "id",
                    currentEditingWeekId
                );

        error =
            result.error;

        newWeekId =
            currentEditingWeekId;

    } else {

        const nextNumber =
            weeks.length
            ?
            Math.max(
                ...weeks.map(
                    week =>
                        Number(
                            week.week_number
                        )
                )
            ) + 1
            :
            1;


        const result =
            await supabaseClient
                .from("training_weeks")
                .insert({

                    program_id:
                        goal.program_id,

                    week_number:
                        nextNumber,

                    ...weekData

                })
                .select()
                .single();


        error =
            result.error;


        if (result.data) {

            newWeekId =
                result.data.id;

        }

    }


    if (error) {

        alert(
            "Could not save week:\n\n" +
            error.message
        );

        return;
    }


    closeWeekModal();


    if (newWeekId) {

        openWeekIds.add(
            newWeekId
        );

    }


    await loadWeeks();

}


/* =========================================
   EDIT WEEK
========================================= */

function editWeek(
    weekId
) {

    const week =
        weeks.find(
            item =>
                item.id ===
                weekId
        );


    if (!week) {
        return;
    }


    currentEditingWeekId =
        weekId;


    document.getElementById(
        "weekModalTitle"
    ).textContent =
        "Edit Week";


    document.getElementById(
        "weekStartDate"
    ).value =
        week.start_date ||
        "";


    document.getElementById(
        "weekEndDate"
    ).value =
        week.end_date ||
        "";


    document.getElementById(
        "weekKm"
    ).value =
        week.weekly_km ??
        "";


    document
        .getElementById(
            "weekModal"
        )
        .classList.add(
            "show"
        );

}


/* =========================================
   CLOSE WEEK MODAL
========================================= */

function closeWeekModal() {

    document
        .getElementById(
            "weekModal"
        )
        .classList.remove(
            "show"
        );


    currentEditingWeekId =
        null;

}


/* =========================================
   DELETE WEEK
========================================= */

async function deleteWeek(
    weekId
) {

    const week =
        weeks.find(
            item =>
                item.id ===
                weekId
        );


    if (!week) {
        return;
    }


    const confirmed =
        confirm(
            "Delete Week " +
            week.week_number +
            " and all sessions inside it?"
        );


    if (!confirmed) {
        return;
    }


    const {
        error: sessionError
    } =
        await supabaseClient
            .from("workouts")
            .delete()
            .eq(
                "week_id",
                weekId
            );


    if (sessionError) {

        alert(
            sessionError.message
        );

        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("training_weeks")
            .delete()
            .eq(
                "id",
                weekId
            );


    if (error) {

        alert(
            error.message
        );

        return;
    }


    openWeekIds.delete(
        weekId
    );


    /*
       Renumber remaining weeks:
       1, 2, 3, 4...
    */

    const {
        data: remainingWeeks,
        error: loadError
    } =
        await supabaseClient
            .from("training_weeks")
            .select("id, week_number")
            .eq(
                "program_id",
                goal.program_id
            )
            .order(
                "week_number",
                {
                    ascending: true
                }
            );


    if (loadError) {

        alert(
            loadError.message
        );

        return;
    }


    for (
        let i = 0;
        i < remainingWeeks.length;
        i++
    ) {

        const newNumber =
            i + 1;


        if (
            Number(
                remainingWeeks[i].week_number
            ) !== newNumber
        ) {

            const {
                error: renameError
            } =
                await supabaseClient
                    .from("training_weeks")
                    .update({

                        week_number:
                            newNumber

                    })
                    .eq(
                        "id",
                        remainingWeeks[i].id
                    );


            if (renameError) {

                alert(
                    renameError.message
                );

                return;
            }

        }

    }


    await loadWeeks();

}


/* =========================================
   TOGGLE WEEK
========================================= */

function toggleWeek(
    weekId
) {

    const element =
        document.getElementById(
            "week-" +
            weekId
        );


    if (!element) {
        return;
    }


    if (
        openWeekIds.has(
            weekId
        )
    ) {

        openWeekIds.delete(
            weekId
        );

        element.classList.remove(
            "open"
        );

    } else {

        openWeekIds.add(
            weekId
        );

        element.classList.add(
            "open"
        );

    }

}


function openWeek(
    weekId
) {

    openWeekIds.add(
        weekId
    );


    const element =
        document.getElementById(
            "week-" +
            weekId
        );


    if (element) {

        element.classList.add(
            "open"
        );

    }

}


/* =========================================
   SESSION MODAL
========================================= */

function openSessionModal(
    weekId
) {

    currentWeekId =
        weekId;

    currentEditingSessionId =
        null;


    document.getElementById(
        "sessionModalTitle"
    ).textContent =
        "New Session";


    document.getElementById(
        "sessionDate"
    ).value = "";


    document.getElementById(
        "sessionTitle"
    ).value = "";


    document.getElementById(
        "sessionType"
    ).value =
        "Easy Run";


    document.getElementById(
        "sessionDistance"
    ).value = "";


    document.getElementById(
        "sessionDuration"
    ).value = "";


    document.getElementById(
        "sessionPace"
    ).value = "";


    document.getElementById(
        "sessionNotes"
    ).value = "";


    document.querySelector(
        "#sessionModal .save-button"
    ).textContent =
        "Save Session";


    document
        .getElementById(
            "sessionModal"
        )
        .classList.add(
            "show"
        );

}


function closeSessionModal() {

    document
        .getElementById(
            "sessionModal"
        )
        .classList.remove(
            "show"
        );


    currentWeekId =
        null;

    currentEditingSessionId =
        null;

}


/* =========================================
   SAVE SESSION
========================================= */

async function saveSession() {

    if (!currentWeekId) {

        alert(
            "No training week selected."
        );

        return;
    }


    const savedWeekId =
        currentWeekId;


    const editingId =
        currentEditingSessionId;


    const date =
        document.getElementById(
            "sessionDate"
        ).value;


    const title =
        document.getElementById(
            "sessionTitle"
        ).value
        .trim();


    const type =
        document.getElementById(
            "sessionType"
        ).value;


    const distance =
        document.getElementById(
            "sessionDistance"
        ).value;


    const duration =
        document.getElementById(
            "sessionDuration"
        ).value;


    const pace =
        document.getElementById(
            "sessionPace"
        ).value
        .trim();


    const notes =
        document.getElementById(
            "sessionNotes"
        ).value
        .trim();


    if (!date) {

        alert(
            "Please select a date."
        );

        return;
    }


    if (!title) {

        alert(
            "Please enter a session title."
        );

        return;
    }


    const sessionData = {

        athlete_id:
            goal.athlete_id,

        week_id:
            savedWeekId,

        workout_date:
            date,

        workout_type:
            type,

        title:
            title,

        distance_km:
            distance
            ?
            Number(distance)
            :
            null,

        duration_minutes:
            duration
            ?
            Number(duration)
            :
            null,

        pace:
            pace ||
            null,

        notes:
            notes ||
            null

    };


    let error = null;


    if (editingId) {

        const result =
            await supabaseClient
                .from("workouts")
                .update(
                    sessionData
                )
                .eq(
                    "id",
                    editingId
                );

        error =
            result.error;

    } else {

        const result =
            await supabaseClient
                .from("workouts")
                .insert({

                    ...sessionData,

                    completed:
                        false

                });

        error =
            result.error;

    }


    if (error) {

        alert(
            "Could not save session:\n\n" +
            error.message
        );

        return;
    }


    closeSessionModal();


    openWeekIds.add(
        savedWeekId
    );


    await loadWeeks();

}


/* =========================================
   EDIT SESSION
========================================= */

function editSession(
    sessionId
) {

    const session =
        sessions.find(
            item =>
                item.id ===
                sessionId
        );


    if (!session) {
        return;
    }


    currentWeekId =
        session.week_id;


    currentEditingSessionId =
        session.id;


    openWeekIds.add(
        session.week_id
    );


    document.getElementById(
        "sessionModalTitle"
    ).textContent =
        "Edit Session";


    document.getElementById(
        "sessionDate"
    ).value =
        session.workout_date ||
        "";


    document.getElementById(
        "sessionTitle"
    ).value =
        session.title ||
        "";


    document.getElementById(
        "sessionType"
    ).value =
        session.workout_type ||
        "Easy Run";


    document.getElementById(
        "sessionDistance"
    ).value =
        session.distance_km ??
        "";


    document.getElementById(
        "sessionDuration"
    ).value =
        session.duration_minutes ??
        "";


    document.getElementById(
        "sessionPace"
    ).value =
        session.pace ||
        "";


    document.getElementById(
        "sessionNotes"
    ).value =
        session.notes ||
        "";


    document.querySelector(
        "#sessionModal .save-button"
    ).textContent =
        "Update Session";


    document
        .getElementById(
            "sessionModal"
        )
        .classList.add(
            "show"
        );

}


/* =========================================
   DELETE SESSION
========================================= */

async function deleteSession(
    sessionId
) {

    const confirmed =
        confirm(
            "Delete this session?"
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("workouts")
            .delete()
            .eq(
                "id",
                sessionId
            );


    if (error) {

        alert(
            error.message
        );

        return;
    }


    await loadWeeks();

}


/* =========================================
   GOAL EDIT
========================================= */

function editGoal() {

    document.getElementById(
        "goalNameInput"
    ).value =
        goal.goal_name ||
        "";


    document.getElementById(
        "goalDistanceInput"
    ).value =
        goal.distance ||
        "";


    document.getElementById(
        "goalTimeInput"
    ).value =
        goal.target_time ||
        "";


    document.getElementById(
        "goalDateInput"
    ).value =
        goal.target_date ||
        "";


    document
        .getElementById(
            "goalModal"
        )
        .classList.add(
            "show"
        );

}


function closeGoalModal() {

    document
        .getElementById(
            "goalModal"
        )
        .classList.remove(
            "show"
        );

}


async function saveGoal() {

    const goalName =
        document.getElementById(
            "goalNameInput"
        ).value
        .trim();


    const distance =
        document.getElementById(
            "goalDistanceInput"
        ).value
        .trim();


    const targetTime =
        document.getElementById(
            "goalTimeInput"
        ).value
        .trim();


    const targetDate =
        document.getElementById(
            "goalDateInput"
        ).value;


    if (!goalName) {

        alert(
            "Please enter a goal name."
        );

        return;
    }


    const {
        data,
        error
    } =
        await supabaseClient
            .from("goals")
            .update({

                goal_name:
                    goalName,

                distance:
                    distance,

                target_time:
                    targetTime ||
                    null,

                target_date:
                    targetDate ||
                    null

            })
            .eq(
                "id",
                goal.id
            )
            .select()
            .single();


    if (error) {

        alert(
            error.message
        );

        return;
    }


    goal =
        data;


    closeGoalModal();

    renderGoal();

}


/* =========================================
   DELETE GOAL
========================================= */

async function deleteGoal() {

    const confirmed =
        confirm(
            "Delete this goal and its training plan?"
        );


    if (!confirmed) {
        return;
    }


    if (goal.program_id) {

        const {
            data: goalWeeks,
            error: weekError
        } =
            await supabaseClient
                .from("training_weeks")
                .select("id")
                .eq(
                    "program_id",
                    goal.program_id
                );


        if (weekError) {

            alert(
                weekError.message
            );

            return;
        }


        if (goalWeeks?.length) {

            const ids =
                goalWeeks.map(
                    week => week.id
                );


            const {
                error: workoutError
            } =
                await supabaseClient
                    .from("workouts")
                    .delete()
                    .in(
                        "week_id",
                        ids
                    );


            if (workoutError) {

                alert(
                    workoutError.message
                );

                return;
            }


            const {
                error: deleteWeekError
            } =
                await supabaseClient
                    .from("training_weeks")
                    .delete()
                    .in(
                        "id",
                        ids
                    );


            if (deleteWeekError) {

                alert(
                    deleteWeekError.message
                );

                return;
            }

        }


        await supabaseClient
            .from("programs")
            .delete()
            .eq(
                "id",
                goal.program_id
            );

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

        alert(
            error.message
        );

        return;
    }


    goBack();

}


/* =========================================
   BACK
========================================= */

function goBack() {

    if (
        goal &&
        goal.athlete_id
    ) {

        window.location.href =
            "coach-athlete.html?athlete_id=" +
            encodeURIComponent(
                goal.athlete_id
            );

        return;
    }


    window.history.back();

}


/* =========================================
   HELPERS
========================================= */

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
            day: "numeric",
            month: "short",
            year: "numeric"
        }
    );

}


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


function showError(
    message
) {

    document.getElementById(
        "goalHeader"
    ).innerHTML = `

        <div
            class="error"
            style="padding:25px;"
        >

            ${escapeHtml(
                message
            )}

        </div>

    `;

}


function showWeeksError(
    message
) {

    document.getElementById(
        "weeksList"
    ).innerHTML = `

        <div class="empty error">

            ${escapeHtml(
                message
            )}

        </div>

    `;

           }
