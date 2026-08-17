const SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";

const profileSupabase =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


const form =
    document.getElementById(
        "profileForm"
    );

const status =
    document.getElementById(
        "status"
    );

const saveButton =
    document.getElementById(
        "saveButton"
    );

const avatar =
    document.getElementById(
        "avatar"
    );

const avatarInput =
    document.getElementById(
        "avatarInput"
    );


/* =========================================
   LOAD PROFILE
========================================= */

async function loadProfile() {

    const {
        data: {
            user
        },
        error: userError
    } =
        await profileSupabase.auth.getUser();


    if (
        userError ||
        !user
    ) {

        window.location.href =
            "index.html";

        return;
    }


    const {
        data,
        error
    } =
        await profileSupabase
            .from("profiles")
            .select(`
                full_name,
                birthday,
                country,
                discipline,
                preferred_distance,
                experience_level,
                avatar_url
            `)
            .eq(
                "id",
                user.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Profile loading error:",
            error
        );

        status.textContent =
            "Unable to load profile.";

        status.style.color =
            "#ff6b6b";

        return;
    }


    document.getElementById(
        "profileEmail"
    ).textContent =
        user.email || "";


    document.getElementById(
        "fullName"
    ).value =
        data?.full_name || "";


    document.getElementById(
        "birthday"
    ).value =
        data?.birthday || "";


    document.getElementById(
        "country"
    ).value =
        data?.country || "";


    document.getElementById(
        "discipline"
    ).value =
        data?.discipline || "";


    document.getElementById(
        "preferredDistance"
    ).value =
        data?.preferred_distance || "";


    document.getElementById(
        "experienceLevel"
    ).value =
        data?.experience_level || "beginner";


    updateName(
        data?.full_name
    );


    if (
        data?.avatar_url
    ) {

        showAvatar(
            data.avatar_url
        );
    }

}


/* =========================================
   SHOW AVATAR
========================================= */

function showAvatar(url) {

    avatar.innerHTML = "";

    const image =
        document.createElement(
            "img"
        );

    image.src = url;

    image.alt =
        "Profile picture";

    avatar.appendChild(
        image
    );
}


/* =========================================
   NAME / INITIAL
========================================= */

function updateName(name) {

    const title =
        document.getElementById(
            "profileName"
        );

    title.textContent =
        name || "Athlete";


    if (
        !avatar.querySelector("img")
    ) {

        const initial =
            name
                ? name
                    .trim()
                    .charAt(0)
                    .toUpperCase()
                : "T";

        avatar.textContent =
            initial;
    }
}


/* =========================================
   AVATAR UPLOAD
========================================= */

avatarInput.addEventListener(
    "change",
    async function () {

        const file =
            avatarInput.files[0];


        if (!file) {
            return;
        }


        if (
            !file.type.startsWith(
                "image/"
            )
        ) {

            status.textContent =
                "Please select an image.";

            status.style.color =
                "#ff6b6b";

            return;
        }


        if (
            file.size >
            5 * 1024 * 1024
        ) {

            status.textContent =
                "Image must be smaller than 5 MB.";

            status.style.color =
                "#ff6b6b";

            return;
        }


        try {

            status.textContent =
                "Uploading picture...";

            status.style.color =
                "#C6FF00";


            const {
                data: {
                    user
                }
            } =
                await profileSupabase.auth
                    .getUser();


            if (!user) {
                return;
            }


            const extension =
                file.name
                    .split(".")
                    .pop()
                    .toLowerCase();


            const filePath =
                `${user.id}/avatar.${extension}`;


            const {
                error: uploadError
            } =
                await profileSupabase.storage
                    .from("avatars")
                    .upload(
                        filePath,
                        file,
                        {
                            upsert: true,
                            contentType:
                                file.type
                        }
                    );


            if (uploadError) {

                console.error(
                    uploadError
                );

                throw uploadError;
            }


            const {
                data
            } =
                profileSupabase.storage
                    .from("avatars")
                    .getPublicUrl(
                        filePath
                    );


            const avatarUrl =
                data.publicUrl;


            const {
                error: profileError
            } =
                await profileSupabase
                    .from("profiles")
                    .update({
                        avatar_url:
                            avatarUrl
                    })
                    .eq(
                        "id",
                        user.id
                    );


            if (profileError) {
                throw profileError;
            }


            showAvatar(
                avatarUrl +
                "?t=" +
                Date.now()
            );


            status.textContent =
                "Profile picture updated.";

            status.style.color =
                "#C6FF00";


        } catch (error) {

            console.error(
                "Avatar error:",
                error
            );

            status.textContent =
                "Unable to upload profile picture.";

            status.style.color =
                "#ff6b6b";
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


        try {

            const {
                data: {
                    user
                }
            } =
                await profileSupabase.auth
                    .getUser();


            if (!user) {

                window.location.href =
                    "index.html";

                return;
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
                        .value
                        .trim(),

                discipline:
                    document
                        .getElementById(
                            "discipline"
                        )
                        .value,

                preferred_distance:
                    document
                        .getElementById(
                            "preferredDistance"
                        )
                        .value
                        .trim(),

                experience_level:
                    document
                        .getElementById(
                            "experienceLevel"
                        )
                        .value
            };


            const {
                error
            } =
                await profileSupabase
                    .from("profiles")
                    .update(profile)
                    .eq(
                        "id",
                        user.id
                    );


            if (error) {
                throw error;
            }


            updateName(
                profile.full_name
            );


            status.textContent =
                "Profile saved successfully.";

            status.style.color =
                "#C6FF00";


        } catch (error) {

            console.error(
                "Profile save error:",
                error
            );

            status.textContent =
                "Unable to save profile.";

            status.style.color =
                "#ff6b6b";


        } finally {

            saveButton.disabled =
                false;

            saveButton.textContent =
                "Save changes";
        }

    }
);


/* =========================================
   BACK
========================================= */

function goBack() {

    window.location.href =
        "athlete.html";
}


loadProfile();
