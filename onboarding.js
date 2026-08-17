const SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


const form =
    document.getElementById(
        "onboardingForm"
    );

const distanceSelect =
    document.getElementById(
        "preferredDistance"
    );

const otherDistanceField =
    document.getElementById(
        "otherDistanceField"
    );

const otherDistance =
    document.getElementById(
        "otherDistance"
    );

const message =
    document.getElementById(
        "onboardingMessage"
    );

const saveButton =
    document.getElementById(
        "saveProfileButton"
    );


/* =========================================
   OTHER DISTANCE
========================================= */

distanceSelect.addEventListener(
    "change",
    function () {

        if (
            distanceSelect.value ===
            "Other"
        ) {

            otherDistanceField.classList
                .remove("hidden");

            otherDistance.required =
                true;

        } else {

            otherDistanceField.classList
                .add("hidden");

            otherDistance.required =
                false;

            otherDistance.value = "";
        }
    }
);


/* =========================================
   SAVE PROFILE
========================================= */

form.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();


        saveButton.disabled =
            true;

        saveButton.textContent =
            "Saving...";


        message.textContent =
            "";


        try {

            const {
                data: {
                    user
                },
                error: sessionError
            } =
                await supabaseClient.auth
                    .getUser();


            if (
                sessionError ||
                !user
            ) {

                window.location.href =
                    "index.html";

                return;
            }


            const discipline =
                document.querySelector(
                    'input[name="discipline"]:checked'
                )?.value;


            const experience =
                document.querySelector(
                    'input[name="experience"]:checked'
                )?.value;


            let distance =
                distanceSelect.value;


            if (
                distance ===
                "Other"
            ) {

                distance =
                    otherDistance.value.trim();
            }


            const profile = {

                full_name:
                    document
                        .getElementById(
                            "fullName"
                        )
                        .value
                        .trim(),

                birthday:
                    document
                        .getElementById(
                            "birthday"
                        )
                        .value,

                country:
                    document
                        .getElementById(
                            "country"
                        )
                        .value,

                discipline:
                    discipline,

                preferred_distance:
                    distance,

                experience_level:
                    experience
            };


            const {
                error
            } =
                await supabaseClient
                    .from("profiles")
                    .update(profile)
                    .eq(
                        "id",
                        user.id
                    );


            if (error) {

                console.error(
                    "Profile save error:",
                    error
                );

                message.textContent =
                    "Unable to save your profile. Please try again.";

                message.style.color =
                    "#ff6b6b";

                return;
            }


            message.textContent =
                "Profile saved!";

            message.style.color =
                "#C6FF00";


            setTimeout(
                function () {

                    window.location.href =
                        "athlete.html";

                },
                700
            );


        } catch (error) {

            console.error(
                "Onboarding error:",
                error
            );

            message.textContent =
                "Something went wrong. Please try again.";

            message.style.color =
                "#ff6b6b";


        } finally {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Continue to Twete";
        }
    }
);
