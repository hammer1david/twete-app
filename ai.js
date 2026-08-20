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

  bubble.textContent =
    text;


  wrapper.appendChild(bubble);

  messages.appendChild(wrapper);


  messages.scrollTop =
    messages.scrollHeight;


  return wrapper;
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
   ATHLETE CONTEXT
========================================= */

function getAthleteContext() {

  /*
    Later we will load:

    - athlete profile
    - current goal
    - PBs
    - training program
    - recent workouts
    - workout feedback

    directly from Supabase.
  */

  return {};
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

            message:
              message,

            athlete:
              getAthleteContext()

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


  return data.answer;
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

      const answer =
        await askTweteAI(
          message
        );


      typing.remove();


      appendMessage(
        answer,
        "assistant"
      );


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
