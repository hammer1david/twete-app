/* =========================================
   TWETE GOAL PAGE JAVASCRIPT
========================================= */


/* =========================================
   HOME
========================================= */

function goHome() {

    window.location.href = "athlete.html";

}


/* =========================================
   MESSAGES
========================================= */

function openMessages() {

    window.location.href = "messages.html";

}


/* =========================================
   WEEK SELECTION
========================================= */

function selectWeek(week) {

    const buttons =
        document.querySelectorAll(".week-button");


    buttons.forEach(function(button) {

        button.classList.remove("active");

    });


    buttons[week - 1].classList.add("active");


    /*
        Move the week indicator.

        6 weeks total.
    */

    const progress =
        (week / 6) * 100;


    document.querySelector(
        ".week-indicator-fill"
    ).style.width =
        progress + "%";


    /*
        Later we can load the
        real training plan here.

        For example:

        week 1 → base training
        week 2 → build
        week 3 → specific
        week 4 → race preparation
        week 5 → sharpening
        week 6 → race week
    */

    console.log(
        "Selected week:",
        week
    );

}


/* =========================================
   WORKOUT CHECK
========================================= */

function toggleWorkout(button) {

    const card =
        button.closest(".workout-card");


    const isDone =
        button.classList.contains("done");


    if (isDone) {

        button.classList.remove("done");

        button.textContent = "";

        card.classList.remove("completed");

        return;

    }


    button.classList.add("done");

    button.textContent = "✓";

    card.classList.add("completed");

}


/* =========================================
   START WORKOUT
========================================= */

function startWorkout() {

    alert(
        "Workout started!\n\n6 × 1000 m @ 3:40/km"
    );

}


/* =========================================
   FULL TRAINING PLAN
========================================= */

function viewFullPlan() {

    /*
        We can connect this later
        to training.html.
    */

    window.location.href =
        "training.html";

}


/* =========================================
   FEEDBACK
========================================= */

function addFeedback() {

    const feedback =
        prompt(
            "Write your feedback:"
        );


    if (!feedback) {
        return;
    }


    alert(
        "Your feedback has been saved."
    );

}
