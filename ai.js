/* =========================================
   TWETE AI
========================================= */


/* =========================================
   SUPABASE
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
   ELEMENTS
========================================= */

const form =
  document.getElementById("aiForm");

const input =
  document.getElementById("aiInput");

const messages =
  document.getElementById("aiMessages");

const sendButton =
  document.getElementById("sendAiButton");

let pendingGoalSetup = null;

let pendingTrainingCorrection = null;
function isPositiveAnswer(
    message
) {

    const text =
        String(message || "")
            .trim()
            .toLowerCase();


    return [
        "yes",
        "yeah",
        "yep",
        "sure",
        "ok",
        "okay",
        "ja",
        "gerne",
        "mach",
        "please"
    ].includes(text);

}


function addDaysToDate(
    dateString,
    days
) {

    const date =
        new Date(
            dateString +
            "T00:00:00"
        );


    date.setDate(
        date.getDate() +
        days
    );


    return date
        .toISOString()
        .split("T")[0];

}


function daysBetweenDates(
    fromDate,
    toDate
) {

    const from =
        new Date(
            fromDate +
            "T00:00:00"
        );

    const to =
        new Date(
            toDate +
            "T00:00:00"
        );


    return Math.round(
        (
            to -
            from
        ) /
        86400000
    );

}


function moveGeneratedWeeksToNextFreeDates(
    generatedWeeks,
    existingWeeks
) {

    if (
        !generatedWeeks?.length
    ) {
        return null;
    }


    const occupiedWeeks =
        (existingWeeks || [])
            .filter(
                week =>
                    week.start_date &&
                    week.end_date
            );


    if (!occupiedWeeks.length) {

        return generatedWeeks;
    }


    const latestEndDate =
        occupiedWeeks
            .map(
                week =>
                    week.end_date
            )
            .sort()
            .at(-1);


    const firstGeneratedStart =
        generatedWeeks[0]
            .start_date;


    const nextFreeStart =
        addDaysToDate(
            latestEndDate,
            1
        );


    const shiftDays =
        daysBetweenDates(
            firstGeneratedStart,
            nextFreeStart
        );


    generatedWeeks.forEach(
        week => {

            week.start_date =
                addDaysToDate(
                    week.start_date,
                    shiftDays
                );


            week.end_date =
                addDaysToDate(
                    week.end_date,
                    shiftDays
                );


            if (
                Array.isArray(
                    week.sessions
                )
            ) {

                week.sessions.forEach(
                    session => {

                        if (
                            session.workout_date
                        ) {

                            session.workout_date =
                                addDaysToDate(
                                    session.workout_date,
                                    shiftDays
                                );

                        }

                    }
                );

            }

        }
    );


   
    return {
        weeks:
            generatedWeeks,

        startDate:
            generatedWeeks[0]
                .start_date,

        endDate:
            generatedWeeks[
                generatedWeeks.length - 1
            ].end_date
    };

}



function refreshTrainingWeekPreviewDates(
    generatedWeeks
) {

    generatedWeeks.forEach(
        week => {

            const card =
                document.querySelector(
                    `.ai-training-week-preview[data-week-number="${week.week_number}"]`
                );

            if (!card) {
                return;
            }

            const dates =
                card.querySelector(
                    ".ai-training-week-dates"
                );

            if (dates) {
                dates.textContent =
                    week.start_date +
                    " – " +
                    week.end_date;
            }

        }
    );

}



function renderAiText(element, text) {

  element.textContent = "";

  const lines = text.split("\n");

  lines.forEach((line, lineIndex) => {

    const parts =
      line.split(/(\*\*.*?\*\*)/g);

    parts.forEach((part) => {

      if (
        part.startsWith("**") &&
        part.endsWith("**")
      ) {

        const strong =
          document.createElement("strong");

        strong.textContent =
          part.slice(2, -2);

        element.appendChild(strong);

      } else {

        element.appendChild(
          document.createTextNode(part)
        );

      }

    });

    if (lineIndex < lines.length - 1) {
      element.appendChild(
        document.createElement("br")
      );
    }

  });

}

function refreshTrainingWeekPreviewDates(
    generatedWeeks
) {

    generatedWeeks.forEach(
        week => {

            const card =
                document.querySelector(
                    `.ai-training-week-preview[data-week-number="${week.week_number}"]`
                );


            if (!card) {
                return;
            }


            const dates =
                card.querySelector(
                    ".ai-training-week-dates"
                );


            if (dates) {

                dates.textContent =
                    week.start_date +
                    " – " +
                    week.end_date;

            }

        }
    );

}
/* =========================================
   ADD MESSAGE
========================================= */

function appendMessage(
  text,
  role
) {

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "message " +
    (
      role === "user"
        ? "user-message"
        : "assistant-message"
    );


  if (role !== "user") {

    const label =
      document.createElement("div");

     label.className =
  "ai-action-label";

     

    label.className =
      "message-label";

    label.textContent =
      "TWETE AI";

    wrapper.appendChild(label);
  }


  const bubble =
    document.createElement("div");

  bubble.className =
    "bubble";

  if (role === "user") {

  bubble.textContent =
    text;

} else {

  renderAiText(
    bubble,
    text
  );

}


  wrapper.appendChild(bubble);

  messages.appendChild(wrapper);


  messages.scrollTop =
    messages.scrollHeight;


  return wrapper;
}

/* =========================================
   PURI GOAL DELETE
========================================= */

function isGoalDeleteRequest(
  message
) {

  const text =
    String(message || "")
      .toLowerCase()
      .trim();


  const deleteWords = [
    "delete",
    "remove",
    "löschen",
    "loeschen",
    "entfernen"
  ];


  const goalWords = [
    "goal",
    "ziel"
  ];


  const hasDeleteWord =
    deleteWords.some(
      word =>
        text.includes(word)
    );


  const hasGoalWord =
    goalWords.some(
      word =>
        text.includes(word)
    );


  return (
    hasDeleteWord &&
    hasGoalWord
  );

}


/* =========================================
   FIND ATHLETE GOALS
========================================= */

async function loadGoalsForDelete() {

  const {
    data: {
      user
    },
    error: userError
  } =
    await supabaseClient
      .auth
      .getUser();


  if (
    userError ||
    !user
  ) {

    throw new Error(
      "No logged-in athlete found."
    );

  }


  const {
    data: goals,
    error
  } =
    await supabaseClient
      .from("goals")
      .select(`
        id,
        athlete_id,
        program_id,
        goal_name,
        goal_type,
        fitness_focus,
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
      );


  if (error) {
    throw error;
  }


  return goals || [];

}


/* =========================================
   DELETE GOAL SELECTOR
========================================= */

function appendGoalDeleteSelector(
  goals
) {

  const card =
    document.createElement(
      "div"
    );


  card.className =
    "ai-goal-form";


  card.innerHTML = `

    <div class="ai-goal-form-label">
      DELETE GOAL
    </div>

    <div class="ai-goal-form-title">
      Which goal do you want to delete?
    </div>

    <div class="ai-goal-form-subtitle">
      Choose carefully. Puri will ask for confirmation before anything is deleted.
    </div>

    <div
      class="ai-goal-type-options"
      data-delete-goal-options
    ></div>

  `;


  const options =
    card.querySelector(
      "[data-delete-goal-options]"
    );


  goals.forEach(
    goal => {

      const button =
        document.createElement(
          "button"
        );


      button.type =
        "button";

      button.className =
        "ai-goal-type-option";


      const title =
        goal.goal_name ||
        (
          goal.goal_type ===
          "general_fitness"
            ?
            "General Fitness"
            :
            "Training Goal"
        );


      const details = [];


      if (goal.distance) {
        details.push(
          goal.distance
        );
      }


      if (goal.target_time) {
        details.push(
          goal.target_time
        );
      }


      if (
        goal.goal_type ===
        "general_fitness"
      ) {

        const focusNames = {
          stay_fit:
            "Stay fit",

          build_endurance:
            "Build endurance",

          improve_speed:
            "Improve speed"
        };


        if (
          goal.fitness_focus
        ) {

          details.push(
            focusNames[
              goal.fitness_focus
            ] ||
            goal.fitness_focus
          );

        }

      }


      button.innerHTML = `

        <div class="ai-goal-type-content">

          <strong></strong>

          <span></span>

        </div>

      `;


      button
        .querySelector("strong")
        .textContent =
          title;


      button
        .querySelector("span")
        .textContent =
          details.length
            ?
            details.join(" • ")
            :
            "Training goal";


      button.addEventListener(
        "click",
        () => {

          card.remove();

          appendGoalDeleteConfirmation(
            goal
          );

        }
      );


      options.appendChild(
        button
      );

    }
  );


  messages.appendChild(
    card
  );


  messages.scrollTop =
    messages.scrollHeight;

}


/* =========================================
   DELETE GOAL CONFIRMATION
========================================= */

function appendGoalDeleteConfirmation(
  goal
) {

  const card =
    document.createElement(
      "div"
    );


  card.className =
    "ai-action-card";


  const title =
    goal.goal_name ||
    (
      goal.goal_type ===
      "general_fitness"
        ?
        "General Fitness"
        :
        "Training Goal"
    );


  card.innerHTML = `

    <div class="ai-action-label">
      DELETE GOAL
    </div>

    <div class="ai-action-title">
      Delete this goal?
    </div>

    <div class="ai-action-changes">

      <div class="ai-action-row">

        <span class="ai-action-field">
          Goal
        </span>

        <div class="ai-action-values">

          <span
            class="ai-action-new"
            data-delete-goal-name
          ></span>

        </div>

      </div>

    </div>


    <div class="ai-goal-form-subtitle">

      This will permanently remove
      the goal and its training plan.
      This action cannot be undone.

    </div>


    <div class="ai-action-buttons">

      <button
        type="button"
        class="ai-action-cancel"
        data-delete-goal-cancel
      >
        Cancel
      </button>

      <button
        type="button"
        class="ai-action-confirm"
        data-delete-goal-confirm
      >
        Delete Goal
      </button>

    </div>

  `;


  card
    .querySelector(
      "[data-delete-goal-name]"
    )
    .textContent =
      title;


  const cancelButton =
    card.querySelector(
      "[data-delete-goal-cancel]"
    );


  const confirmButton =
    card.querySelector(
      "[data-delete-goal-confirm]"
    );


  cancelButton.addEventListener(
    "click",
    () => {

      card.classList.add(
        "cancelled"
      );


      card
        .querySelector(
          ".ai-action-buttons"
        )
        .innerHTML = `

          <div class="ai-action-result">
            Goal deletion cancelled
          </div>

        `;


      appendMessage(
        "No problem — I won't delete this goal.",
        "assistant"
      );

    }
  );


  confirmButton.addEventListener(
    "click",
    async () => {

      confirmButton.disabled =
        true;

      cancelButton.disabled =
        true;


      confirmButton.textContent =
        "Deleting...";


      try {

        await deleteGoalFromPuri(
          goal
        );


        card.classList.add(
          "confirmed"
        );


        card
          .querySelector(
            ".ai-action-buttons"
          )
          .innerHTML = `

            <div class="ai-action-result success">
              ✓ Goal deleted
            </div>

          `;


        appendMessage(
          `Done — "${title}" and its training plan have been deleted.`,
          "assistant"
        );


      } catch (error) {

        console.error(
          "Puri goal deletion error:",
          error
        );


        confirmButton.disabled =
          false;

        cancelButton.disabled =
          false;


        confirmButton.textContent =
          "Delete Goal";


        appendMessage(
          "I couldn't delete that goal. Please try again.",
          "assistant"
        );

      }

    }
  );


  messages.appendChild(
    card
  );


  messages.scrollTop =
    messages.scrollHeight;

}


/* =========================================
   DELETE GOAL FROM DATABASE
========================================= */

async function deleteGoalFromPuri(
  goal
) {

  const {
    data: {
      user
    },
    error: userError
  } =
    await supabaseClient
      .auth
      .getUser();


  if (
    userError ||
    !user
  ) {

    throw new Error(
      "No logged-in athlete found."
    );

  }


  const programId =
    goal.program_id ||
    null;


  const {
    error: goalDeleteError
  } =
    await supabaseClient
      .from("goals")
      .delete()
      .eq(
        "id",
        goal.id
      )
      .eq(
        "athlete_id",
        user.id
      );


  if (goalDeleteError) {
    throw goalDeleteError;
  }


  if (!programId) {
    return;
  }


  const {
    data: remainingGoals,
    error:
      remainingGoalsError
  } =
    await supabaseClient
      .from("goals")
      .select("id")
      .eq(
        "program_id",
        programId
      )
      .limit(1);


  if (
    remainingGoalsError
  ) {

    throw remainingGoalsError;

  }


  if (
    remainingGoals &&
    remainingGoals.length > 0
  ) {

    return;

  }


  const {
    error: programDeleteError
  } =
    await supabaseClient
      .from("programs")
      .delete()
      .eq(
        "id",
        programId
      )
      .eq(
        "athlete_id",
        user.id
      );


  if (
    programDeleteError
  ) {

    throw programDeleteError;

  }

}


/* =========================================
   HANDLE PURI DELETE REQUEST
========================================= */

async function handlePuriGoalDeleteRequest() {

  const goals =
    await loadGoalsForDelete();


  if (!goals.length) {

    appendMessage(
      "You don't currently have any goals to delete.",
      "assistant"
    );

    return;

  }


  appendMessage(
    goals.length === 1
      ?
      "I found your goal. Please confirm before I delete anything."
      :
      "Sure — choose the goal you want to delete.",
    "assistant"
  );


  if (
    goals.length === 1
  ) {

    appendGoalDeleteConfirmation(
      goals[0]
    );

    return;

  }


  appendGoalDeleteSelector(
    goals
  );

}


/* =========================================
   GOAL TYPE SELECTOR
========================================= */

function appendGoalTypeSelector() {

  const card =
    document.createElement("div");

  card.className =
    "ai-goal-form";


  card.innerHTML = `

    <div class="ai-goal-form-label">
      CREATE NEW GOAL
    </div>

    <div class="ai-goal-form-title">
      What is your goal?
    </div>

    <div class="ai-goal-form-subtitle">
      Choose the type of training you want Puri to build for you.
    </div>


    <div class="ai-goal-type-options">

      <button
        type="button"
        class="ai-goal-type-option"
        data-goal-type="performance"
      >

        <div class="ai-goal-type-icon">
          🏁
        </div>

        <div class="ai-goal-type-content">

          <strong>
            Performance
          </strong>

          <span>
            Train for a race distance or a specific target time.
          </span>

        </div>

      </button>


      <button
        type="button"
        class="ai-goal-type-option"
        data-goal-type="general_fitness"
      >

        <div class="ai-goal-type-icon">
          🏃
        </div>

        <div class="ai-goal-type-content">

          <strong>
            General fitness
          </strong>

          <span>
            Stay fit, build endurance or improve your general performance.
          </span>

        </div>

      </button>

    </div>

  `;


  messages.appendChild(card);


  messages.scrollTop =
    messages.scrollHeight;


  card
    .querySelectorAll(
      ".ai-goal-type-option"
    )
    .forEach((button) => {

      button.addEventListener(
        "click",
        () => {

          const goalType =
            button.dataset.goalType;


          card.remove();


          if (
            goalType ===
            "performance"
          ) {

            appendGoalForm(
              "performance"
            );

            return;
          }


          if (
            goalType ===
            "general_fitness"
          ) {

            appendFitnessFocusSelector();

return;

          }

        }
      );

    });

}

/* =========================================
   GENERAL FITNESS FOCUS
========================================= */

function appendFitnessFocusSelector() {

  const card =
    document.createElement("div");

  card.className =
    "ai-goal-form";


  card.innerHTML = `

    <div class="ai-goal-form-label">
      GENERAL FITNESS
    </div>

    <div class="ai-goal-form-title">
      What do you want to improve?
    </div>

    <div class="ai-goal-form-subtitle">
      Choose your main training focus.
    </div>


    <div class="ai-goal-type-options">

      <button
        type="button"
        class="ai-goal-type-option"
        data-fitness-focus="stay_fit"
      >
        <div class="ai-goal-type-content">
          <strong>Stay fit</strong>
          <span>
            Maintain your current fitness and stay active.
          </span>
        </div>
      </button>


      <button
        type="button"
        class="ai-goal-type-option"
        data-fitness-focus="build_endurance"
      >
        <div class="ai-goal-type-content">
          <strong>Build endurance</strong>
          <span>
            Improve your aerobic fitness and endurance.
          </span>
        </div>
      </button>


      <button
        type="button"
        class="ai-goal-type-option"
        data-fitness-focus="improve_speed"
      >
        <div class="ai-goal-type-content">
          <strong>Improve speed</strong>
          <span>
            Become faster without training for a specific race.
          </span>
        </div>
      </button>

    </div>


    <label class="ai-goal-field">

      <span>
        Recent performance or PBs
        <small>(optional)</small>
      </span>

      <textarea
        data-fitness-performance
        rows="3"
        placeholder="e.g. 5 km in 22:30, recent race results, test results..."
      ></textarea>

    </label>


    <div class="ai-goal-form-error"></div>

<button
  type="button"
  class="ai-goal-review-button"
  data-fitness-continue
>
  Continue →
</button>

`;


  messages.appendChild(card);

  messages.scrollTop =
    messages.scrollHeight;


  let selectedFitnessFocus = null;


const focusButtons =
  card.querySelectorAll(
    "[data-fitness-focus]"
  );


focusButtons.forEach(
  (button) => {

    button.addEventListener(
      "click",
      () => {

        selectedFitnessFocus =
          button.dataset.fitnessFocus;


        focusButtons.forEach(
          (item) => {
            item.classList.remove(
              "active"
            );
          }
        );


        button.classList.add(
          "active"
        );

      }
    );

  }
);


const continueButton =
  card.querySelector(
    "[data-fitness-continue]"
  );


continueButton.addEventListener(
  "click",
  () => {

    const errorBox =
      card.querySelector(
        ".ai-goal-form-error"
      );


    if (!selectedFitnessFocus) {

      errorBox.textContent =
        "Please choose your fitness focus.";

      return;

    }


    errorBox.textContent = "";


    const currentPerformance =
      card
        .querySelector(
          "[data-fitness-performance]"
        )
        .value
        .trim();


    pendingGoalSetup = {

      goal_type:
        "general_fitness",

      fitness_focus:
        selectedFitnessFocus,

      current_performance:
        currentPerformance || null

    };


    card.remove();


    appendTrainingSetupForm();

  }
);

}
/* =========================================
   CREATE GOAL FORM
========================================= */

function appendGoalForm(
   goalType = "performance"
) {

  const card =
    document.createElement("div");

  card.className =
    "ai-goal-form";


  card.innerHTML = `
    <div class="ai-goal-form-label">
      CREATE NEW GOAL
    </div>

    <div class="ai-goal-form-title">
      Tell Puri about your goal
    </div>

    <div class="ai-goal-form-subtitle">
      Fill in the details below so Puri can prepare your goal.
    </div>


    <label class="ai-goal-field">
      <span>Goal / Race name</span>

      <input
        type="text"
        data-goal-field="goal_name"
        placeholder="e.g. Valencia Half Marathon"
      >
    </label>


    <label class="ai-goal-field">
      <span>Distance</span>

      <input
        type="text"
        data-goal-field="distance"
        placeholder="e.g. 21.1 km"
      >
    </label>


    <label class="ai-goal-field">
      <span>Target time</span>

      <input
        type="text"
        data-goal-field="target_time"
        placeholder="e.g. 1:05:00"
      >
    </label>


    <label class="ai-goal-field">
      <span>Target date</span>

      <input
        type="date"
        data-goal-field="target_date"
      >
    </label>


    <label class="ai-goal-field">
      <span>
      Current performance
      <small>(optional)</small>
      </span>


      <input
        type="text"
        data-goal-field="current_performance"
        placeholder="e.g. 5 km in 15:00"
      >
    </label>


    <label class="ai-goal-field">
      <span>Notes <small>(optional)</small></span>

      <textarea
        data-goal-field="notes"
        placeholder="Anything Puri should know about this goal..."
        rows="3"
      ></textarea>
    </label>


    <div class="ai-goal-form-error"></div>


    <button
      type="button"
      class="ai-goal-review-button"
    >
      Review goal →
    </button>
  `;


  messages.appendChild(card);

  messages.scrollTop =
    messages.scrollHeight;


  const reviewButton =
    card.querySelector(
      ".ai-goal-review-button"
    );


  reviewButton.addEventListener(
    "click",
    async () => {

      const goalData = {
  goal_type: goalType
};
       
      card
        .querySelectorAll(
          "[data-goal-field]"
        )
        .forEach((field) => {

          goalData[
            field.dataset.goalField
          ] =
            field.value.trim();

        });


      const requiredFields = [
  "goal_name",
  "distance",
  "target_time",
  "target_date"
];


      const missing =
        requiredFields.filter(
          (field) =>
            !goalData[field]
        );


      const errorBox =
        card.querySelector(
          ".ai-goal-form-error"
        );


      if (missing.length) {

        errorBox.textContent =
          "Please complete all required fields.";

        return;
      }


      errorBox.textContent = "";

      reviewButton.disabled = true;

      reviewButton.textContent =
        "Preparing goal...";


      try {

        const {
          data,
          error
        } =
          await supabaseClient.functions
            .invoke(
              "twete-ai",
              {
                body: {
                  message:
                    "Review my new goal.",
                  goal_form:
                    goalData
                }
              }
            );


        if (error) {
          throw error;
        }


        if (!data?.answer) {

          throw new Error(
            data?.error ||
            "Could not review goal."
          );

        }


        card.remove();


        appendMessage(
          data.answer,
          "assistant"
        );


        if (data.pending_action) {

          appendPendingAction(
            data.pending_action
          );

        }


      } catch (error) {

        console.error(
          "Goal form error:",
          error
        );


        errorBox.textContent =
          "Puri couldn't prepare the goal. Please try again.";


        reviewButton.disabled =
          false;

        reviewButton.textContent =
          "Review goal →";

      }

    }
  );

}
/* =========================================
   PENDING ACTION CARD
========================================= */

function formatActionField(field) {

  const names = {

    target_time:
      "Target time",

    target_date:
      "Target date",

    goal_name:
      "Goal name",

    distance:
      "Distance",

    current_pb:
      "Current PB",

    current_performance:
      "Current performance",

    progress:
      "Progress",


    /* WORKOUT */

    workout_date:
      "Date",

    workout_type:
      "Workout type",

    title:
      "Workout",

    distance_km:
      "Distance (km)",

    duration_minutes:
      "Duration (min)",

    pace:
      "Pace",

    rest:
      "Recovery",

    notes:
      "Notes",

    session_slot:
      "Session"

  };


  return names[field] || field;

}


function appendPendingAction(action) {

  if (!action?.id) {
    return;
  }

  const wrapper =
    document.createElement("div");

  wrapper.className =
    "ai-action-card";


  const label =
    document.createElement("div");

   label.className =
  "ai-action-label";

  const isCreate =
  action.action_type ===
  "create_goal";


const isWorkoutUpdate =
  action.action_type ===
  "update_workout";


if (isCreate) {

  label.textContent =
    "CREATE NEW GOAL";

} else if (isWorkoutUpdate) {

  label.textContent =
    "UPDATE WORKOUT";

} else {

  label.textContent =
    "UPDATE CURRENT GOAL";

}




  const title =
    document.createElement("div");

  title.className =
    "ai-action-title";
   
title.textContent =
  isCreate
    ? "Confirm your new goal"
    : isWorkoutUpdate
      ? "Confirm workout change"
      : "Confirm this change";

  const changes =
    document.createElement("div");

  changes.className =
    "ai-action-changes";


  const before =
    action.preview?.before || {};

  const after =
    action.preview?.after || {};


  Object.keys(after)
    .forEach((field) => {

      const row =
        document.createElement("div");

      row.className =
        "ai-action-row";


      const fieldName =
        document.createElement("span");

      fieldName.className =
        "ai-action-field";

      fieldName.textContent =
        formatActionField(field);


      const values =
        document.createElement("div");

      values.className =
        "ai-action-values";


      const newValue =
  document.createElement("span");

newValue.className =
  "ai-action-new";

if (
  field === "notes"
) {

  renderAiText(
    newValue,
    String(
      after[field] ?? "—"
    )
  );

} else {

  newValue.textContent =
    after[field] ?? "—";

}


if (isCreate) {

  values.appendChild(
    newValue
  );

} else {

  const oldValue =
    document.createElement("span");

  oldValue.className =
    "ai-action-old";

  oldValue.textContent =
    before[field] ?? "—";


  const arrow =
    document.createElement("span");

  arrow.className =
    "ai-action-arrow";

  arrow.textContent =
    "→";


  values.append(
    oldValue,
    arrow,
    newValue
  );

}


      row.append(
        fieldName,
        values
      );


      changes.appendChild(row);

    });


  const buttons =
    document.createElement("div");

  buttons.className =
    "ai-action-buttons";


  const cancelButton =
    document.createElement("button");

  cancelButton.className =
    "ai-action-cancel";

  cancelButton.textContent =
    "Cancel";


  const confirmButton =
    document.createElement("button");

  confirmButton.className =
    "ai-action-confirm";

  confirmButton.innerHTML =
    "<span>✓</span> Confirm";


  buttons.append(
    cancelButton,
    confirmButton
  );


  wrapper.append(
    label,
    title,
    changes,
    buttons
  );


  messages.appendChild(wrapper);


  messages.scrollTop =
    messages.scrollHeight;


  cancelButton.addEventListener(
    "click",
    async () => {

      await handlePendingAction(
        action,
        "cancel",
        wrapper,
        confirmButton,
        cancelButton
      );

    }
  );


  confirmButton.addEventListener(
    "click",
    async () => {

      await handlePendingAction(
        action,
        "confirm",
        wrapper,
        confirmButton,
        cancelButton
      );

    }
  );

}


async function generateNextTrainingWeek() {

  const {
    data: { user },
    error: userError
  } =
    await supabaseClient.auth.getUser();


  if (userError || !user) {
    throw new Error(
      "No logged-in athlete found."
    );
  }


  /* CURRENT GOAL */

  const {
    data: goal,
    error: goalError
  } =
    await supabaseClient
      .from("goals")
      .select("*")
      .eq("athlete_id", user.id)
      .order("created_at", {
        ascending: false
      })
      .limit(1)
      .single();


  if (goalError || !goal) {
    throw new Error(
      "No current goal found."
    );
  }


  /* TRAINING PREFERENCES */

  const {
    data: preferences,
    error: preferencesError
  } =
    await supabaseClient
      .from(
        "athlete_training_preferences"
      )
      .select("*")
      .eq("athlete_id", user.id)
      .single();


  if (
    preferencesError ||
    !preferences
  ) {
    throw new Error(
      "No training preferences found."
    );
  }


  /* EXISTING PROGRAM */

  let program = null;

  if (goal.program_id) {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("programs")
        .select("*")
        .eq(
          "id",
          goal.program_id
        )
        .single();


    if (!error) {
      program = data;
    }

  }


  /* EXISTING WEEKS */

  let existingWeeks = [];

  if (program) {

    const {
      data,
      error
    } =
      await supabaseClient
        .from("training_weeks")
        .select("*")
        .eq(
          "program_id",
          program.id
        )
        .order(
          "week_number",
          {
            ascending: true
          }
        );


    if (error) {
      throw error;
    }


    existingWeeks =
      data || [];

  }


  const nextWeekNumber =
    existingWeeks.length
      ? Math.max(
          ...existingWeeks.map(
            week =>
              week.week_number
          )
        ) + 1
      : 1;


  console.log(
    "Generate next training week",
    {
      goal,
      preferences,
      program,
      existingWeeks,
      nextWeekNumber
    }
  );


  return {
    goal,
    preferences,
    program,
    existingWeeks,
    nextWeekNumber
  };

}

/* =========================================
   TRAINING WEEK PREVIEW
========================================= */

function appendTrainingWeekPreview(
  trainingWeek,
  weekContext,
  showActions = true
) {

  const card =
    document.createElement("div");

  card.className =
    "ai-training-week-preview";

  card.dataset.weekNumber =
    trainingWeek.week_number;


  /* HEADER */

  const label =
    document.createElement("div");

  label.className =
    "ai-action-label";

  label.textContent =
    `WEEK ${trainingWeek.week_number}`;


  const title =
    document.createElement("div");

  title.className =
    "ai-action-title";

  title.textContent =
    trainingWeek.focus ||
    `Training Week ${trainingWeek.week_number}`;


  const dates =
    document.createElement("div");

  dates.className =
    "ai-training-week-dates";

  dates.textContent =
    `${trainingWeek.start_date} – ${trainingWeek.end_date}`;


  card.append(
    label,
    title,
    dates
  );


  /* COACH NOTE */

  if (trainingWeek.coach_note) {

    const coachNote =
      document.createElement("div");

    coachNote.className =
      "ai-training-week-note";

    renderAiText(
      coachNote,
      trainingWeek.coach_note
    );

    card.appendChild(
      coachNote
    );

  }


  /* SESSIONS */

  const sessions =
    Array.isArray(
      trainingWeek.sessions
    )
      ? trainingWeek.sessions
      : [];


  const sessionList =
    document.createElement("div");

  sessionList.className =
    "ai-training-week-sessions";


  sessions.forEach(
  session => {

    const sessionCard =
      document.createElement("div");

    sessionCard.className =
      "ai-training-week-session";


    /* DAY + SESSION SLOT */

    const sessionDay =
      document.createElement("div");

    sessionDay.className =
      "ai-training-week-day";


    let dayName = "";

    if (session.workout_date) {

      const date =
        new Date(
          session.workout_date +
          "T00:00:00"
        );

      dayName =
        date
          .toLocaleDateString(
            "en-US",
            {
              weekday: "long"
            }
          )
          .toUpperCase();

    }


    const slot =
      Number(
        session.session_slot || 1
      ) === 2
        ? "PM"
        : "AM";


    sessionDay.textContent =
      dayName
        ? `${dayName} · ${slot}`
        : slot;


    /* TITLE */

    const sessionTitle =
      document.createElement("div");

    sessionTitle.className =
      "ai-training-week-title";

    sessionTitle.textContent =
      session.title ||
      "Training session";


    /* DETAILS */

    const details = [];


    if (
      session.distance_km != null
    ) {

      details.push(
        `${session.distance_km} km`
      );

    }


    if (
      session.duration_minutes != null
    ) {

      details.push(
        `${session.duration_minutes} min`
      );

    }


    if (session.pace) {

      details.push(
        session.pace
      );

    }


    if (session.rest) {

      details.push(
        `Recovery: ${session.rest}`
      );

    }


    const sessionDetails =
      document.createElement("div");

    sessionDetails.className =
      "ai-training-week-details";

    sessionDetails.textContent =
      details.join(" · ");


    /* ADD CONTENT */

    sessionCard.append(
      sessionDay,
      sessionTitle
    );


    if (details.length) {

      sessionCard.appendChild(
        sessionDetails
      );

    }


    /* NOTES */

    if (session.notes) {

      const notes =
        document.createElement("div");

      notes.className =
        "ai-training-week-notes";


      renderAiText(
        notes,
        session.notes
      );


      sessionCard.appendChild(
        notes
      );

    }


    sessionList.appendChild(
      sessionCard
    );

  }
);


  card.appendChild(
    sessionList
  );


  /* NO SESSIONS SAFETY */

  if (!sessions.length) {

    const emptyMessage =
      document.createElement("div");

    emptyMessage.className =
      "ai-training-session-notes";

    emptyMessage.textContent =
      "No sessions were returned for this week.";

    card.appendChild(
      emptyMessage
    );

  }


  /* ACTION BUTTONS */

  if (showActions) {

    const actions =
      document.createElement("div");

    actions.className =
      "ai-training-week-actions";


    const changeButton =
      document.createElement("button");

    changeButton.type =
      "button";

    changeButton.className =
      "ai-training-review-cancel";

    changeButton.textContent =
      "Request changes";


    const confirmButton =
      document.createElement("button");

    confirmButton.type =
      "button";

    confirmButton.className =
      "ai-training-review-confirm";

    confirmButton.textContent =
      "✓ Confirm week";


    actions.append(
      changeButton,
      confirmButton
    );


    card.appendChild(
      actions
    );


    /* REQUEST CHANGES */

    changeButton.addEventListener(
      "click",
      () => {

        appendMessage(
          `Tell me what you would like to change in Week ${trainingWeek.week_number}.`,
          "assistant"
        );

        input.focus();

      }
    );


    /* CONFIRM WEEK */

    confirmButton.addEventListener(
      "click",
      async () => {

        confirmButton.disabled =
          true;

        changeButton.disabled =
          true;

        confirmButton.textContent =
          "Saving week...";


        try {

          await saveAdaptiveTrainingWeek(
            trainingWeek
          );


          confirmButton.textContent =
            "✓ Week saved";


          appendMessage(
            `Week ${trainingWeek.week_number} has been saved to your training plan.`,
            "assistant"
          );

} catch (error) {

  console.error(
    "Save adaptive training week error:",
    error
  );

  console.error(
    "Full Supabase error:",
    JSON.stringify(
      error,
      null,
      2
    )
  );


  confirmButton.disabled =
    false;

  changeButton.disabled =
    false;

  confirmButton.textContent =
    "✓ Confirm week";


  const errorMessage =
    String(
      error?.message ||
      error?.details ||
      error?.hint ||
      error?.code ||
      error ||
      "Unknown error"
    );


  if (
    errorMessage.includes(
      "WEEK_ALREADY_EXISTS"
    )
  ) {

    appendMessage(
      "I couldn't save this week because it already contains training. Nothing was overwritten.",
      "assistant"
    );

    return;

  }


  appendMessage(
    "DEBUG SAVE ERROR:\n\n" +
    errorMessage,
    "assistant"
  );

        }
           

      }
    );

  }


  messages.appendChild(
    card
  );


  messages.scrollTop =
    messages.scrollHeight;


  return card;
}
/* =========================================
   SAVE ADAPTIVE TRAINING WEEK
========================================= */
async function saveAdaptiveTrainingWeek(
  trainingWeek
) {

  const {
    data: { user },
    error: userError
  } =
    await supabaseClient.auth.getUser();


  if (userError || !user) {

    throw new Error(
      "No logged-in athlete found."
    );

  }


  /* =====================================
     FIND CURRENT GOAL
  ===================================== */

  const {
    data: goal,
    error: goalError
  } =
    await supabaseClient
      .from("goals")
      .select(`
        id,
        program_id
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
      .single();


  if (
    goalError ||
    !goal?.program_id
  ) {

    throw new Error(
      "No active training program found."
    );

  }


  /* =====================================
     CHECK WHETHER WEEK ALREADY EXISTS
  ===================================== */

  const {
    data: existingWeeks,
    error: weekCheckError
  } =
    await supabaseClient
      .from("training_weeks")
      .select(`
        id,
        week_number,
        start_date,
        end_date
      `)
      .eq(
        "program_id",
        goal.program_id
      )
      .eq(
        "start_date",
        trainingWeek.start_date
      )
      .eq(
        "end_date",
        trainingWeek.end_date
      )
      .limit(1);


  if (weekCheckError) {
    throw weekCheckError;
  }


  let weekId = null;


  /* =====================================
     EXISTING WEEK
  ===================================== */

  if (
    existingWeeks &&
    existingWeeks.length > 0
  ) {

    const existingWeek =
      existingWeeks[0];


    /* CHECK WHETHER IT ALREADY
       CONTAINS WORKOUTS */

    const {
      data: existingWorkouts,
      error: workoutCheckError
    } =
      await supabaseClient
        .from("workouts")
        .select("id")
        .eq(
          "week_id",
          existingWeek.id
        )
        .limit(1);


    if (workoutCheckError) {
      throw workoutCheckError;
    }


    if (
      existingWorkouts &&
      existingWorkouts.length > 0
    ) {

      throw new Error(
        "WEEK_ALREADY_EXISTS"
      );

    }


    /*
      IMPORTANT:
      The week exists but is empty.

      Reuse it instead of creating
      another training_weeks row.
    */

    weekId =
      existingWeek.id;


    const {
      error: updateWeekError
    } =
      await supabaseClient
        .from("training_weeks")
        .update({

          week_number:
            trainingWeek.week_number,

          focus:
            trainingWeek.focus || null,

          coach_note:
            trainingWeek.coach_note || null

        })
        .eq(
          "id",
          weekId
        );


    if (updateWeekError) {
      throw updateWeekError;
    }

  }


  /* =====================================
     WEEK DOES NOT EXIST
  ===================================== */

  else {

    const {
      data: newWeek,
      error: insertWeekError
    } =
      await supabaseClient
        .from("training_weeks")
        .insert({

          program_id:
            goal.program_id,

          week_number:
            trainingWeek.week_number,

          start_date:
            trainingWeek.start_date,

          end_date:
            trainingWeek.end_date,

          focus:
            trainingWeek.focus || null,

          coach_note:
            trainingWeek.coach_note || null

        })
        .select("id")
        .single();


    if (
      insertWeekError ||
      !newWeek
    ) {

      throw (
        insertWeekError ||
        new Error(
          "Could not create training week."
        )
      );

    }


    weekId =
      newWeek.id;

  }


  /* =====================================
     PREPARE WORKOUTS
  ===================================== */

  const sessions =
    Array.isArray(
      trainingWeek.sessions
    )
      ? trainingWeek.sessions
      : [];


  if (!sessions.length) {

    throw new Error(
      "Training week contains no sessions."
    );

  }


  const workouts =
    sessions.map(
      session => ({

        athlete_id:
          user.id,

        week_id:
          weekId,

        workout_date:
          session.workout_date,

        workout_type:
          session.workout_type || null,

        title:
          session.title,

        distance_km:
          session.distance_km ?? null,

        duration_minutes:
          session.duration_minutes ?? null,

        pace:
          session.pace || null,

        rest:
          session.rest || null,

        notes:
          session.notes || null,

        session_slot:
          session.session_slot || 1,

        completed:
          false,

        completion_status:
          null

      })
    );


  /* =====================================
     SAVE WORKOUTS
  ===================================== */

  const {
    error: workoutInsertError
  } =
    await supabaseClient
      .from("workouts")
      .insert(
        workouts
      );


  if (workoutInsertError) {
    throw workoutInsertError;
  }


  console.log(
    "Adaptive training week saved:",
    {
      weekId,
      reusedExistingWeek:
        existingWeeks?.length > 0,
      workouts:
        workouts.length
    }
  );


  return {
    ok: true,
    week_id: weekId
  };

}

function appendCreateFirstTrainingWeekButton() {

  const createPlanButton =
    document.createElement("button");


  createPlanButton.type =
    "button";

  createPlanButton.className =
    "ai-generate-training-plan-button";

  createPlanButton.textContent =
    "Create my first training week →";


  messages.appendChild(
    createPlanButton
  );


  messages.scrollTop =
    messages.scrollHeight;


  createPlanButton.addEventListener(
    "click",
    async () => {

      createPlanButton.disabled =
        true;

      createPlanButton.textContent =
        "Preparing your first training week...";


      try {

        const weekContext =
          await generateNextTrainingWeek();


        const {
          data,
          error
        } =
          await supabaseClient.functions.invoke(
            "twete-ai",
            {
              body: {
                action:
                  "generate_training_week",

                week_number:
                  weekContext.nextWeekNumber
              }
            }
          );


        if (error) {
          throw error;
        }


        const generatedWeeks =
          Array.isArray(
            data?.training_weeks
          )
            ? data.training_weeks
            : data?.training_week
              ? [data.training_week]
              : [];


        if (!generatedWeeks.length) {

          throw new Error(
            "No training week returned."
          );

        }


        if (
          generatedWeeks.length === 2
        ) {

          createPlanButton.textContent =
            `Weeks ${generatedWeeks[0].week_number}–${generatedWeeks[1].week_number} ready ✓`;

        } else {

          createPlanButton.textContent =
            `Week ${generatedWeeks[0].week_number} ready ✓`;

        }


        if (
          generatedWeeks.length === 2
        ) {

          generatedWeeks.forEach(
            (trainingWeek) => {

              appendTrainingWeekPreview(
                trainingWeek,
                weekContext,
                false
              );

            }
          );


          const planActions =
            document.createElement("div");

          planActions.className =
            "ai-training-week-actions";


          const changePlanButton =
            document.createElement("button");

          changePlanButton.type =
            "button";

          changePlanButton.className =
            "ai-training-review-cancel";

          changePlanButton.textContent =
            "Request changes";


          const confirmPlanButton =
            document.createElement("button");

          confirmPlanButton.type =
            "button";

          confirmPlanButton.className =
            "ai-training-review-confirm";

          confirmPlanButton.textContent =
            "✓ Confirm plan";


          planActions.append(
            changePlanButton,
            confirmPlanButton
          );


          messages.appendChild(
            planActions
          );


          changePlanButton.addEventListener(
            "click",
            () => {

              appendMessage(
                "Tell me what you would like to change in Week 1 or Week 2.",
                "assistant"
              );

            }
          );


          confirmPlanButton.addEventListener(
            "click",
            async () => {

              confirmPlanButton.disabled =
                true;

              changePlanButton.disabled =
                true;

              confirmPlanButton.textContent =
                "Saving plan...";


              try {

                const {
                  data,
                  error
                } =
                  await supabaseClient.rpc(
                    "confirm_ai_training_plan",
                    {
                      p_goal_id:
                        weekContext.goal.id,

                      p_weeks:
                        generatedWeeks
                    }
                  );


                if (error) {
                  throw error;
                }


                confirmPlanButton.textContent =
                  "✓ Plan saved";


                appendMessage(
                  "Your first training plan is saved. Week 1 and Week 2 are now part of your training program.",
                  "assistant"
                );


              } catch (error) {

    console.error(
        "Save training plan error:",
        error
    );


    confirmPlanButton.disabled =
        false;

    changePlanButton.disabled =
        false;

    confirmPlanButton.textContent =
        "✓ Confirm plan";


    const errorMessage =
        String(
            error?.message ||
            error?.details ||
            error ||
            ""
        );


    /* =====================================
       WEEK DATE OVERLAP
    ===================================== */

   if (
    errorMessage.includes(
        "TRAINING_WEEK_DATE_OVERLAP"
    )
) {

    pendingTrainingCorrection = {

        type:
            "move_to_next_free_dates",

        generatedWeeks:
            generatedWeeks,

        existingWeeks:
            weekContext.existingWeeks

    };


    appendMessage(
        "I found a date overlap with a week that is already in your training plan. I won't overwrite anything. Would you like me to move the new training to the next free dates?",
        "assistant"
    );

    return;
}
        


    /* =====================================
       WEEK NUMBER ALREADY EXISTS
    ===================================== */

   if (
    errorMessage.includes(
        "WEEK_ALREADY_EXISTS"
    )
) {

    pendingTrainingCorrection = {

        type:
            "move_to_next_free_dates",

        generatedWeeks:
            generatedWeeks,

        existingWeeks:
            weekContext.existingWeeks

    };


    appendMessage(
        "That week already exists in your current training plan. I won't replace it. Would you like me to move the new training to the next free dates?",
        "assistant"
    );

    return;
   }


    /* =====================================
       WORKOUT OUTSIDE WEEK
    ===================================== */

    if (
        errorMessage.includes(
            "WORKOUT_OUTSIDE_WEEK"
        )
    ) {

        appendMessage(
            "One of the workouts falls outside the dates of its training week. I haven't saved anything. Would you like me to correct the workout date and prepare the week again?",
            "assistant"
        );

        return;
    }


    /* =====================================
       UNKNOWN ERROR
    ===================================== */

    appendMessage(
        "I couldn't save the training plan yet. Nothing was changed. Please try again.",
        "assistant"
    );

              }

            }
          );


        } else {

          appendTrainingWeekPreview(
            generatedWeeks[0],
            weekContext,
            true
          );

        }


      } catch (error) {

        console.error(
          "Training week generation error:",
          error
        );


        createPlanButton.disabled =
          false;

        createPlanButton.textContent =
          "Create my first training week →";


        appendMessage(
          "I couldn't prepare your next training week. Please try again.",
          "assistant"
        );

      }

    }
  );

}

/* =========================================
   TRAINING SETUP REVIEW
========================================= */

function appendTrainingSetupReview(
  trainingData,
  formCard
) {

  const reviewCard =
    document.createElement("div");

  reviewCard.className =
    "ai-training-review-card";


  const rows = [
    [
      "Sessions per week",
      trainingData.sessions_per_week
    ],
    [
      "Training days",
      trainingData.preferred_weekdays
        .map(day =>
          day.charAt(0).toUpperCase() +
          day.slice(1)
        )
        .join(", ")
    ],
    [
      "Hard sessions per week",
      trainingData.intense_sessions_per_week
    ],
    [
      "Weekly volume",
      `${trainingData.current_weekly_km} km`
    ],
    [
      "Current longest run",
      `${trainingData.current_long_run_km} km`
    ],
    [
      "Long-run day",
      trainingData.preferred_long_run_day
        .charAt(0).toUpperCase() +
      trainingData.preferred_long_run_day
        .slice(1)
    ],
    [
      "Double days",
      trainingData.double_days_allowed === "true"
        ? "Yes"
        : "No"
    ],
    [
      "Max normal day",
      `${trainingData.max_normal_day_km} km`
    ],
    [
      "Max long run",
      `${trainingData.max_long_run_km} km`
    ]
  ];


  if (trainingData.notes) {

    rows.push([
      "Notes",
      trainingData.notes
    ]);

  }


  const label =
    document.createElement("div");

  label.className =
    "ai-goal-form-label";

  label.textContent =
    "REVIEW TRAINING SETUP";


  const title =
    document.createElement("div");

  title.className =
    "ai-goal-form-title";

  title.textContent =
    "Confirm your training preferences";


  const subtitle =
    document.createElement("div");

  subtitle.className =
    "ai-goal-form-subtitle";

  subtitle.textContent =
    "Puri will use these preferences when building your training plan.";


  const values =
    document.createElement("div");

  values.className =
    "ai-training-review-values";


  rows.forEach(
    ([name, value]) => {

      const row =
        document.createElement("div");

      row.className =
        "ai-training-review-row";


      const rowLabel =
        document.createElement("span");

      rowLabel.className =
        "ai-training-review-label";

      rowLabel.textContent =
        name;


      const rowValue =
        document.createElement("span");

      rowValue.className =
        "ai-training-review-value";

      rowValue.textContent =
        value;


      row.append(
        rowLabel,
        rowValue
      );


      values.appendChild(row);

    }
  );


  const buttons =
    document.createElement("div");

  buttons.className =
    "ai-training-review-actions";


  const cancelButton =
    document.createElement("button");

  cancelButton.type =
    "button";

  cancelButton.className =
    "ai-training-review-cancel";

  cancelButton.textContent =
    "Cancel";


  const confirmButton =
    document.createElement("button");

  confirmButton.type =
    "button";

  confirmButton.className =
    "ai-training-review-confirm";

  confirmButton.textContent =
    "✓ Confirm";


  buttons.append(
    cancelButton,
    confirmButton
  );


  reviewCard.append(
    label,
    title,
    subtitle,
    values,
    buttons
  );


  formCard.style.display =
    "none";


  messages.appendChild(
    reviewCard
  );


  messages.scrollTop =
    messages.scrollHeight;


  cancelButton.addEventListener(
    "click",
    () => {

      reviewCard.remove();

      formCard.style.display =
        "";

      messages.scrollTop =
        messages.scrollHeight;

    }
  );


  confirmButton.addEventListener(
  "click",
  async () => {

    confirmButton.disabled = true;
    cancelButton.disabled = true;

    confirmButton.textContent =
      "Saving...";


    try {

      const {
        data: { user },
        error: userError
      } =
        await supabaseClient.auth.getUser();


      if (userError || !user) {
        throw new Error(
          "No logged-in athlete found."
        );
      }


      const preferenceData = {

        athlete_id:
          user.id,

        sessions_per_week:
          Number(
            trainingData.sessions_per_week
          ),

        preferred_weekdays:
          trainingData.preferred_weekdays,

        intense_sessions_per_week:
          Number(
            trainingData.intense_sessions_per_week
          ),

        current_weekly_km:
          Number(
            trainingData.current_weekly_km
          ),

        current_long_run_km:
          Number(
            trainingData.current_long_run_km
          ),

        preferred_long_run_day:
          trainingData.preferred_long_run_day,

        double_days_allowed:
          trainingData.double_days_allowed ===
          "true",

        max_normal_day_km:
          Number(
            trainingData.max_normal_day_km
          ),

        max_long_run_km:
          Number(
            trainingData.max_long_run_km
          ),

        notes:
          trainingData.notes || null,

        updated_at:
          new Date().toISOString()

      };


      const {
        error
      } =
        await supabaseClient
          .from(
            "athlete_training_preferences"
          )
          .upsert(
            preferenceData,
            {
              onConflict:
                "athlete_id"
            }
          );


      if (error) {
        throw error;
      }


      confirmButton.textContent =
        "✓ Training preferences saved";


      appendMessage(
        "Your training preferences are saved. I have everything I need to build your training plan.",
        "assistant"
      );
if (
  pendingGoalSetup?.goal_type ===
  "general_fitness"
) {

  try {

    const {
      data,
      error
    } =
      await supabaseClient.functions
        .invoke(
          "twete-ai",
          {
            body: {
              message:
                "Review my new general fitness goal.",

              goal_form: {
                goal_type:
                  pendingGoalSetup.goal_type,

                fitness_focus:
                  pendingGoalSetup.fitness_focus,

                current_performance:
                  pendingGoalSetup.current_performance
              }
            }
          }
        );


    if (error) {
      throw error;
    }


    if (!data?.answer) {
      throw new Error(
        data?.error ||
        "Could not review general fitness goal."
      );
    }


    appendMessage(
      data.answer,
      "assistant"
    );


    if (data.pending_action) {

      appendPendingAction(
        data.pending_action
      );

    }


    return;

  } catch (error) {

    console.error(
      "General fitness goal review error:",
      error
    );


    appendMessage(
      "I couldn't prepare your general fitness goal. Please try again.",
      "assistant"
    );

    return;

  }

}
       appendCreateFirstTrainingWeekButton();


    } catch (error) {

      console.error(
        "Training preferences save error:",
        error
      );

      confirmButton.disabled =
        false;

      cancelButton.disabled =
        false;

      confirmButton.textContent =
        "✓ Confirm";


      appendMessage(
        "I couldn't save your training preferences. Please try again.",
        "assistant"
      );

    }

  }
);

}
/* =========================================
   TRAINING SETUP FORM
========================================= */

function appendTrainingSetupForm() {

  const card =
    document.createElement("div");

  card.className =
    "ai-training-setup-form";


  card.innerHTML = `
    <div class="ai-goal-form-label">
      TRAINING SETUP
    </div>

    <div class="ai-goal-form-title">
      Tell Puri how you train
    </div>

    <div class="ai-goal-form-subtitle">
      These preferences will be used to build your training plan.
    </div>


    <label class="ai-goal-field">
      <span>Sessions per week</span>

      <input
        type="number"
        min="1"
        max="14"
        data-training-field="sessions_per_week"
        placeholder="e.g. 7"
      >
    </label>


    <div class="ai-goal-field">

      <span>Training days</span>

      <div class="ai-training-days">

        <label>
          <input type="checkbox" value="monday">
          Mon
        </label>

        <label>
          <input type="checkbox" value="tuesday">
          Tue
        </label>

        <label>
          <input type="checkbox" value="wednesday">
          Wed
        </label>

        <label>
          <input type="checkbox" value="thursday">
          Thu
        </label>

        <label>
          <input type="checkbox" value="friday">
          Fri
        </label>

        <label>
          <input type="checkbox" value="saturday">
          Sat
        </label>

        <label>
          <input type="checkbox" value="sunday">
          Sun
        </label>

      </div>

    </div>


    <label class="ai-goal-field">
      <span>Hard sessions per week</span>

      <input
        type="number"
        min="0"
        max="5"
        data-training-field="intense_sessions_per_week"
        placeholder="e.g. 2"
      >
    </label>


    <label class="ai-goal-field">
      <span>Current weekly volume</span>

      <input
        type="number"
        min="0"
        step="1"
        data-training-field="current_weekly_km"
        placeholder="e.g. 90"
      >
    </label>


    <label class="ai-goal-field">
      <span>Current longest run</span>

      <input
        type="number"
        min="0"
        step="0.5"
        data-training-field="current_long_run_km"
        placeholder="e.g. 20"
      >
    </label>


    <label class="ai-goal-field">
      <span>Preferred long-run day</span>

      <select
        data-training-field="preferred_long_run_day"
      >
        <option value="">Select day</option>
        <option value="monday">Monday</option>
        <option value="tuesday">Tuesday</option>
        <option value="wednesday">Wednesday</option>
        <option value="thursday">Thursday</option>
        <option value="friday">Friday</option>
        <option value="saturday">Saturday</option>
        <option value="sunday">Sunday</option>
      </select>
    </label>


    <label class="ai-goal-field">
      <span>Double days allowed?</span>

      <select
        data-training-field="double_days_allowed"
      >
        <option value="">Select</option>
        <option value="true">Yes</option>
        <option value="false">No</option>
      </select>
    </label>


    <label class="ai-goal-field">
      <span>Maximum distance — normal training day</span>

      <input
        type="number"
        min="0"
        step="0.5"
        data-training-field="max_normal_day_km"
        placeholder="e.g. 16"
      >
    </label>


    <label class="ai-goal-field">
      <span>Maximum distance — long run</span>

      <input
        type="number"
        min="0"
        step="0.5"
        data-training-field="max_long_run_km"
        placeholder="e.g. 25"
      >
    </label>


    <label class="ai-goal-field">
      <span>Notes <small>(optional)</small></span>

      <textarea
        data-training-field="notes"
        rows="3"
        placeholder="Anything Puri should consider when building your plan..."
      ></textarea>
    </label>


    <div class="ai-training-setup-error"></div>


    <button
      type="button"
      class="ai-training-review-button"
    >
      Review training setup →
    </button>
  `;


  messages.appendChild(card);

  messages.scrollTop =
    messages.scrollHeight;


  const reviewButton =
    card.querySelector(
      ".ai-training-review-button"
    );


  reviewButton.addEventListener(
    "click",
    () => {

      const trainingData = {};


      card
        .querySelectorAll(
          "[data-training-field]"
        )
        .forEach((field) => {

          trainingData[
            field.dataset.trainingField
          ] =
            field.value.trim();

        });


      const selectedDays =
        Array.from(
          card.querySelectorAll(
            ".ai-training-days input:checked"
          )
        ).map(
          (checkbox) =>
            checkbox.value
        );


      trainingData.preferred_weekdays =
        selectedDays;


      const requiredFields = [
        "sessions_per_week",
        "intense_sessions_per_week",
        "current_weekly_km",
        "current_long_run_km",
        "preferred_long_run_day",
        "double_days_allowed",
        "max_normal_day_km",
        "max_long_run_km"
      ];


      const missing =
        requiredFields.filter(
          (field) =>
            !trainingData[field]
        );


      const errorBox =
        card.querySelector(
          ".ai-training-setup-error"
        );


      if (
        missing.length ||
        selectedDays.length === 0
      ) {

        errorBox.textContent =
          "Please complete all required fields.";

        return;
      }


      errorBox.textContent = "";


      console.log(
  "Training setup:",
  trainingData
);


appendTrainingSetupReview(
  trainingData,
  card
);

    }
  );

}

/* =========================================
   CONFIRM / CANCEL ACTION
========================================= */

async function handlePendingAction(
  action,
  decision,
  card,
  confirmButton,
  cancelButton
) {

  confirmButton.disabled = true;
  cancelButton.disabled = true;


  const oldConfirmText =
    confirmButton.innerHTML;


  confirmButton.textContent =
    decision === "confirm"
      ? "Saving..."
      : "Please wait...";


  try {

    const {
      data,
      error
    } =
      await supabaseClient.functions
        .invoke(
          "twete-ai-action",
          {
            body: {
              action_id: action.id,
              decision: decision
            }
          }
        );


    if (error) {
      throw error;
    }


    if (!data?.ok) {

      throw new Error(
        data?.error ||
        "Could not process action."
      );

    }


    card.classList.add(
      decision === "confirm"
        ? "confirmed"
        : "cancelled"
    );


    const buttons =
      card.querySelector(
        ".ai-action-buttons"
      );


    const isCreate =
  action.action_type === "create_goal";

     const isWorkoutUpdate =
  action.action_type ===
  "update_workout";


buttons.innerHTML =
  decision === "confirm"
    ? `
      <div class="ai-action-result success">
        ✓ ${isCreate
          ? "Goal created"
          : isWorkoutUpdate
            ? "Workout updated"
            : "Goal updated"}
      </div>
    `
    : `
      <div class="ai-action-result">
        ${isCreate
          ? "Goal creation cancelled"
          : "Change cancelled"}
      </div>
    `;


if (decision === "confirm") {

  if (isCreate) {

    appendMessage(
      "Done — your new goal has been created. Would you like me to create a training plan for this goal?",
      "assistant"
    );


    const planButton =
      document.createElement("button");

    planButton.type =
      "button";

    planButton.className =
      "ai-create-plan-button";

    planButton.textContent =
      "Create training plan →";


    messages.appendChild(
      planButton
    );


    messages.scrollTop =
      messages.scrollHeight;


    planButton.addEventListener(
  "click",
  () => {

    planButton.disabled = true;


    if (
  action.preview?.after?.goal_type ===
  "general_fitness"
) {

  planButton.textContent =
    "Training plan ready to create ✓";

  appendCreateFirstTrainingWeekButton();

  return;
}


    planButton.textContent =
      "Training setup opened ✓";

    appendTrainingSetupForm();

  }
);


  } else if (isWorkoutUpdate) {

  appendMessage(
    "Done — I've updated that workout in your training plan.",
    "assistant"
  );

} else {

  appendMessage(
    "Done — your current goal has been updated.",
    "assistant"
  );

}

}

  } catch (error) {

    console.error(
      "Twete AI action error:",
      error
    );


    confirmButton.disabled = false;
    cancelButton.disabled = false;

    confirmButton.innerHTML =
      oldConfirmText;


    appendMessage(
      "I couldn't save that change. Please try again.",
      "assistant"
    );

  }

}
/* =========================================
   TYPING
========================================= */

function showTyping() {

  const wrapper =
    appendMessage(
      "Thinking…",
      "assistant"
    );

  wrapper.classList.add(
    "typing"
  );

  return wrapper;
}


/* =========================================
   TEXTAREA
========================================= */

function resizeInput() {

  input.style.height =
    "auto";

  input.style.height =
    Math.min(
      input.scrollHeight,
      140
    ) + "px";
}





/* =========================================
   CHECK LOGIN
========================================= */

async function requireLogin() {

  const {
    data: {
      session
    }
  } =
    await supabaseClient.auth
      .getSession();


  if (!session) {

    window.location.href =
      "index.html";

    return false;
  }


  return true;
}

/* =========================================
   PURI LOCAL TIME CONTEXT
========================================= */

async function getPuriTimeContext() {

  const {
    data: { user },
    error: userError
  } =
    await supabaseClient.auth.getUser();


  if (userError || !user) {

    throw new Error(
      "No logged-in athlete found."
    );

  }


  const {
    data: profile,
    error: profileError
  } =
    await supabaseClient
      .from("profiles")
      .select(`
        country,
        timezone
      `)
      .eq(
        "id",
        user.id
      )
      .single();


  if (profileError) {

    console.error(
      "Could not load athlete timezone:",
      profileError
    );

  }


  const timezone =
    profile?.timezone ||
    Intl.DateTimeFormat()
      .resolvedOptions()
      .timeZone ||
    "UTC";


  const now =
    new Date();


  const dateFormatter =
    new Intl.DateTimeFormat(
      "en-CA",
      {
        timeZone: timezone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
      }
    );


  const timeFormatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: timezone,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
      }
    );


  const weekdayFormatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone: timezone,
        weekday: "long"
      }
    );


  return {

    country:
      profile?.country || null,

    timezone:
      timezone,

    local_date:
      dateFormatter.format(now),

    local_time:
      timeFormatter.format(now),

    weekday:
      weekdayFormatter.format(now)

  };

}
/* =========================================
   SAVE WEEKLY REVIEW RESPONSE
========================================= */
async function saveWeeklyReviewResponse(
  response
) {

  const {
    data: { user },
    error: userError
  } =
    await supabaseClient.auth.getUser();


  if (userError || !user) {
    throw new Error(
      "No logged-in athlete found."
    );
  }


  /* =====================================
     FIND CURRENT GOAL
  ===================================== */

  const {
    data: goal,
    error: goalError
  } =
    await supabaseClient
      .from("goals")
      .select(`
        id,
        program_id
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
      .single();


  if (
    goalError ||
    !goal?.program_id
  ) {
    throw new Error(
      "No active training program found."
    );
  }


  /* =====================================
     FIND CURRENT TRAINING WEEK
  ===================================== */

  const today =
    new Date()
      .toISOString()
      .split("T")[0];


  const {
    data: currentWeeks,
    error: weekError
  } =
    await supabaseClient
      .from("training_weeks")
      .select(`
        id,
        program_id,
        week_number,
        start_date,
        end_date
      `)
      .eq(
        "program_id",
        goal.program_id
      )
      .lte(
        "start_date",
        today
      )
      .gte(
        "end_date",
        today
      )
      .limit(1);


  if (weekError) {
    throw weekError;
  }


  const currentWeek =
    currentWeeks?.[0];


  if (!currentWeek) {
    throw new Error(
      "No current training week found."
    );
  }


  /* =====================================
     CHECK FOR EXISTING REVIEW
  ===================================== */

  const {
    data: existingReviews,
    error: reviewCheckError
  } =
    await supabaseClient
      .from("ai_weekly_reviews")
      .select(`
        id,
        training_week_id,
        status
      `)
      .eq(
        "athlete_id",
        user.id
      )
      .eq(
        "training_week_id",
        currentWeek.id
      )
      .limit(1);


  if (reviewCheckError) {
    throw reviewCheckError;
  }


  const existingReview =
    existingReviews?.[0];


  /* =====================================
     REVIEW ALREADY EXISTS
     -> REUSE IT
  ===================================== */

  if (existingReview) {

    const {
      data: updatedReview,
      error: updateError
    } =
      await supabaseClient
        .from("ai_weekly_reviews")
        .update({

          athlete_response:
            response,

          status:
            "ready",

          puri_assessment:
            null,

          puri_decision:
            null,

          puri_reasoning:
            null,

          reviewed_at:
            null,

          updated_at:
            new Date().toISOString()

        })
        .eq(
          "id",
          existingReview.id
        )
        .eq(
          "athlete_id",
          user.id
        )
        .select()
        .single();


    if (updateError) {
      throw updateError;
    }


    console.log(
      "Existing weekly review reset:",
      updatedReview
    );


    return {
  review:
    updatedReview,

  currentWeek:
    currentWeek
};
  }


  /* =====================================
     NO REVIEW EXISTS
     -> CREATE ONE
  ===================================== */

  const reviewPayload = {

    athlete_id:
      user.id,

    program_id:
      goal.program_id,

    training_week_id:
      currentWeek.id,

    week_number:
      currentWeek.week_number,

    week_start_date:
      currentWeek.start_date,

    week_end_date:
      currentWeek.end_date,

    athlete_response:
      response,

    status:
      "ready"

  };


  const {
    data: newReview,
    error: insertError
  } =
    await supabaseClient
      .from("ai_weekly_reviews")
      .insert(
        reviewPayload
      )
      .select()
      .single();


  if (insertError) {
    throw insertError;
  }


  console.log(
    "New weekly review created:",
    newReview
  );


  return {
  review:
    newReview,

  currentWeek:
    currentWeek
};
  }

/* =========================================
   SUNDAY WEEKLY REVIEW
========================================= */

function appendWeeklyReviewOptions() {

  const card =
    document.createElement("div");

  card.className =
    "ai-goal-form";


  card.innerHTML = `

    <div class="ai-goal-form-label">
      WEEKLY REVIEW
    </div>

    <div class="ai-goal-form-title">
      How are you feeling about your training?
    </div>

    <div class="ai-goal-form-subtitle">
      Your answer helps Puri decide how to approach your next training week.
    </div>


    <div class="ai-goal-type-options">

      <button
        type="button"
        class="ai-goal-type-option"
        data-weekly-response="more_recovery"
      >
        <div class="ai-goal-type-content">
          <strong>
            I could use more recovery
          </strong>
        </div>
      </button>


      <button
        type="button"
        class="ai-goal-type-option"
        data-weekly-response="feels_right"
      >
        <div class="ai-goal-type-content">
          <strong>
            This feels about right
          </strong>
        </div>
      </button>


      <button
        type="button"
        class="ai-goal-type-option"
        data-weekly-response="ready_for_progression"
      >
        <div class="ai-goal-type-content">
          <strong>
            I'm ready for progression
          </strong>
        </div>
      </button>

    </div>

  `;


  messages.appendChild(
    card
  );


  messages.scrollTop =
    messages.scrollHeight;


  card
    .querySelectorAll(
      "[data-weekly-response]"
    )
    .forEach(
      button => {

        button.addEventListener(
  "click",
  async () => {

    const response =
      button.dataset.weeklyResponse;


    const allButtons =
      card.querySelectorAll(
        "[data-weekly-response]"
      );


    allButtons.forEach(
      item => {
        item.disabled = true;
      }
    );


try {

  const savedReview =
    await saveWeeklyReviewResponse(
      response
    );


  const {
    data,
    error
  } =
    await supabaseClient.functions.invoke(
      "twete-weekly-review",
      {
        body: {
          week_number:
            savedReview.currentWeek.week_number,

          week_start_date:
            savedReview.currentWeek.start_date,

          week_end_date:
            savedReview.currentWeek.end_date
        }
      }
    );


  if (error) {
    throw error;
  }


  if (!data?.decision) {

    throw new Error(
      data?.error ||
      "Puri could not complete the weekly review."
    );

  }


  card.remove();


  appendMessage(
    data.assessment ||
    "I reviewed your training week.",
    "assistant"
  );


  appendMessage(
    `My decision for next week: ${data.decision}.`,
    "assistant"
  );


  if (data.reasoning) {

    appendMessage(
      data.reasoning,
      "assistant"
    );

  }

const {
  data: adaptiveData,
  error: adaptiveError
} =
  await supabaseClient.functions.invoke(
    "twete-adaptive-week",
    {
      body: {}
    }
  );


if (adaptiveError) {
  throw adaptiveError;
}

/* =====================================
   EXISTING NEXT WEEK REVIEW
===================================== */

if (
  adaptiveData?.ui_action ===
  "show_existing_week_review"
) {

  appendMessage(
    adaptiveData.answer ||
    "I reviewed your already planned next week.",
    "assistant"
  );


  if (adaptiveData.assessment) {

    appendMessage(
      adaptiveData.assessment,
      "assistant"
    );

  }


  if (adaptiveData.reasoning) {

    appendMessage(
      adaptiveData.reasoning,
      "assistant"
    );

  }


  if (
    adaptiveData.keep_as_is === true
  ) {

    appendMessage(
      "I recommend keeping the upcoming week exactly as it is.",
      "assistant"
    );

    return;
  }


  const changes =
    Array.isArray(
      adaptiveData.proposed_changes
    )
      ? adaptiveData.proposed_changes
      : [];


  if (!changes.length) {

    appendMessage(
      "I don't recommend any specific changes to the upcoming week.",
      "assistant"
    );

    return;
  }


  const card =
    document.createElement("div");

  card.className =
    "ai-action-card";


  const label =
    document.createElement("div");

  label.className =
    "ai-action-label";

  label.textContent =
    "NEXT WEEK REVIEW";


  const title =
    document.createElement("div");

  title.className =
    "ai-action-title";

  title.textContent =
    "Puri recommends these changes";


  const changeList =
    document.createElement("div");

  changeList.className =
    "ai-action-changes";


  changes.forEach(
    (change) => {

      const row =
        document.createElement("div");

      row.className =
        "ai-action-row";


      const workout =
        adaptiveData.existing_workouts
          ?.find(
            item =>
              item.id ===
              change.workout_id
          );


      const field =
        document.createElement("span");

      field.className =
        "ai-action-field";

      field.textContent =
        workout?.title ||
        "Workout";


      const values =
        document.createElement("div");

      values.className =
        "ai-action-values";


      const reason =
        document.createElement("span");

      reason.className =
        "ai-action-new";

      reason.textContent =
        change.reason ||
        "Puri recommends an adjustment.";


      values.appendChild(
        reason
      );


      row.append(
        field,
        values
      );


      changeList.appendChild(
        row
      );

    }
  );


  card.append(
    label,
    title,
    changeList
  );


  messages.appendChild(
    card
  );


  messages.scrollTop =
    messages.scrollHeight;


  console.log(
    "Puri existing week review:",
    adaptiveData
  );


  return;
}

const adaptiveWeek =
  adaptiveData?.training_week ||
  null;


if (!adaptiveWeek) {

  throw new Error(
    adaptiveData?.error ||
    "Puri could not prepare the next training week."
  );

}


appendMessage(
  adaptiveData.answer ||
  "Your next training week is ready for review.",
  "assistant"
);


const adaptiveWeekContext = {
  goal: null,
  preferences: null,
  program: {
    id:
      savedReview.currentWeek.program_id
  },
  existingWeeks: [],
  nextWeekNumber:
    adaptiveWeek.week_number
};


appendTrainingWeekPreview(
  adaptiveWeek,
  adaptiveWeekContext,
  true
);
    } catch (error) {

      console.error(
        "Weekly review save error:",
        error
      );


      allButtons.forEach(
        item => {
          item.disabled = false;
        }
      );


      appendMessage(
  "DEBUG ERROR: " +
  String(
    error?.message ||
    error?.details ||
    error ||
    "Unknown error"
  ),
  "assistant"
);

    }

  }
);

      }
    );

}
/* =========================================
   ASK TWETE AI
========================================= */

async function askTweteAI(
  message
) {

  const timeContext =
    await getPuriTimeContext();


  const {
    data,
    error
  } =
    await supabaseClient.functions
      .invoke(
        "twete-ai",
        {

          body: {
            message: message,

            time_context:
              timeContext
          }

        }
      );


  if (error) {

    console.error(
      "Twete AI function error:",
      error
    );

    throw new Error(
      "Twete AI could not answer right now."
    );
  }


  if (!data?.answer) {

    throw new Error(
      data?.error ||
      "Twete AI returned no answer."
    );
  }


  return {
    answer:
      data.answer,

    pendingAction:
      data.pending_action || null,

    uiAction:
      data.ui_action || null
  };

}

/* =========================================
   SEND MESSAGE
========================================= */

form.addEventListener(
  "submit",
  async (event) => {

    event.preventDefault();


    const message =
      input.value.trim();


    if (
      !message ||
      sendButton.disabled
    ) {
      return;
    }


    appendMessage(
      message,
      "user"
    );


    input.value =
      "";

    resizeInput();


    sendButton.disabled =
      true;


    const typing =
      showTyping();


    try {
/* =====================================
   MANUAL WEEKLY REVIEW TEST
===================================== */

if (
  message
    .trim()
    .toLowerCase() ===
  "send me weekly review"
) {

  typing.remove();

  appendMessage(
    "Let's review your training week.",
    "assistant"
  );

  appendWeeklyReviewOptions();

  return;
}
      if (
    isGoalDeleteRequest(
        message
    )
) {

    typing.remove();

    await handlePuriGoalDeleteRequest();

    return;

}


/* =====================================
   HANDLE TRAINING CORRECTION
===================================== */

if (
    pendingTrainingCorrection &&
    isPositiveAnswer(
        message
    )
) {

    const correction =
        pendingTrainingCorrection;


    pendingTrainingCorrection =
        null;

const result =
    moveGeneratedWeeksToNextFreeDates(
        correction.generatedWeeks,
        correction.existingWeeks
    );


if (result) {

    refreshTrainingWeekPreviewDates(
        correction.generatedWeeks
    );

}


typing.remove();


    if (!result) {

        appendMessage(
            "I couldn't calculate the new dates. Nothing was changed.",
            "assistant"
        );

        return;
    }


    appendMessage(
        "Done — I moved the training to the next free period: " +
        result.startDate +
        " to " +
        result.endDate +
        ". Nothing in your existing plan was overwritten. Please confirm the plan again when you're ready.",
        "assistant"
    );


    return;
}

/* =====================================
   TEST NEXT WEEK DETECTION
===================================== */

if (
  message
    .trim()
    .toLowerCase() ===
  "check next week"
) {

  const {
    data,
    error
  } =
    await supabaseClient.functions.invoke(
      "twete-adaptive-week",
      {
        body: {
          action:
            "detect_next_week"
        }
      }
    );


  typing.remove();


  if (error) {
    throw error;
  }


  if (data?.error) {

    appendMessage(
      data.error,
      "assistant"
    );

    return;
  }


  const startDate =
  data.next_week_period?.start_date ||
  "unknown";

const endDate =
  data.next_week_period?.end_date ||
  "unknown";


  let statusText = "";


  if (
    data.mode ===
    "existing_week_with_workouts"
  ) {

    statusText =
      "I found an existing training week and it already contains workouts.";

  } else if (
    data.mode ===
    "existing_empty_week"
  ) {

    statusText =
      "I found an existing training week, but it does not contain any workouts yet.";

  } else {

    statusText =
      "There is no training week for this period yet.";

  }


  appendMessage(
    `Next week: **${startDate} – ${endDate}**\n\n${statusText}`,
    "assistant"
  );


  console.log(
    "Puri next week detection:",
    data
  );


  return;
}
const result =
    await askTweteAI(
        message
    );


typing.remove();


appendMessage(
  result.answer,
  "assistant"
);


if (result.pendingAction) {

  appendPendingAction(
    result.pendingAction
  );

}

 if (
  result.uiAction ===
  "show_goal_type_selector"
) {

  appendGoalTypeSelector();

}


if (
  result.uiAction ===
  "show_goal_form"
) {

  appendGoalForm();

}

    } catch (error) {

      typing.remove();


      appendMessage(
        error?.message ||
        "Something went wrong. Please try again.",
        "assistant"
      );


    } finally {

      sendButton.disabled =
        false;

      input.focus();
    }

  }
);


/* =========================================
   INPUT EVENTS
========================================= */

input.addEventListener(
  "input",
  resizeInput
);


input.addEventListener(
  "keydown",
  (event) => {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      event.preventDefault();

      form.requestSubmit();
    }

  }
);


/* =========================================
   START
========================================= */

requireLogin();
