/* =========================================
   TWETE COACH
   GOAL + WEEKS + SESSIONS
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
   GET GOAL ID
========================================= */

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

        console.error(
            "Goal loading error:",
            error
        );

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


    /*
       Every goal gets its own program.

       If this goal doesn't have one yet,
       create it automatically.
    */

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
   CREATE PROGRAM FOR GOAL
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

        console.error(
            "Program creation error:",
            error
        );


        showError(
            "Could not create training program: " +
            error.message
        );


        return null;
    }


    /*
       Connect program to goal.
    */

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

        console.error(
            "Goal update error:",
            updateError
        );


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
   RENDER GOAL
========================================= */

function renderGoal() {

    const container =
        document.getElementById(
            "goalHeader"
        );


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


    container.innerHTML = `

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
                            goal.distance ||
                            ""
                        )}

                    </div>

                </div>


                <div>

                    <div class="detail-label">
                        Goal Time
                    </div>

                    <div class="detail-value">

                        ${escapeHtml(
                            goal.target_time ||
                            ""
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
                        style="
                            width:${progress}%;
                        "
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

    const container =
        document.getElementById(
            "weeksList"
        );


    container.innerHTML = `
        <div class="loading">
            Loading training weeks...
        </div>
    `;


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

        console.error(
            "Week loading error:",
            weekError
        );


        showWeeksError(
            weekError.message
        );

        return;
    }


    weeks =
        weekData || [];


    /*
       Load all sessions for all weeks.
    */

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
                    rest,
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

            console.error(
                "Session loading error:",
                sessionError
            );


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

}


/* =========================================
   CREATE WEEK CARD
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
                function(a, b) {

                    return (
                        new Date(
                            a.workout_date
                        ) -
                        new Date(
                            b.workout_date
                        )
                    );

                }
            );


    const dates =
        getWeekDateRange(
            weekSessions
        );


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

                    Week
                    ${week.week_number}

                </div>


                <div class="week-dates">

                    ${dates}

                </div>


                <div
                    class="week-actions"
                    onclick="event.stopPropagation()"
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
                        class="delete-week-button"
                        onclick="
                            deleteWeek(
                                '${week.id}'
                            )
                        "
                    >
                        🗑 Delete Week
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
            session.pace + "/km"
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


            <div>

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

    ${
        session.notes
        ?
        `
        <div style="
    margin-top:10px;
    padding:10px;
    background:#0b0b0b;
    border:1px solid #292929;
    border-radius:7px;
    color:#bdbdbd;
    font-size:13px;
    line-height:1.5;
">

    ${escapeHtml(
        session.notes
    )}

</div>
        `
        :
        ""
    }

</div>

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

async function addWeek() {

    if (!goal.program_id) {

        alert(
            "This goal does not have a training program yet."
        );

        return;
    }


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


    const {
        data,
        error
    } =
        await supabaseClient
            .from("training_weeks")
            .insert({

                program_id:
                    goal.program_id,

                week_number:
                    nextNumber,

                start_date:
                    null,

                end_date:
                    null

            })
            .select()
            .single();


    if (error) {

        console.error(
            "Add week error:",
            error
        );


        alert(
            "Could not add week:\n\n" +
            error.message
        );

        return;
    }


    await loadWeeks();


    /*
       Automatically open the new week.
    */

    setTimeout(
        function() {

            const element =
                document.getElementById(
                    "week-" +
                    data.id
                );


            if (element) {

                element.classList.add(
                    "open"
                );

            }

        },
        100
    );

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

        console.error(
            "Delete week error:",
            error
        );


        alert(
            "Could not delete week:\n\n" +
            error.message
        );

        return;
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


    element.classList.toggle(
        "open"
    );

}


/* =========================================
   OPEN SESSION MODAL
========================================= */

function openSessionModal(
    weekId
) {


   currentEditingSessionId = null;
   
    currentWeekId =
        weekId;


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
        "sessionRest"
    ).value = "";


    document.getElementById(
        "sessionNotes"
    ).value = "";



    document.querySelector(
    "#sessionModal .save-button"
).textContent = "Save Session";
   
    document
        .getElementById(
            "sessionModal"
        )
        .classList.add(
            "show"
        );

}


/* =========================================
   CLOSE SESSION MODAL
========================================= */

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

    if (currentEditingSessionId) {

    const {
        error
    } =
        await supabaseClient
            .from("workouts")
            .update({

                athlete_id:
                    goal.athlete_id,

                week_id:
                    currentWeekId,

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
                    pace || null,

                rest:
                    rest || null,

                notes:
                    notes || null

            })
            .eq(
                "id",
                currentEditingSessionId
            );


    if (error) {

        console.error(
            "Update session error:",
            error
        );

        alert(
            "Could not update session:\n\n" +
            error.message
        );

        return;
    }


    currentEditingSessionId =
        null;

    closeSessionModal();

    await loadWeeks();

    return;
}
   
    const {
        data,
        error
    } =
        await supabaseClient
            .from("workouts")
            .insert({

                athlete_id:
                    goal.athlete_id,

                week_id:
                    currentWeekId,

                workout_date:
                    date,

                workout_type:
                    type,

                title:
                    title,

                distance_km:
                    distance
                    ?
                    Number(
                        distance
                    )
                    :
                    null,

                duration_minutes:
                    duration
                    ?
                    Number(
                        duration
                    )
                    :
                    null,

                pace:
                    pace ||
                    null,

                rest:
                    rest ||
                    null,

                notes:
                    notes ||
                    null,

                completed:
                    false

            })
            .select()
            .single();


    if (error) {

        console.error(
            "Save session error:",
            error
        );


        alert(
            "Could not save session:\n\n" +
            error.message
        );

        return;
    }


    console.log(
        "Session created:",
        data
    );


    closeSessionModal();


    await loadWeeks();


    /*
       Re-open the week containing
       the newly-created session.
    */

    setTimeout(
        function() {

            const element =
                document.getElementById(
                    "week-" +
                    currentWeekId
                );


            if (element) {

                element.classList.add(
                    "open"
                );

            }

        },
        100
    );

}

async function editSession(sessionId) {

    const session =
        sessions.find(
            item =>
                item.id === sessionId
        );

    if (!session) {
        return;
    }


    currentWeekId =
        session.week_id;


    currentEditingSessionId =
        sessionId;


    document.getElementById(
        "sessionDate"
    ).value =
        session.workout_date || "";


    document.getElementById(
        "sessionTitle"
    ).value =
        session.title || "";


    document.getElementById(
        "sessionType"
    ).value =
        session.workout_type ||
        "Easy Run";


    document.getElementById(
        "sessionDistance"
    ).value =
        session.distance_km ?? "";


    document.getElementById(
        "sessionDuration"
    ).value =
        session.duration_minutes ?? "";


    document.getElementById(
        "sessionPace"
    ).value =
        session.pace || "";


    document.getElementById(
        "sessionRest"
    ).value =
        session.rest || "";


    document.getElementById(
        "sessionNotes"
    ).value =
        session.notes || "";


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

        console.error(
            "Delete session error:",
            error
        );


        alert(
            "Could not delete session:\n\n" +
            error.message
        );

        return;
    }


    await loadWeeks();

}


/* =========================================
   GET WEEK DATE RANGE
========================================= */

function getWeekDateRange(
    weekSessions
) {

    if (!weekSessions.length) {

        return "No sessions yet";

    }


    const dates =
        weekSessions
            .map(
                session =>
                    new Date(
                        session.workout_date +
                        "T00:00:00"
                    )
            )
            .sort(
                (a, b) =>
                    a - b
            );


    const first =
        dates[0];


    const last =
        dates[
            dates.length - 1
        ];


    const firstText =
        first.toLocaleDateString(
            "en-US",
            {
                day: "numeric",
                month: "short"
            }
        );


    const lastText =
        last.toLocaleDateString(
            "en-US",
            {
                day: "numeric",
                month: "short",
                year: "numeric"
            }
        );


    if (
        first.toDateString() ===
        last.toDateString()
    ) {

        return firstText;

    }


    return (
        firstText +
        " – " +
        lastText
    );

}


/* =========================================
   EDIT GOAL
========================================= */

function editGoal() {

    alert(
        "Goal editing can be added next."
    );

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
   DATE FORMAT
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
   ERROR
========================================= */

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


/* =========================================
   WEEK ERROR
========================================= */

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
