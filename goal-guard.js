/* =========================================
   TWETE ONE ACTIVE GOAL GUARD
========================================= */

(function () {

  const form =
    document.getElementById("aiForm");

  const input =
    document.getElementById("aiInput");

  if (!form || !input) {
    return;
  }

  let bypassNextSubmit =
    false;


  function isNewGoalRequest(
    message
  ) {

    const text =
      String(message || "")
        .trim()
        .toLowerCase();


    if (!text) {
      return false;
    }


    const obviousPhrases = [

      "new goal",
      "create goal",
      "create a goal",
      "start a new goal",
      "add a goal",

      "neues ziel",
      "neues goal",
      "ziel erstellen",
      "goal erstellen",
      "ziel anlegen",
      "goal anlegen"

    ];


    const hasGoalWord =
      text.includes("goal") ||
      text.includes("ziel") ||
      text.includes("race") ||
      text.includes("wettkampf");


    const hasStartWord =
      text.includes("new") ||
      text.includes("create") ||
      text.includes("start") ||
      text.includes("add") ||
      text.includes("neu") ||
      text.includes("erstellen") ||
      text.includes("anlegen") ||
      text.includes("starten");


    return (
      obviousPhrases.some(
        phrase =>
          text.includes(phrase)
      ) ||
      (
        hasGoalWord &&
        hasStartWord
      )
    );
  }


  async function loadActiveGoal() {

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
      data,
      error
    } =
      await supabaseClient
        .from("goals")
        .select(`
          id,
          goal_name,
          distance,
          target_date,
          status
        `)
        .eq(
          "athlete_id",
          user.id
        )
        .eq(
          "status",
          "active"
        )
        .limit(1);


    if (error) {
      throw error;
    }


    return (
      data?.[0] ||
      null
    );
  }


  form.addEventListener(
    "submit",
    async event => {

      if (
        bypassNextSubmit
      ) {

        bypassNextSubmit =
          false;

        return;
      }


      const message =
        String(
          input.value ||
          ""
        ).trim();


      if (
        !isNewGoalRequest(
          message
        )
      ) {
        return;
      }


      event.preventDefault();

      event.stopImmediatePropagation();


      try {

        const activeGoal =
          await loadActiveGoal();


        if (!activeGoal) {

          bypassNextSubmit =
            true;

          form.requestSubmit();

          return;
        }


        if (
          typeof appendMessage ===
          "function"
        ) {

          appendMessage(
            message,
            "user"
          );


          const goalName =
            activeGoal.goal_name ||
            activeGoal.distance ||
            "your current goal";


          appendMessage(
            `You already have an active goal: ${goalName}. To keep your training focused, Twete allows only one active goal at a time. Finish or delete your current goal before starting a new one.`,
            "assistant"
          );

        }


        input.value =
          "";


      } catch (error) {

        console.error(
          "Active goal guard error:",
          error
        );


        if (
          typeof appendMessage ===
          "function"
        ) {

          appendMessage(
            "I couldn't verify your active goal right now. Please try again.",
            "assistant"
          );

        }

      }

    },
    true
  );

})();
