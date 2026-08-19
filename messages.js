/* =========================================
   TWETE MESSAGES
========================================= */


/* =========================================
   SUPABASE
========================================= */

const SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSN";

const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_KEY
    );


/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentRole = null;

let selectedAthlete = null;

let realtimeChannel = null;


/* =========================================
   START
========================================= */

document.addEventListener(
    "DOMContentLoaded",
    initialiseMessages
);


/* =========================================
   INITIALISE
========================================= */

async function initialiseMessages() {

    try {

        const {
            data: {
                session
            },
            error
        } =
            await supabaseClient.auth.getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            return;

        }


        if (
            !session ||
            !session.user
        ) {

            console.error(
                "No active session."
            );

            return;

        }


        currentUser =
            session.user;


        await loadCurrentProfile();


        if (
            currentRole ===
            "coach"
        ) {

            await loadAthletes();

        } else {

            await loadCoach();

        }

    } catch (error) {

        console.error(
            "Messages initialisation error:",
            error
        );

    }

}


/* =========================================
   LOAD CURRENT PROFILE
========================================= */

async function loadCurrentProfile() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(
                "id, full_name, role, avatar_url"
            )
            .eq(
                "id",
                currentUser.id
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Profile error:",
            error
        );

        return;

    }


    if (!data) {
        return;
    }


    currentRole =
        data.role;

}


/* =========================================
   LOAD ATHLETES
========================================= */

async function loadAthletes() {

    const section =
        document.getElementById(
            "athleteListSection"
        );

    const list =
        document.getElementById(
            "athleteList"
        );


    if (!section || !list) {
        return;
    }


    section.classList.remove(
        "hidden"
    );


    const {
        data,
        error
    } =
        await supabaseClient
            .from("coach_athletes")
            .select(`
                athlete_id,
                created_at,
                profiles:athlete_id (
                    id,
                    full_name,
                    role,
                    avatar_url
                )
            `)
            .eq(
                "coach_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            );


    if (error) {

        console.error(
            "Athlete loading error:",
            error
        );

        list.innerHTML = `
            <div class="messages-loading">
                Could not load athletes.
            </div>
        `;

        return;

    }


    list.innerHTML =
        "";


    if (
        !data ||
        !data.length
    ) {

        list.innerHTML = `
            <div class="messages-loading">
                No athletes yet.
            </div>
        `;

        return;

    }


    data.forEach(
        function (
            relationship
        ) {

            const athlete =
                relationship.profiles;


            if (!athlete) {
                return;
            }


            const item =
                document.createElement(
                    "button"
                );


            item.className =
                "athlete-list-item";


            item.type =
                "button";


            item.addEventListener(
                "click",
                function () {

                    openConversation(
                        athlete
                    );

                }
            );


            const avatar =
                document.createElement(
                    "div"
                );


            avatar.className =
                "profile-avatar";


            if (
                athlete.avatar_url
            ) {

                const image =
                    document.createElement(
                        "img"
                    );


                image.src =
                    athlete.avatar_url;

                image.alt =
                    "";

                image.referrerPolicy =
                    "no-referrer";


                avatar.innerHTML =
                    "";

                avatar.appendChild(
                    image
                );

            } else {

                avatar.textContent =
                    (
                        athlete.full_name ||
                        "A"
                    )
                    .charAt(0)
                    .toUpperCase();

            }


            const info =
                document.createElement(
                    "div"
                );


            info.className =
                "athlete-list-info";


            const name =
                document.createElement(
                    "div"
                );


            name.className =
                "athlete-name";


            name.textContent =
                athlete.full_name ||
                "Athlete";


            const role =
                document.createElement(
                    "div"
                );


            role.className =
                "athlete-role";


            role.textContent =
                "Athlete";


            info.appendChild(
                name
            );

            info.appendChild(
                role
            );


            item.appendChild(
                avatar
            );

            item.appendChild(
                info
            );


            list.appendChild(
                item
            );

        }
    );

}


/* =========================================
   LOAD COACH
========================================= */

async function loadCoach() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("coach_athletes")
            .select(`
                coach_id,
                created_at,
                profiles:coach_id (
                    id,
                    full_name,
                    role,
                    avatar_url
                )
            `)
            .eq(
                "athlete_id",
                currentUser.id
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1)
            .maybeSingle();


    if (error) {

        console.error(
            "Coach loading error:",
            error
        );

        return;

    }


    if (
        !data ||
        !data.profiles
    ) {

        return;

    }


    openConversation(
        data.profiles
    );

}


/* =========================================
   OPEN CONVERSATION
========================================= */

async function openConversation(
    profile
) {

    selectedAthlete =
        profile;


    const listSection =
        document.getElementById(
            "athleteListSection"
        );

    const conversationSection =
        document.getElementById(
            "conversationSection"
        );


    if (listSection) {

        listSection.classList.add(
            "hidden"
        );

    }


    if (conversationSection) {

        conversationSection.classList.remove(
            "hidden"
        );

    }


    updateProfileHeader(
        profile
    );


    await loadMessages();


    subscribeToMessages();

}


/* =========================================
   PROFILE HEADER
========================================= */

function updateProfileHeader(
    profile
) {

    const name =
        document.getElementById(
            "profileName"
        );

    const role =
        document.getElementById(
            "profileRole"
        );

    const avatar =
        document.getElementById(
            "profileAvatar"
        );


    if (name) {

        name.textContent =
            profile.full_name ||
            (
                profile.role === "athlete"
                    ? "Athlete"
                    : "Coach"
            );

    }


    if (role) {

        role.textContent =
            profile.role === "athlete"
                ? "Athlete"
                : "Coach";

    }


    if (!avatar) {
        return;
    }


    avatar.innerHTML =
        "";


    if (profile.avatar_url) {

        const image =
            document.createElement(
                "img"
            );


        image.src =
            profile.avatar_url;

        image.alt =
            "";

        image.referrerPolicy =
            "no-referrer";


        avatar.appendChild(
            image
        );

    } else {

        avatar.textContent =
            (
                profile.full_name ||
                "T"
            )
            .charAt(0)
            .toUpperCase();

    }

}


/* =========================================
   LOAD MESSAGES
========================================= */

async function loadMessages() {

    const list =
        document.getElementById(
            "messagesList"
        );


    if (!list) {
        return;
    }


    if (
        !currentUser ||
        !selectedAthlete
    ) {

        return;

    }


    const otherUserId =
        selectedAthlete.id;


    const {
        data,
        error
    } =
        await supabaseClient
            .from("messages")
            .select(`
                id,
                sender_id,
                receiver_id,
                message,
                created_at,
                read_at
            `)
            .or(
                `and(sender_id.eq.${currentUser.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUser.id})`
            )
            .order(
                "created_at",
                {
                    ascending: true
                }
            );


    if (error) {

        console.error(
            "Message loading error:",
            error
        );

        list.innerHTML = `
            <div class="messages-loading">
                Could not load messages.
            </div>
        `;

        return;

    }


    list.innerHTML =
        "";


    if (
        !data ||
        !data.length
    ) {

        list.innerHTML = `
            <div class="messages-loading">
                No messages yet.
            </div>
        `;

        return;

    }


    data.forEach(
        function (
            message
        ) {

            const element =
                createMessageElement(
                    message
                );


            list.appendChild(
                element
            );

        }
    );


    scrollToBottom();


    await markMessagesRead(
        data
    );

}


/* =========================================
   CREATE MESSAGE
========================================= */

function createMessageElement(
    message
) {

    const sent =
        String(
            message.sender_id
        ) ===
        String(
            currentUser.id
        );


    const row =
        document.createElement(
            "div"
        );


    row.className =
        sent
            ? "message-row sent"
            : "message-row received";


    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    if (
        message.message &&
        message.message.trim()
    ) {

        const text =
            document.createElement(
                "div"
            );


        text.className =
            "message-text";


        text.textContent =
            message.message;


        bubble.appendChild(
            text
        );

    }


    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        "message-meta";


    const time =
        document.createElement(
            "span"
        );


    time.textContent =
        formatTime(
            message.created_at
        );


    meta.appendChild(
        time
    );


    if (sent) {

        const checks =
            document.createElement(
                "span"
            );


        checks.className =
            "message-checks";


        checks.textContent =
            "✓✓";


        meta.appendChild(
            checks
        );

    }


    bubble.appendChild(
        meta
    );


    row.appendChild(
        bubble
    );


    return row;

}


/* =========================================
   SEND MESSAGE
========================================= */

async function sendMessage() {

    const input =
        document.getElementById(
            "messageInput"
        );

    const button =
        document.getElementById(
            "sendButton"
        );


    if (!input) {
        return;
    }


    const text =
        input.value.trim();


    if (!text) {
        return;
    }


    if (
        !currentUser ||
        !selectedAthlete
    ) {

        return;

    }


    if (button) {

        button.disabled =
            true;

    }


    try {

        const {
            data,
            error
        } =
            await supabaseClient
                .from("messages")
                .insert({

                    sender_id:
                        currentUser.id,

                    receiver_id:
                        selectedAthlete.id,

                    message:
                        text

                })
                .select(`
                    id,
                    sender_id,
                    receiver_id,
                    message,
                    created_at,
                    read_at
                `)
                .single();


        if (error) {

            console.error(
                "Send message error:",
                error
            );

            return;

        }


        input.value =
            "";

        input.style.height =
            "auto";


        /*
            Add immediately to screen.
        */

        const list =
            document.getElementById(
                "messagesList"
            );


        if (list) {

            const empty =
                list.querySelector(
                    ".messages-loading"
                );


            if (empty) {
                empty.remove();
            }


            list.appendChild(
                createMessageElement(
                    data
                )
            );


            scrollToBottom();

        }

    } catch (error) {

        console.error(
            "Send message exception:",
            error
        );

    } finally {

        if (button) {

            button.disabled =
                false;

        }

    }

}


/* =========================================
   REALTIME
========================================= */

function subscribeToMessages() {

    if (
        !currentUser ||
        !selectedAthlete
    ) {

        return;

    }


    if (realtimeChannel) {

        supabaseClient.removeChannel(
            realtimeChannel
        );

    }


    realtimeChannel =
        supabaseClient
            .channel(
                "twete-messages-" +
                currentUser.id +
                "-" +
                selectedAthlete.id
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                function (
                    payload
                ) {

                    const message =
                        payload.new;


                    const belongs =
                        (
                            String(
                                message.sender_id
                            ) ===
                            String(
                                selectedAthlete.id
                            ) &&
                            String(
                                message.receiver_id
                            ) ===
                            String(
                                currentUser.id
                            )
                        );


                    if (!belongs) {
                        return;
                    }


                    const list =
                        document.getElementById(
                            "messagesList"
                        );


                    if (!list) {
                        return;
                    }


                    /*
                        Prevent duplicate
                        realtime rendering.
                    */

                    const existing =
                        Array.from(
                            list.children
                        ).some(
                            function (
                                element
                            ) {

                                return (
                                    element.dataset &&
                                    element.dataset.messageId ===
                                    String(
                                        message.id
                                    )
                                );

                            }
                        );


                    if (existing) {
                        return;
                    }


                    const row =
                        createMessageElement(
                            message
                        );


                    row.dataset.messageId =
                        message.id;


                    list.appendChild(
                        row
                    );


                    scrollToBottom();


                    if (
                        String(
                            message.receiver_id
                        ) ===
                        String(
                            currentUser.id
                        )
                    ) {

                        markMessagesRead(
                            [message]
                        );

                    }

                }
            )
            .subscribe();

}


/* =========================================
   MARK READ
========================================= */

async function markMessagesRead(
    messages
) {

    if (!currentUser) {
        return;
    }


    const unreadIds =
        messages
            .filter(
                function (
                    message
                ) {

                    return (
                        String(
                            message.receiver_id
                        ) ===
                        String(
                            currentUser.id
                        ) &&
                        !message.read_at
                    );

                }
            )
            .map(
                function (
                    message
                ) {

                    return message.id;

                }
            );


    if (!unreadIds.length) {
        return;
    }


    const {
        error
    } =
        await supabaseClient
            .from("messages")
            .update({

                read_at:
                    new Date().toISOString()

            })
            .in(
                "id",
                unreadIds
            );


    if (error) {

        console.error(
            "Mark read error:",
            error
        );

    }

}


/* =========================================
   SCROLL
========================================= */

function scrollToBottom() {

    const list =
        document.getElementById(
            "messagesList"
        );


    if (!list) {
        return;
    }


    requestAnimationFrame(
        function () {

            list.scrollTop =
                list.scrollHeight;

        }
    );

}


/* =========================================
   TEXTAREA
========================================= */

const messageInput =
    document.getElementById(
        "messageInput"
    );


if (messageInput) {

    messageInput.addEventListener(
        "input",
        function () {

            this.style.height =
                "auto";


            this.style.height =
                Math.min(
                    this.scrollHeight,
                    130
                ) +
                "px";

        }
    );


    messageInput.addEventListener(
        "keydown",
        function (
            event
        ) {

            if (
                event.key ===
                "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );

}


/* =========================================
   NAVIGATION
========================================= */

function showAthleteList() {

    const conversationSection =
        document.getElementById(
            "conversationSection"
        );

    const athleteListSection =
        document.getElementById(
            "athleteListSection"
        );


    if (conversationSection) {

        conversationSection.classList.add(
            "hidden"
        );

    }


    if (
        athleteListSection &&
        currentRole === "coach"
    ) {

        athleteListSection.classList.remove(
            "hidden"
        );

    }

}


function goBack() {

    window.location.href =
        "athlete.html";

}


function goHome() {

    window.location.href =
        "athlete.html";

           }
