/* =========================================
   TWETE MESSAGES
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


let currentUser = null;
let currentRole = null;

let conversationUserId = null;

let realtimeChannel = null;

let athletes = [];


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
            await supabaseClient
                .auth
                .getSession();


        if (error) {

            console.error(
                "Session error:",
                error
            );

            showError(
                "Could not check your login session."
            );

            return;
        }


        if (
            !session ||
            !session.user
        ) {

            showError(
                "Your login session could not be found."
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

            await initialiseCoach();

        } else {

            await initialiseAthlete();

        }


        setupComposer();

    } catch (error) {

        console.error(
            "Messages error:",
            error
        );

        showError(
            "Could not load Messages."
        );

    }

}


/* =========================================
   CURRENT PROFILE
========================================= */

async function loadCurrentProfile() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                full_name,
                role,
                avatar_url
            `)
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


    if (data) {

        currentRole =
            data.role;

    }

}


/* =========================================
   ATHLETE INITIALISE
========================================= */

async function initialiseAthlete() {

    const listSection =
        document.getElementById(
            "athleteListSection"
        );


    if (listSection) {

        listSection.classList.add(
            "hidden"
        );

    }


    await loadCoachForAthlete();


    if (conversationUserId) {

        showConversation();

        await loadMessages();

        subscribeToMessages();

    } else {

        showNoConversation();

        showConversation();

    }

}


/* =========================================
   FIND ATHLETE'S COACH
========================================= */

async function loadCoachForAthlete() {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("coach_athletes")
            .select(`
                coach_id,
                athlete_id,
                created_at
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
            "Coach connection error:",
            error
        );

        conversationUserId =
            null;

        return;
    }


    if (!data) {

        conversationUserId =
            null;

        return;
    }


    conversationUserId =
        data.coach_id;


    await loadProfileHeader(
        conversationUserId
    );

}


/* =========================================
   COACH INITIALISE
========================================= */

async function initialiseCoach() {

    const listSection =
        document.getElementById(
            "athleteListSection"
        );


    if (listSection) {

        listSection.classList.remove(
            "hidden"
        );

    }


    hideConversation();


    await loadAthletes();

}


/* =========================================
   LOAD ATHLETES
========================================= */

async function loadAthletes() {

    const list =
        document.getElementById(
            "athleteList"
        );


    if (!list) {
        return;
    }


    list.innerHTML = `

        <div class="messages-loading">
            Loading athletes...
        </div>

    `;


    const {
        data: connections,
        error
    } =
        await supabaseClient
            .from("coach_athletes")
            .select(`
                athlete_id,
                created_at
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

            <div class="no-messages">
                Could not load athletes.
            </div>

        `;

        return;
    }


    if (
        !connections ||
        !connections.length
    ) {

        athletes = [];

        list.innerHTML = `

            <div class="no-messages">

                No athletes are connected yet.

            </div>

        `;

        return;
    }


    const athleteIds =
        connections.map(
            function (item) {
                return item.athlete_id;
            }
        );


    const {
        data: profiles,
        error: profileError
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                full_name,
                role,
                avatar_url
            `)
            .in(
                "id",
                athleteIds
            );


    if (profileError) {

        console.error(
            "Athlete profile error:",
            profileError
        );

        list.innerHTML = `

            <div class="no-messages">
                Could not load athlete profiles.
            </div>

        `;

        return;
    }


    athletes =
        profiles || [];


    const enriched =
        await Promise.all(
            athletes.map(
                async function (
                    athlete
                ) {

                    const info =
                        await getLastMessageInfo(
                            athlete.id
                        );

                    return {
                        ...athlete,
                        ...info
                    };

                }
            )
        );


    enriched.sort(
        function (a, b) {

            const aTime =
                a.last_message_at
                    ?
                    new Date(
                        a.last_message_at
                    ).getTime()
                    :
                    0;

            const bTime =
                b.last_message_at
                    ?
                    new Date(
                        b.last_message_at
                    ).getTime()
                    :
                    0;

            return bTime - aTime;

        }
    );


    athletes =
        enriched;


    renderAthleteList();

}


/* =========================================
   LAST MESSAGE INFO
========================================= */

async function getLastMessageInfo(
    athleteId
) {

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
                `and(sender_id.eq.${currentUser.id},receiver_id.eq.${athleteId}),and(sender_id.eq.${athleteId},receiver_id.eq.${currentUser.id})`
            )
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1)
            .maybeSingle();


    if (
        error ||
        !data
    ) {

        return {

            last_message: "",
            last_message_at: null,
            unread: false

        };

    }


    let unread =
        false;


    if (
        String(
            data.receiver_id
        ) ===
        String(
            currentUser.id
        ) &&
        !data.read_at
    ) {

        unread =
            true;

    }


    return {

        last_message:
            data.message || "",

        last_message_at:
            data.created_at,

        unread:
            unread

    };

}


/* =========================================
   RENDER ATHLETE LIST
========================================= */

function renderAthleteList() {

    const list =
        document.getElementById(
            "athleteList"
        );


    if (!list) {
        return;
    }


    if (!athletes.length) {

        list.innerHTML = `

            <div class="no-messages">
                No athletes yet.
            </div>

        `;

        return;
    }


    list.innerHTML =
        athletes
            .map(
                function (athlete) {

                    const name =
                        athlete.full_name ||
                        "Athlete";


                    const initial =
                        name
                            .charAt(0)
                            .toUpperCase();


                    return `

                        <button
                            type="button"
                            class="
                                athlete-item
                                ${
                                    athlete.unread
                                    ?
                                    "unread"
                                    :
                                    ""
                                }
                            "
                            onclick="
                                openConversation(
                                    '${escapeAttribute(
                                        athlete.id
                                    )}'
                                )
                            "
                        >

                            <div class="athlete-avatar">

                                ${
                                    athlete.avatar_url
                                    ?
                                    `
                                    <img
                                        src="${escapeHtml(
                                            athlete.avatar_url
                                        )}"
                                        alt=""
                                    >
                                    `
                                    :
                                    initial
                                }

                            </div>


                            <div class="athlete-item-info">

                                <div class="athlete-item-name">

                                    ${escapeHtml(
                                        name
                                    )}

                                </div>


                                <div class="athlete-item-last">

                                    ${
                                        athlete.last_message
                                        ?
                                        escapeHtml(
                                            athlete.last_message
                                        )
                                        :
                                        "No messages yet"
                                    }

                                </div>

                            </div>


                            <div class="athlete-item-right">

                                ${
                                    athlete.last_message_at
                                    ?
                                    `
                                    <span class="athlete-item-time">

                                        ${formatTime(
                                            athlete.last_message_at
                                        )}

                                    </span>
                                    `
                                    :
                                    ""
                                }


                                ${
                                    athlete.unread
                                    ?
                                    `
                                    <span class="unread-dot"></span>
                                    `
                                    :
                                    ""
                                }

                            </div>

                        </button>

                    `;

                }
            )
            .join("");

}


/* =========================================
   OPEN COACH CONVERSATION
========================================= */

async function openConversation(
    athleteId
) {

    conversationUserId =
        athleteId;


    await loadProfileHeader(
        athleteId
    );


    showConversation();


    await loadMessages();


    subscribeToMessages();

}


/* =========================================
   LOAD PROFILE HEADER
========================================= */

async function loadProfileHeader(
    userId
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .from("profiles")
            .select(`
                id,
                full_name,
                role,
                avatar_url
            `)
            .eq(
                "id",
                userId
            )
            .maybeSingle();


    if (error) {

        console.error(
            "Profile loading error:",
            error
        );

        setProfileHeader(
            currentRole === "coach"
                ?
                "Athlete"
                :
                "Coach",
            ""
        );

        return;
    }


    if (!data) {

        setProfileHeader(
            currentRole === "coach"
                ?
                "Athlete"
                :
                "Coach",
            ""
        );

        return;
    }


    setProfileHeader(
        data.full_name ||
        (
            currentRole === "coach"
                ?
                "Athlete"
                :
                "Coach"
        ),
        data.role || "",
        data.avatar_url
    );

}


/* =========================================
   PROFILE HEADER
========================================= */

function setProfileHeader(
    name,
    role,
    avatarUrl
) {

    const nameElement =
        document.getElementById(
            "profileName"
        );


    const roleElement =
        document.getElementById(
            "profileRole"
        );


    const avatar =
        document.getElementById(
            "profileAvatar"
        );


    if (nameElement) {

        nameElement.textContent =
            name;

    }


    if (roleElement) {

        roleElement.textContent =
            role === "coach"
                ?
                "Coach"
                :
                role === "athlete"
                    ?
                    "Athlete"
                    :
                    "";

    }


    if (
        avatar &&
        avatarUrl
    ) {

        avatar.innerHTML = `

            <img
                src="${escapeHtml(
                    avatarUrl
                )}"
                alt=""
            >

        `;

    } else if (avatar) {

        avatar.textContent =
            (
                name ||
                "T"
            )
            .charAt(0)
            .toUpperCase();

    }

}


/* =========================================
   SHOW / HIDE CONVERSATION
========================================= */

function showConversation() {

    const section =
        document.getElementById(
            "conversationSection"
        );


    if (section) {

        section.classList.remove(
            "hidden"
        );

    }


    if (
        currentRole ===
        "coach"
    ) {

        const list =
            document.getElementById(
                "athleteListSection"
            );


        if (list) {

            list.classList.add(
                "hidden"
            );

        }

    }

}


function hideConversation() {

    const section =
        document.getElementById(
            "conversationSection"
        );


    if (section) {

        section.classList.add(
            "hidden"
        );

    }

}


function showAthleteList() {

    if (
        currentRole !==
        "coach"
    ) {

        goHome();

        return;
    }


    conversationUserId =
        null;


    hideConversation();


    const list =
        document.getElementById(
            "athleteListSection"
        );


    if (list) {

        list.classList.remove(
            "hidden"
        );

    }


    if (realtimeChannel) {

        supabaseClient
            .removeChannel(
                realtimeChannel
            );

        realtimeChannel =
            null;

    }


    loadAthletes();

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


    if (!conversationUserId) {

        showNoConversation();

        return;
    }


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
                `and(sender_id.eq.${currentUser.id},receiver_id.eq.${conversationUserId}),and(sender_id.eq.${conversationUserId},receiver_id.eq.${currentUser.id})`
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

        showError(
            "Could not load messages."
        );

        return;
    }


    renderMessages(
        data || []
    );


    await markMessagesRead(
        data || []
    );

}


/* =========================================
   RENDER MESSAGES
========================================= */

function renderMessages(
    messages
) {

    const list =
        document.getElementById(
            "messagesList"
        );


    if (!list) {
        return;
    }


    if (!messages.length) {

        list.innerHTML = `

            <div class="no-messages">

                No messages yet.<br><br>

                Start the conversation.

            </div>

        `;

        return;
    }


    list.innerHTML =
        messages
            .map(
                function (message) {

                    const sent =
                        String(
                            message.sender_id
                        ) ===
                        String(
                            currentUser.id
                        );


                    return `

                        <div
                            class="
                                message-row
                                ${
                                    sent
                                    ?
                                    "sent"
                                    :
                                    "received"
                                }
                            "
                        >

                            <div class="message-bubble">

                                ${escapeHtml(
                                    message.message
                                ).replaceAll(
                                    "\n",
                                    "<br>"
                                )}

                                <span class="message-time">

                                    ${formatTime(
                                        message.created_at
                                    )}

                                </span>

                            </div>

                        </div>

                    `;

                }
            )
            .join("");


    scrollToBottom();

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


    if (!conversationUserId) {

        alert(
            "Please select a conversation first."
        );

        return;
    }


    if (button) {

        button.disabled =
            true;

    }


    try {

        const {
            error
        } =
            await supabaseClient
                .from("messages")
                .insert({

                    sender_id:
                        currentUser.id,

                    receiver_id:
                        conversationUserId,

                    message:
                        text

                });


        if (error) {

            console.error(
                "Send message error:",
                error
            );

            alert(
                "Could not send message."
            );

            return;
        }


        input.value = "";

        resizeComposer();


        await loadMessages();


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
        !conversationUserId
    ) {

        return;
    }


    if (realtimeChannel) {

        supabaseClient
            .removeChannel(
                realtimeChannel
            );

    }


    realtimeChannel =
        supabaseClient
            .channel(
                "twete-messages-" +
                currentUser.id +
                "-" +
                conversationUserId
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages"
                },
                async function (
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
                                currentUser.id
                            ) &&
                            String(
                                message.receiver_id
                            ) ===
                            String(
                                conversationUserId
                            )
                        )
                        ||
                        (
                            String(
                                message.sender_id
                            ) ===
                            String(
                                conversationUserId
                            ) &&
                            String(
                                message.receiver_id
                            ) ===
                            String(
                                currentUser.id
                            )
                        );


                    if (belongs) {

                        await loadMessages();

                    }


                    if (
                        currentRole ===
                        "coach"
                    ) {

                        await loadAthletes();

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

    const unreadIds =
        messages
            .filter(
                function (message) {

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
                function (message) {

                    return message.id;

                }
            );


    if (!unreadIds.length) {
        return;
    }


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

}


/* =========================================
   COMPOSER
========================================= */

function setupComposer() {

    const input =
        document.getElementById(
            "messageInput"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "input",
        resizeComposer
    );


    input.addEventListener(
        "keydown",
        function (event) {

            if (
                event.key === "Enter" &&
                !event.shiftKey
            ) {

                event.preventDefault();

                sendMessage();

            }

        }
    );

}


function resizeComposer() {

    const input =
        document.getElementById(
            "messageInput"
        );


    if (!input) {
        return;
    }


    input.style.height =
        "auto";


    input.style.height =
        Math.min(
            input.scrollHeight,
            120
        ) +
        "px";

}


/* =========================================
   NAVIGATION
========================================= */

function goHome() {

    if (
        currentRole ===
        "coach"
    ) {

        window.location.href =
            "coach.html";

        return;
    }


    window.location.href =
        "athlete.html";

}


function goBack() {

    goHome();

}


/* =========================================
   EMPTY / ERROR
========================================= */

function showNoConversation() {

    const list =
        document.getElementById(
            "messagesList"
        );


    if (!list) {
        return;
    }


    list.innerHTML = `

        <div class="no-messages">

            No coach connection found yet.

        </div>

    `;

}


function showError(
    message
) {

    const list =
        document.getElementById(
            "messagesList"
        );


    if (!list) {
        return;
    }


    list.innerHTML = `

        <div class="no-messages">

            ${escapeHtml(
                message
            )}

        </div>

    `;

}


/* =========================================
   HELPERS
========================================= */

function formatTime(
    value
) {

    const date =
        new Date(
            value
        );


    if (
        Number.isNaN(
            date.getTime()
        )
    ) {

        return "";

    }


    return date.toLocaleString(
        "en-US",
        {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


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


function escapeHtml(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /&/g,
            "&amp;"
        )
        .replace(
            /</g,
            "&lt;"
        )
        .replace(
            />/g,
            "&gt;"
        )
        .replace(
            /"/g,
            "&quot;"
        )
        .replace(
            /'/g,
            "&#039;"
        );

}


function escapeAttribute(
    value
) {

    return String(
        value ?? ""
    )
        .replace(
            /'/g,
            "\\'"
        )
        .replace(
            /"/g,
            "&quot;"
        );

}
