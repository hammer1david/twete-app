/* =========================================
   TWETE COACH CALENDAR
========================================= */


let currentDate = new Date();

let currentView = "month";


/* =========================================
   NAVIGATION
========================================= */

function goTo(page) {

    window.location.href = page;

}


function logout() {

    localStorage.removeItem("strideLabRole");

    window.location.href = "../index.html";

}


/* =========================================
   GOOGLE CALENDAR
========================================= */

function connectGoogleCalendar() {

    /*
        Temporary connection simulation.

        Later this button will start the real
        Google OAuth authorization flow.
    */

    const confirmed = confirm(
        "Google Calendar connection will be added here.\n\n" +
        "For now, would you like to simulate the connection?"
    );


    if (!confirmed) {
        return;
    }


    localStorage.setItem(
        "googleCalendarConnected",
        "true"
    );


    updateConnectionStatus();

}


function disconnectGoogleCalendar() {

    localStorage.removeItem(
        "googleCalendarConnected"
    );


    updateConnectionStatus();

}


function updateConnectionStatus() {

    const connected =
        localStorage.getItem(
            "googleCalendarConnected"
        ) === "true";


    const button =
        document.querySelector(
            ".google-button"
        );


    const message =
        document.getElementById(
            "connectionMessage"
        );


    if (connected) {

        button.innerHTML =
            '<span class="google-icon">✓</span> Google Calendar Connected';

        message.classList.remove(
            "hidden"
        );

    } else {

        button.innerHTML =
            '<span class="google-icon">G</span> Connect Google Calendar';

        message.classList.add(
            "hidden"
        );

    }

}


/* =========================================
   CALENDAR EVENTS
========================================= */

const events = [

    {
        date: "2026-08-18",
        title: "Athlete Review",
        type: "lime"
    },

    {
        date: "2026-08-20",
        title: "Training Plan Review",
        type: "blue"
    },

    {
        date: "2026-08-22",
        title: "Athlete Meeting",
        type: "orange"
    },

    {
        date: "2026-08-25",
        title: "David — Program Review",
        type: "lime"
    },

    {
        date: "2026-08-27",
        title: "Joy — Program Ends",
        type: "blue"
    }

];


/* =========================================
   RENDER CALENDAR
========================================= */

function renderCalendar() {

    const container =
        document.getElementById(
            "calendarDays"
        );


    container.innerHTML = "";


    const year =
        currentDate.getFullYear();


    const month =
        currentDate.getMonth();


    const firstDay =
        new Date(
            year,
            month,
            1
        );


    const lastDay =
        new Date(
            year,
            month + 1,
            0
        );


    /*
        Convert Sunday-first JavaScript
        calendar into Monday-first.
    */

    let startingDay =
        firstDay.getDay();

    startingDay =
        startingDay === 0
            ? 6
            : startingDay - 1;


    const daysInMonth =
        lastDay.getDate();


    const previousMonthLastDay =
        new Date(
            year,
            month,
            0
        ).getDate();


    const totalCells =
        Math.ceil(
            (
                startingDay +
                daysInMonth
            ) / 7
        ) * 7;


    for (
        let i = 0;
        i < totalCells;
        i++
    ) {

        let dayNumber;

        let cellDate;

        let otherMonth = false;


        if (i < startingDay) {

            dayNumber =
                previousMonthLastDay -
                startingDay +
                i +
                1;


            cellDate =
                new Date(
                    year,
                    month - 1,
                    dayNumber
                );


            otherMonth = true;

        } else if (
            i >=
            startingDay +
            daysInMonth
        ) {

            dayNumber =
                i -
                (
                    startingDay +
                    daysInMonth
                ) +
                1;


            cellDate =
                new Date(
                    year,
                    month + 1,
                    dayNumber
                );


            otherMonth = true;

        } else {

            dayNumber =
                i -
                startingDay +
                1;


            cellDate =
                new Date(
                    year,
                    month,
                    dayNumber
                );

        }


        const cell =
            document.createElement(
                "div"
            );


        cell.className =
            "calendar-day";


        if (otherMonth) {

            cell.classList.add(
                "other-month"
            );

        }


        if (isToday(cellDate)) {

            cell.classList.add(
                "today"
            );

        }


        const number =
            document.createElement(
                "div"
            );


        number.className =
            "day-number";


        number.textContent =
            dayNumber;


        cell.appendChild(number);


        /*
            Add events for this date.
        */

        events.forEach(
            function(event) {

                if (
                    event.date ===
                    formatDateKey(cellDate)
                ) {

                    const eventElement =
                        document.createElement(
                            "div"
                        );


                    eventElement.className =
                        "calendar-event " +
                        event.type;


                    eventElement.textContent =
                        event.title;


                    eventElement.onclick =
                        function() {

                            showEvent(event);

                        };


                    cell.appendChild(
                        eventElement
                    );

                }

            }
        );


        container.appendChild(cell);

    }


    updateMonthTitle();

}


/* =========================================
   DATE HELPERS
========================================= */

function formatDateKey(date) {

    const year =
        date.getFullYear();


    const month =
        String(
            date.getMonth() + 1
        ).padStart(2, "0");


    const day =
        String(
            date.getDate()
        ).padStart(2, "0");


    return (
        year +
        "-" +
        month +
        "-" +
        day
    );

}


function isToday(date) {

    const today =
        new Date();


    return (
        date.getFullYear() ===
        today.getFullYear() &&

        date.getMonth() ===
        today.getMonth() &&

        date.getDate() ===
        today.getDate()
    );

}


/* =========================================
   MONTH TITLE
========================================= */

function updateMonthTitle() {

    const title =
        document.getElementById(
            "monthTitle"
        );


    title.textContent =
        currentDate.toLocaleDateString(
            "en-US",
            {
                month: "long",
                year: "numeric"
            }
        );

}


/* =========================================
   MONTH NAVIGATION
========================================= */

function previousMonth() {

    currentDate.setMonth(
        currentDate.getMonth() - 1
    );


    renderCalendar();

}


function nextMonth() {

    currentDate.setMonth(
        currentDate.getMonth() + 1
    );


    renderCalendar();

}


function goToday() {

    currentDate =
        new Date();


    renderCalendar();

}


/* =========================================
   CALENDAR VIEW
========================================= */

function changeView(view) {

    currentView = view;


    const buttons =
        document.querySelectorAll(
            ".view-button"
        );


    buttons.forEach(
        function(button) {

            button.classList.remove(
                "active"
            );

        }
    );


    event.currentTarget.classList.add(
        "active"
    );


    if (view !== "month") {

        alert(
            view.charAt(0).toUpperCase() +
            view.slice(1) +
            " view will be connected to Google Calendar."
        );

    }

}


/* =========================================
   EVENT
========================================= */

function showEvent(eventData) {

    alert(
        eventData.title +
        "\n\nDate: " +
        eventData.date
    );

}


/* =========================================
   ADD EVENT
========================================= */

function addEvent() {

    const title =
        prompt(
            "Enter event name:"
        );


    if (!title) {
        return;
    }


    const date =
        prompt(
            "Enter date (YYYY-MM-DD):"
        );


    if (!date) {
        return;
    }


    events.push({

        date: date,

        title: title,

        type: "lime"

    });


    renderCalendar();

}


/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    function() {

        renderCalendar();

        updateConnectionStatus();

    }
);
