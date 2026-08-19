/* =========================================
   TWETE COACH
   ATHLETE MANAGEMENT
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
   ATHLETE ID
========================================= */

const params =
    new URLSearchParams(
        window.location.search
    );


const athleteId =
    params.get(
        "athlete_id"
    );


let athlete = null;

let goals = [];
/* =========================================
   GOAL IMAGE LIBRARY
========================================= */

let goalImages = [];

let selectedGoalImageId = null;

/* =========================================
   INITIALIZE
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    async function() {

        if (!athleteId) {

            showError(
                "No athlete was selected."
            );

            return;
        }


        await loadAthlete();

        await loadGoals();

    }
);


/* =========================================
   LOAD ATHLETE
========================================= */

async function loadAthlete() {

    const container =
        document.getElementById(
            "athleteProfile"
        );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                email,
                full_name,
                avatar_url,
                country,
                discipline,
                preferred_distance,
                experience_level
            `)
            .eq(
                "id",
                athleteId
            )
            .eq(
                "role",
                "athlete"
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Athlete error:",
            error
        );

        container.innerHTML = `
            <div class="empty error">

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;

        return;
    }


    if (!data) {

        container.innerHTML = `
            <div class="empty error">

                Athlete could not be found.

            </div>
        `;

        return;
    }


    athlete = data;


    renderAthlete();

}


/* =========================================
   RENDER ATHLETE
========================================= */

function renderAthlete() {

    const container =
        document.getElementById(
            "athleteProfile"
        );


    const name =
        athlete.full_name ||
        "Unnamed athlete";


    const details = [

        athlete.country,

        athlete.discipline,

        athlete.preferred_distance,

        athlete.experience_level

    ]
        .filter(Boolean)
        .join(" • ");


    let avatar;


    if (athlete.avatar_url) {

        avatar = `

            <img
                class="profile-picture"
                src="${escapeHtml(
                    athlete.avatar_url
                )}"
                alt="${escapeHtml(
                    name
                )}"
            >

        `;

    } else {

        avatar = `

            <div
                class="
                    profile-picture
                    profile-placeholder
                "
            >

                ${escapeHtml(
                    getInitials(name)
                )}

            </div>

        `;

    }


    container.innerHTML = `

        ${avatar}


        <div
            class="profile-info"
        >

            <h1>
                ${escapeHtml(name)}
            </h1>


            <div
                class="profile-email"
            >

                ${escapeHtml(
                    athlete.email ||
                    ""
                )}

            </div>


            <div
                class="profile-details"
            >

                ${escapeHtml(
                    details ||
                    "Athlete"
                )}

            </div>

        </div>

    `;

}


/* =========================================
   LOAD GOALS
========================================= */

async function loadGoals() {

    const container =
        document.getElementById(
            "goalsList"
        );


    container.innerHTML = `
        <div class="loading">
            Loading goals...
        </div>
    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("goals")
            .select(`
    id,
    athlete_id,
    goal_name,
    distance,
    current_pb,
    target_time,
    target_date,
    progress,
    goal_image_id,
    created_at
`)
            .eq(
                "athlete_id",
                athleteId
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Goals error:",
            error
        );


        container.innerHTML = `
            <div class="empty error">

                Could not load goals.

                <br><br>

                ${escapeHtml(
                    error.message
                )}

            </div>
        `;

        return;
    }


    goals =
        data || [];


    renderGoals();

}


/* =========================================
   RENDER GOALS
========================================= */

function renderGoals() {

    const container =
        document.getElementById(
            "goalsList"
        );


    if (!goals.length) {

        container.innerHTML = `

            <div class="empty">

                This athlete has no goals yet.

                <br><br>

                Click
                <strong>+ Add Goal</strong>
                to create the first one.

            </div>

        `;

        return;
    }


    container.innerHTML =
        goals
            .map(function(goal) {

                return `

                    <div
                        class="goal-card"
                        onclick="openGoal('${goal.id}')"
                    >

                        <div
                            class="goal-main"
                        >

                            <div
                                class="goal-distance"
                            >

                                ${escapeHtml(
                                    goal.goal_name ||
                                    "Goal"
                                )}

                            </div>


                            <div
                                class="goal-target"
                            >

                                ${escapeHtml(
                                    goal.distance
                                )}

                                &nbsp; • &nbsp;

                                <strong>
                                    ${escapeHtml(
                                        goal.target_time
                                    )}
                                </strong>

                            </div>


                            <div
                                class="goal-info"
                            >

                                Target date:

                                ${goal.target_date
                                    ? formatDate(
                                        goal.target_date
                                    )
                                    : "Not set"
                                }

                            </div>

                        </div>


                        <div
                            class="goal-actions"
                        >

                            <button
                                class="delete-button"
                                onclick="
                                    deleteGoal(
                                        '${goal.id}'
                                    )
                                "
                            >

                                Delete

                            </button>

                        </div>

                    </div>

                `;

            })
            .join("");
}


/* =========================================
   OPEN GOAL
========================================= */

function openGoal(goalId) {

    if (!goalId) {
        return;
    }

    window.location.href =
        "coach-goal.html?goal_id=" +
        encodeURIComponent(goalId);
}


/* =========================================
   OPEN GOAL MODAL
========================================= */

async function openGoalModal() {

    selectedGoalImageId = null;


    document
        .getElementById(
            "goalModal"
        )
        .classList.add(
            "show"
        );


    await loadGoalImages();

}


/* =========================================
   CLOSE GOAL MODAL
========================================= */

function closeGoalModal() {

    document
        .getElementById(
            "goalModal"
        )
        .classList.remove(
            "show"
        );

}

/* =========================================
   LOAD GOAL IMAGE LIBRARY
========================================= */

async function loadGoalImages() {

    const container =
        document.getElementById(
            "goalImageGrid"
        );


    if (!container) {
        return;
    }


    container.innerHTML = `

        <div class="goal-images-empty">
            Loading goal images...
        </div>

    `;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("goal_images")
            .select(`
                id,
                name,
                category,
                storage_path,
                alt_text,
                sort_order,
                active
            `)
            .eq(
                "active",
                true
            )
            .order(
                "sort_order",
                {
                    ascending: true
                }
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Goal images error:",
            error
        );


        container.innerHTML = `

            <div class="goal-images-empty error">

                Could not load
                the image library.

            </div>

        `;


        return;

    }


    goalImages =
        data || [];


    renderGoalImages();

}



/* =========================================
   RENDER GOAL IMAGES
========================================= */

function renderGoalImages() {

    const container =
        document.getElementById(
            "goalImageGrid"
        );


    if (!container) {
        return;
    }


    if (!goalImages.length) {

        container.innerHTML = `

            <div class="goal-images-empty">

                No images in the library yet.

                <br><br>

                Upload your first
                Twete Goal image below.

            </div>

        `;


        return;

    }


    container.innerHTML =
        goalImages
            .map(
                function(image) {

                    const {
                        data
                    } =
                        supabaseClient
                            .storage
                            .from(
                                "goal-images"
                            )
                            .getPublicUrl(
                                image.storage_path
                            );


                    const imageUrl =
                        data.publicUrl;


                    const selected =
                        image.id ===
                        selectedGoalImageId;


                    return `

                        <button
                            type="button"

                            class="
                                goal-image-option
                                ${
                                    selected
                                        ? "selected"
                                        : ""
                                }
                            "

                            onclick="
                                selectGoalImage(
                                    '${image.id}'
                                )
                            "
                        >

                            <img
                                src="${escapeHtml(
                                    imageUrl
                                )}"

                                alt="${escapeHtml(
                                    image.alt_text ||
                                    image.name
                                )}"
                            >


                            <span
                                class="
                                    goal-image-selected-icon
                                "
                            >
                                ✓
                            </span>


                            <span
                                class="
                                    goal-image-name
                                "
                            >
                                ${escapeHtml(
                                    image.name
                                )}
                            </span>

                        </button>

                    `;

                }
            )
            .join("");

}



/* =========================================
   SELECT GOAL IMAGE
========================================= */

function selectGoalImage(
    imageId
) {

    if (
        selectedGoalImageId ===
        imageId
    ) {

        /*
           Tapping the selected image again
           removes the selection.
        */

        selectedGoalImageId =
            null;

    } else {

        selectedGoalImageId =
            imageId;

    }


    renderGoalImages();

}



/* =========================================
   UPLOAD GOAL IMAGE
========================================= */

async function uploadGoalImage() {

    const nameInput =
        document.getElementById(
            "goalImageName"
        );


    const categoryInput =
        document.getElementById(
            "goalImageCategory"
        );


    const fileInput =
        document.getElementById(
            "goalImageFile"
        );


    const uploadButton =
        document.getElementById(
            "goalImageUploadButton"
        );


    const name =
        nameInput
            .value
            .trim();


    const category =
        categoryInput
            .value;


    const file =
        fileInput
            .files[0];


    /* =====================================
       VALIDATE
    ====================================== */

    if (!name) {

        alert(
            "Please enter an image name."
        );

        return;

    }


    if (!file) {

        alert(
            "Please select an image."
        );

        return;

    }


    const allowedTypes = [

        "image/jpeg",

        "image/png",

        "image/webp"

    ];


    if (
        !allowedTypes.includes(
            file.type
        )
    ) {

        alert(
            "Please upload a JPG, PNG or WebP image."
        );

        return;

    }


    if (
        file.size >
        10 * 1024 * 1024
    ) {

        alert(
            "The image must be smaller than 10 MB."
        );

        return;

    }


    uploadButton.disabled =
        true;


    uploadButton.textContent =
        "Uploading...";


    let storagePath =
        null;


    try {

        /* =================================
           FILE EXTENSION
        ================================== */

        const originalName =
            file.name || "";


        const extension =
            originalName
                .includes(".")
                ?
                originalName
                    .split(".")
                    .pop()
                    .toLowerCase()
                :
                file.type ===
                    "image/png"
                    ?
                    "png"
                    :
                    file.type ===
                        "image/webp"
                        ?
                        "webp"
                        :
                        "jpg";


        /* =================================
           UNIQUE STORAGE PATH
        ================================== */

        const uniqueId =
            (
                window.crypto &&
                window.crypto.randomUUID
            )
                ?
                window.crypto.randomUUID()
                :
                Date.now() +
                "-" +
                Math.random()
                    .toString(36)
                    .slice(2);


        storagePath =
            "library/" +
            uniqueId +
            "." +
            extension;


        /* =================================
           UPLOAD TO STORAGE
        ================================== */

        const {
            error: uploadError
        } =
            await supabaseClient
                .storage
                .from(
                    "goal-images"
                )
                .upload(
                    storagePath,
                    file,
                    {

                        cacheControl:
                            "31536000",

                        upsert:
                            false,

                        contentType:
                            file.type

                    }
                );


        if (uploadError) {

            throw uploadError;

        }


        /* =================================
           SAVE IMAGE METADATA
        ================================== */

        const {
            data: imageRecord,
            error: databaseError
        } =
            await supabaseClient
                .from(
                    "goal_images"
                )
                .insert({

                    name:
                        name,

                    category:
                        category,

                    storage_path:
                        storagePath,

                    alt_text:
                        name,

                    active:
                        true

                })
                .select()
                .single();


        if (databaseError) {

            /*
               Remove the Storage file again
               if database insert failed.
            */

            await supabaseClient
                .storage
                .from(
                    "goal-images"
                )
                .remove([
                    storagePath
                ]);


            throw databaseError;

        }


        /* =================================
           SELECT NEW IMAGE
        ================================== */

        selectedGoalImageId =
            imageRecord.id;


        /* =================================
           RESET UPLOAD FORM
        ================================== */

        nameInput.value =
            "";


        categoryInput.value =
            "general";


        fileInput.value =
            "";


        /* =================================
           RELOAD LIBRARY
        ================================== */

        await loadGoalImages();


    } catch (error) {

        console.error(
            "Goal image upload error:",
            error
        );


        alert(

            "Could not upload the image:\n\n" +

            (
                error.message ||
                "Unknown error"
            )

        );

    } finally {

        uploadButton.disabled =
            false;


        uploadButton.textContent =
            "+ Upload to Goal Library";

    }

       }
/* =========================================
   SAVE GOAL
========================================= */
async function saveGoal() {

    if (!athleteId) {

        alert("No athlete selected.");

        return;
    }


    const goalName =
        document
            .getElementById("goalName")
            .value
            .trim();


    const distance =
        document
            .getElementById("goalDistance")
            .value
            .trim();


    const targetTime =
        document
            .getElementById("goalTargetTime")
            .value
            .trim();


    const targetDate =
        document
            .getElementById("goalTargetDate")
            .value;


    /* =========================
       VALIDATION
    ========================= */

    if (!goalName) {

        alert(
            "Please enter a goal name."
        );

        return;
    }


    if (!distance) {

        alert(
            "Please enter a distance."
        );

        return;
    }


    if (!targetTime) {

        alert(
            "Please enter a goal time."
        );

        return;
    }


    if (!targetDate) {

        alert(
            "Please select a date."
        );

        return;
    }


    /* =========================
       SAVE TO SUPABASE
    ========================= */

    const {
        data,
        error
    } =
        await supabaseClient
            .from("goals")
            .insert({

    athlete_id:
        athleteId,

    goal_name:
        goalName,

    distance:
        distance,

    target_time:
        targetTime,

    target_date:
        targetDate,

    progress:
        0,

    goal_image_id:
        selectedGoalImageId ||
        null

})
            .select()
            .single();


    if (error) {

        console.error(
            "SAVE GOAL ERROR:",
            error
        );


        alert(
            "Could not save the goal:\n\n" +
            error.message
        );

        return;
    }


    console.log(
        "Goal saved:",
        data
    );


    /* =========================
       CLOSE MODAL
    ========================= */

    closeGoalModal();


    /* =========================
       CLEAR FORM
    ========================= */

    document
        .getElementById("goalName")
        .value = "";


    document
        .getElementById("goalDistance")
        .value = "";


    document
        .getElementById("goalTargetTime")
        .value = "";


    document
        .getElementById("goalTargetDate")
        .value = "";


    /* =========================
       RELOAD GOALS
    ========================= */

    await loadGoals();

}


/* =========================================
   DELETE GOAL
========================================= */

async function deleteGoal(
    goalId
) {

    const confirmed =
        confirm(
            "Delete this goal?"
        );


    if (!confirmed) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("goals")
            .delete()
            .eq(
                "id",
                goalId
            );


    if (error) {

        console.error(
            "Delete goal error:",
            error
        );


        alert(
            "Could not delete goal:\n\n" +
            error.message
        );

        return;
    }


    await loadGoals();

}


/* =========================================
   BACK
========================================= */

function goBack() {

    window.location.href =
        "coach.html";

}


/* =========================================
   DATE
========================================= */

function formatDate(
    value
) {

    if (!value) {
        return "";
    }


    return new Date(
        value
    ).toLocaleDateString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            year: "numeric"
        }
    );

}


/* =========================================
   INITIALS
========================================= */

function getInitials(
    name
) {

    if (!name) {
        return "A";
    }


    return name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(
            function(part) {

                return part
                    .charAt(0)
                    .toUpperCase();

            }
        )
        .join("");

}


/* =========================================
   HTML ESCAPE
========================================= */

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replaceAll(
            "&",
            "&amp;"
        )
        .replaceAll(
            "<",
            "&lt;"
        )
        .replaceAll(
            ">",
            "&gt;"
        )
        .replaceAll(
            '"',
            "&quot;"
        )
        .replaceAll(
            "'",
            "&#039;"
        );

}


/* =========================================
   ERROR
========================================= */

function showError(
    message
) {

    document.body.innerHTML = `

        <div
            style="
                color:white;
                background:#050505;
                min-height:100vh;
                display:flex;
                align-items:center;
                justify-content:center;
                text-align:center;
                padding:30px;
                font-family:Arial;
            "
        >

            <div>

                <h2>
                    ${escapeHtml(
                        message
                    )}
                </h2>


                <button
                    onclick="goBack()"
                    style="
                        margin-top:20px;
                        padding:10px 18px;
                        border:0;
                        border-radius:8px;
                        background:#C6FF00;
                        cursor:pointer;
                    "
                >

                    ← Back to Athletes

                </button>

            </div>

        </div>

    `;

}
