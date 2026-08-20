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
              action_id: actionid,
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

  appendMessage(
    isCreate
      ? "Done — your new goal has been created. Would you like me to create a training plan for this goal?"
      : "Done — your current goal has been updated.",
    "assistant"
  );

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
  pendingAction: data.pending_action || null
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
