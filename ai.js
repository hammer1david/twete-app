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
    target_time: "Target time",
    target_date: "Target date",
    goal_name: "Goal name",
    distance: "Distance",
    current_pb: "Current PB",
    current_performance: "Current performance",
    progress: "Progress"
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
  action.action_type === "create_goal";

label.textContent =
  isCreate
    ? "CREATE NEW GOAL"
    : "UPDATE CURRENT GOAL";




  const title =
    document.createElement("div");

  title.className =
    "ai-action-title";

  title.textContent =
  isCreate
    ? "Confirm your new goal"
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

newValue.textContent =
  after[field] ?? "—";


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

function appendTrainingWeekPreview(
  trainingWeek,
  weekContext,
  showActions = true
) {

  const card =
    document.createElement("div");

  card.className =
    "ai-training-week-preview";


  const title =
    document.createElement("div");

  title.className =
    "ai-goal-form-title";

  title.textContent =
    `Week ${trainingWeek.week_number}`;


  const focus =
    document.createElement("div");

  focus.className =
    "ai-goal-form-subtitle";

  focus.textContent =
    trainingWeek.focus || "";


  const sessions =
    document.createElement("div");

  sessions.className =
    "ai-training-week-sessions";


  trainingWeek.sessions.forEach(
    (session) => {

      const row =
        document.createElement("div");

      row.className =
        "ai-training-week-session";


      const day =
        document.createElement("div");

      day.className =
        "ai-training-week-day";

      day.textContent =
        `${session.day} · ${
          session.session_slot === 2
            ? "PM"
            : "AM"
        }`;


      const sessionTitle =
        document.createElement("div");

      sessionTitle.className =
        "ai-training-week-title";

      sessionTitle.textContent =
        session.title;


      const details =
        document.createElement("div");

      details.className =
        "ai-training-week-details";


      const parts = [];


      if (
        session.distance_km !== null &&
        session.distance_km !== undefined
      ) {
        parts.push(
          `${session.distance_km} km`
        );
      }


      if (session.pace_type) {
        parts.push(
          session.pace_type
        );
      }


      if (session.rest) {
        parts.push(
          `Rest: ${session.rest}`
        );
      }


      details.textContent =
        parts.join(" · ");


      const notes =
        document.createElement("div");

      notes.className =
        "ai-training-week-notes";

      notes.textContent =
        session.notes || "";


      row.append(
        day,
        sessionTitle,
        details,
        notes
      );


      sessions.appendChild(row);

    }
  );


  const coachNote =
    document.createElement("div");

  coachNote.className =
    "ai-training-week-coach-note";

  coachNote.textContent =
    trainingWeek.coach_note || "";


  const buttons =
    document.createElement("div");

  buttons.className =
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


  buttons.append(
    changeButton,
    confirmButton
  );


  card.append(
  title,
  focus,
  sessions,
  coachNote
);


if (showActions) {
  card.appendChild(buttons);
}


  messages.appendChild(card);

  messages.scrollTop =
    messages.scrollHeight;


  changeButton.addEventListener(
    "click",
    () => {

      appendMessage(
        "Tell me what you would like to change in this week.",
        "assistant"
      );

    }
  );


  confirmButton.addEventListener(
    "click",
    () => {

      confirmButton.disabled =
        true;

      changeButton.disabled =
        true;

      confirmButton.textContent =
        "Week ready to save ✓";


      console.log(
        "Confirmed week preview:",
        {
          trainingWeek,
          weekContext
        }
      );

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


    /*
 * NEXT STEP:
 * 1. Load current goal
 * 2. Load athlete training preferences
 * 3. Load relevant athlete memory/current state
 * 4. Generate exactly ONE training week
 * 5. Show week preview
 * 6. Save only after athlete confirms
 */


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
  Array.isArray(data?.training_weeks)
    ? data.training_weeks
    : data?.training_week
      ? [data.training_week]
      : [];


if (!generatedWeeks.length) {
  throw new Error(
    "No training week returned."
  );
}


console.log(
  "Generated training weeks:",
  generatedWeeks
);


if (generatedWeeks.length === 2) {

  createPlanButton.textContent =
    `Weeks ${generatedWeeks[0].week_number}–${generatedWeeks[1].week_number} ready ✓`;

} else {

  createPlanButton.textContent =
    `Week ${generatedWeeks[0].week_number} ready ✓`;

}


if (generatedWeeks.length === 2) {

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


  messages.scrollTop =
    messages.scrollHeight;


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

    confirmPlanButton.disabled = true;
    changePlanButton.disabled = true;

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


      console.log(
        "Training plan saved:",
        data
      );


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


      appendMessage(
        "I couldn't save the plan yet. Please try again.",
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


buttons.innerHTML =
  decision === "confirm"
    ? `
      <div class="ai-action-result success">
        ✓ ${isCreate
          ? "Goal created"
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

    planButton.disabled =
      true;

    planButton.textContent =
      "Training setup opened ✓";


    appendTrainingSetupForm();

  }
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
   ASK TWETE AI
========================================= */

async function askTweteAI(
  message
) {

  const {
    data,
    error
  } =
    await supabaseClient.functions
      .invoke(
        "twete-ai",
        {

          body: {
  message: message
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
  answer: data.answer,
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
