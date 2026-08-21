/* =========================================
   TWETE DAILY FEEDBACK CHECK-IN
========================================= */

(function () {

  const MANUAL_TRIGGERS = [
    "send me daily feedback system",
    "send me the daily feedback system",
    "send daily feedback system",
    "daily feedback system",
    "daily feedback check-in",
    "daily feedback checkin",
    "schick mir das daily feedback system",
    "schick mir daily feedback system",
    "starte daily feedback system"
  ];

  function todayLocalIso() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
  }

  function currentTimezone() {
    try {
      return Intl.DateTimeFormat()
        .resolvedOptions()
        .timeZone || null;
    } catch {
      return null;
    }
  }

  async function loadTodayWorkoutSummary(userId) {

    const date =
      todayLocalIso();

    const {
      data,
      error
    } =
      await supabaseClient
        .from("workouts")
        .select(`
          id,
          workout_date,
          title,
          completed,
          session_slot
        `)
        .eq(
          "athlete_id",
          userId
        )
        .eq(
          "workout_date",
          date
        )
        .order(
          "session_slot",
          {
            ascending: true
          }
        );

    if (error) {
      throw error;
    }

    const workouts =
      data || [];

    return {

      date,

      workouts,

      plannedCount:
        workouts.length,

      completedCount:
        workouts.filter(
          workout =>
            workout.completed === true
        ).length

    };
  }

  function createChoiceGroup({
    title,
    name,
    options
  }) {

    const section =
      document.createElement(
        "section"
      );

    section.className =
      "daily-checkin-section";

    const heading =
      document.createElement(
        "h3"
      );

    heading.textContent =
      title;

    section.appendChild(
      heading
    );

    const grid =
      document.createElement(
        "div"
      );

    grid.className =
      "daily-checkin-options";

    options.forEach(
      option => {

        const button =
          document.createElement(
            "button"
          );

        button.type =
          "button";

        button.className =
          "daily-checkin-option";

        button.dataset.choiceName =
          name;

        button.dataset.choiceValue =
          option.value;

        button.textContent =
          option.label;

        button.addEventListener(
          "click",
          () => {

            grid
              .querySelectorAll(
                ".daily-checkin-option"
              )
              .forEach(
                item =>
                  item.classList.remove(
                    "selected"
                  )
              );

            button.classList.add(
              "selected"
            );

            section.dataset.value =
              option.value;

            section.dispatchEvent(
              new CustomEvent(
                "daily-checkin-change",
                {
                  bubbles: true,

                  detail: {
                    name,
                    value:
                      option.value
                  }
                }
              )
            );

          }
        );

        grid.appendChild(
          button
        );

      }
    );

    section.appendChild(
      grid
    );

    section.dataset.choiceName =
      name;

    return section;
  }

  function getChoice(
    card,
    name
  ) {

    return (
      card
        .querySelector(
          `.daily-checkin-section[data-choice-name="${name}"]`
        )
        ?.dataset
        .value ||
      null
    );
  }

  async function ensureCheckinRow({
    userId,
    source,
    summary
  }) {

    const timezone =
      currentTimezone();

    const payload = {

      athlete_id:
        userId,

      checkin_date:
        summary.date,

      timezone,

      source,

      planned_workout_count:
        summary.plannedCount,

      completed_workout_count:
        summary.completedCount,

      status:
        "opened",

      opened_at:
        new Date()
          .toISOString(),

      updated_at:
        new Date()
          .toISOString()

    };

    const {
      data,
      error
    } =
      await supabaseClient
        .from(
          "daily_feedback_checkins"
        )
        .upsert(
          payload,
          {
            onConflict:
              "athlete_id,checkin_date,source"
          }
        )
        .select("*")
        .single();

    if (error) {
      throw error;
    }

    return data;
  }

  function appendCheckinCard({
    checkin,
    summary
  }) {

    const existing =
      document.querySelector(
        `.daily-checkin-card[data-checkin-id="${checkin.id}"]`
      );

    if (existing) {

      existing.scrollIntoView({
        behavior:
          "smooth",

        block:
          "center"
      });

      return existing;
    }

    const card =
      document.createElement(
        "div"
      );

    card.className =
      "daily-checkin-card";

    card.dataset.checkinId =
      checkin.id;

    const header =
      document.createElement(
        "div"
      );

    header.className =
      "daily-checkin-header";

    header.innerHTML = `

      <div>

        <span class="daily-checkin-label">
          DAILY CHECK-IN
        </span>

        <h2>
          How are you feeling today?
        </h2>

        <p>
          ${
            summary.plannedCount > 0
              ?
              `${summary.plannedCount} workout${summary.plannedCount === 1 ? "" : "s"} planned today.`
              :
              "Manual test check-in."
          }
        </p>

      </div>

    `;

    card.appendChild(
      header
    );

    const feelingSection =
      createChoiceGroup({

        title:
          "How do you feel?",

        name:
          "feeling",

        options: [

          {
            value:
              "great",

            label:
              "Great"
          },

          {
            value:
              "good",

            label:
              "Good"
          },

          {
            value:
              "tired",

            label:
              "Tired"
          },

          {
            value:
              "very_tired",

            label:
              "Very tired"
          },

          {
            value:
              "pain",

            label:
              "Pain"
          }

        ]

      });

    const trainingSection =
      createChoiceGroup({

        title:
          "How was your training?",

        name:
          "training_difficulty",

        options: [

          {
            value:
              "easy",

            label:
              "Easy"
          },

          {
            value:
              "as_expected",

            label:
              "As expected"
          },

          {
            value:
              "hard",

            label:
              "Hard"
          },

          {
            value:
              "very_hard",

            label:
              "Very hard"
          }

        ]

      });

    const completionSection =
      createChoiceGroup({

        title:
          "Did you complete today’s training?",

        name:
          "completion_status",

        options: [

          {
            value:
              "completed",

            label:
              "Yes"
          },

          {
            value:
              "partial",

            label:
              "Partly"
          },

          {
            value:
              "skipped",

            label:
              "Skipped"
          }

        ]

      });

    card.append(
      feelingSection,
      trainingSection,
      completionSection
    );

    const painBox =
      document.createElement(
        "section"
      );

    painBox.className =
      "daily-checkin-pain hidden";

    painBox.innerHTML = `

      <h3>
        Tell Puri where it hurts
      </h3>

      <label>

        <span>
          Where?
        </span>

        <input
          type="text"
          data-daily-pain-area
          placeholder="e.g. Achilles, calf, knee"
          maxlength="120"
        >

      </label>

      <label>

        <span>
          Pain level:
          <strong data-daily-pain-value>
            3
          </strong>/10
        </span>

        <input
          type="range"
          min="0"
          max="10"
          value="3"
          step="1"
          data-daily-pain-severity
        >

      </label>

    `;

    card.appendChild(
      painBox
    );

    const comment =
      document.createElement(
        "label"
      );

    comment.className =
      "daily-checkin-comment";

    comment.innerHTML = `

      <span>
        Anything else?
        <small>
          (optional)
        </small>
      </span>

      <textarea
        rows="3"
        maxlength="1000"
        data-daily-comment
        placeholder="Add anything Puri should know..."
      ></textarea>

    `;

    card.appendChild(
      comment
    );

    const errorBox =
      document.createElement(
        "div"
      );

    errorBox.className =
      "daily-checkin-error";

    card.appendChild(
      errorBox
    );

    const submit =
      document.createElement(
        "button"
      );

    submit.type =
      "button";

    submit.className =
      "daily-checkin-submit";

    submit.textContent =
      "Send to Puri →";

    card.appendChild(
      submit
    );

    card.addEventListener(
      "daily-checkin-change",
      event => {

        if (
          event.detail?.name ===
          "feeling"
        ) {

          painBox
            .classList
            .toggle(
              "hidden",
              event.detail.value !==
                "pain"
            );

        }

        if (
          event.detail?.name ===
          "completion_status"
        ) {

          trainingSection
            .classList
            .toggle(
              "muted",
              event.detail.value ===
                "skipped"
            );

        }

      }
    );

    const painSlider =
      card.querySelector(
        "[data-daily-pain-severity]"
      );

    const painValue =
      card.querySelector(
        "[data-daily-pain-value]"
      );

    painSlider.addEventListener(
      "input",
      () => {

        painValue.textContent =
          painSlider.value;

      }
    );

    submit.addEventListener(
      "click",
      async () => {

        const feeling =
          getChoice(
            card,
            "feeling"
          );

        const completionStatus =
          getChoice(
            card,
            "completion_status"
          );

        const trainingDifficulty =
          getChoice(
            card,
            "training_difficulty"
          );

        const painPresent =
          feeling ===
          "pain";

        const painArea =
          card
            .querySelector(
              "[data-daily-pain-area]"
            )
            .value
            .trim();

        const painSeverity =
          Number(
            painSlider.value
          );

        const optionalComment =
          card
            .querySelector(
              "[data-daily-comment]"
            )
            .value
            .trim();

        if (!feeling) {

          errorBox.textContent =
            "Please tell Puri how you feel.";

          return;
        }

        if (!completionStatus) {

          errorBox.textContent =
            "Please tell Puri whether you completed today’s training.";

          return;
        }

        if (
          completionStatus !==
            "skipped" &&
          !trainingDifficulty
        ) {

          errorBox.textContent =
            "Please rate how the training felt.";

          return;
        }

        if (
          painPresent &&
          !painArea
        ) {

          errorBox.textContent =
            "Please tell Puri where you feel pain.";

          return;
        }

        errorBox.textContent =
          "";

        submit.disabled =
          true;

        submit.textContent =
          "Saving...";

        const completedCount =

          completionStatus ===
            "completed"
            ?
            summary.plannedCount
            :
            completionStatus ===
              "partial"
              ?
              Math.max(
                0,
                Math.min(
                  summary.plannedCount,
                  summary.completedCount ||
                    1
                )
              )
              :
              0;

        const update = {

          feeling,

          training_difficulty:
            completionStatus ===
              "skipped"
              ?
              null
              :
              trainingDifficulty,

          completion_status:
            completionStatus,

          completed_workout_count:
            completedCount,

          pain_present:
            painPresent,

          pain_area:
            painPresent
              ?
              painArea
              :
              null,

          pain_severity:
            painPresent
              ?
              painSeverity
              :
              null,

          optional_comment:
            optionalComment ||
            null,

          status:
            "answered",

          answered_at:
            new Date()
              .toISOString(),

          updated_at:
            new Date()
              .toISOString()

        };

        const {
          error
        } =
          await supabaseClient
            .from(
              "daily_feedback_checkins"
            )
            .update(
              update
            )
            .eq(
              "id",
              checkin.id
            );

        if (error) {

          console.error(
            "Daily check-in save error:",
            error
          );

          submit.disabled =
            false;

          submit.textContent =
            "Send to Puri →";

          errorBox.textContent =
            "Puri couldn't save this check-in. Please try again.";

          return;
        }

        card.classList.add(
          "submitted"
        );

        submit.textContent =
          "✓ Feedback saved";



         if (
  typeof appendMessage ===
  "function"
) {

  appendMessage(
    "Thanks — I've saved your check-in. I'm reviewing your next training days now.",
    "assistant"
  );

}


try {

  const {
    data: recoveryData,
    error: recoveryError
  } =
    await supabaseClient.functions
      .invoke(
        "twete-daily-recovery",
        {
          body: {
            checkin_id:
              checkin.id
          }
        }
      );


  if (recoveryError) {
    throw recoveryError;
  }


  if (
    recoveryData?.answer &&
    typeof appendMessage ===
      "function"
  ) {

    appendMessage(
      recoveryData.answer,
      "assistant"
    );

  }


  if (
    recoveryData?.pending_action &&
    typeof appendPendingAction ===
      "function"
  ) {

    appendPendingAction(
      recoveryData.pending_action
    );

  }


} catch (recoveryError) {

  console.error(
    "Daily recovery analysis error:",
    recoveryError
  );


  if (
    typeof appendMessage ===
    "function"
  ) {

    appendMessage(
      "Your feedback was saved, but I couldn't review the upcoming training right now.",
      "assistant"
    );

  }

}

      }
    );

    messages.appendChild(
      card
    );

    messages.scrollTop =
      messages.scrollHeight;

    return card;
  }

  async function openDailyFeedbackCheckin(
    options = {}
  ) {

    const source =
      options.source ||
      "manual_test";

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

    const summary =
      await loadTodayWorkoutSummary(
        user.id
      );

    const checkin =
      await ensureCheckinRow({

        userId:
          user.id,

        source,

        summary

      });

    return appendCheckinCard({

      checkin,

      summary

    });
  }

  window.openDailyFeedbackCheckin =
    openDailyFeedbackCheckin;

  const form =
    document.getElementById(
      "aiForm"
    );

  if (form) {

    form.addEventListener(
      "submit",
      async event => {

        const input =
          document.getElementById(
            "aiInput"
          );

        const raw =
          String(
            input?.value ||
            ""
          )
            .trim();

        const normalized =
          raw
            .toLowerCase();

        if (
          !MANUAL_TRIGGERS.includes(
            normalized
          )
        ) {
          return;
        }

        event.preventDefault();

        event.stopImmediatePropagation();

        if (
          typeof appendMessage ===
          "function"
        ) {

          appendMessage(
            raw,
            "user"
          );

          appendMessage(
            "Sure — I'm sending you the Daily Feedback check-in now.",
            "assistant"
          );

        }

        input.value =
          "";

        try {

          await openDailyFeedbackCheckin({
            source:
              "manual_test"
          });

        } catch (error) {

          console.error(
            "Daily check-in open error:",
            error
          );

          if (
            typeof appendMessage ===
            "function"
          ) {

            appendMessage(
              "I couldn't open the Daily Feedback check-in right now. Please try again.",
              "assistant"
            );

          }

        }

      },
      true
    );

  }

})();
