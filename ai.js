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
   CREATE GOAL FORM
========================================= */

function appendGoalForm() {

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
      <span>Current performance</span>

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

      const goalData = {};

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
        "target_date",
        "current_performance"
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


      reviewButton.textContent =
        "Training setup ready ✓";

      reviewButton.disabled =
        true;

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
