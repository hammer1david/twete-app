/* =========================================
   TWETE MESSAGES
========================================= */

const MESSAGES_SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const MESSAGES_SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSNn";


const messagesSupabase =
    window.supabase.createClient(
        MESSAGES_SUPABASE_URL,
        MESSAGES_SUPABASE_KEY
    );


let currentUser = null;

let currentRole = null;

let conversationUserId = null;

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

        /*
           Give Supabase a moment to restore
           the existing browser session.
        */

        const {
            data: {
                session
            },
            error
        } =
            await messagesSupabase.auth.getSession();


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


        /*
           IMPORTANT:
           Do NOT redirect to index.html here.
           The athlete is already coming from
           an authenticated page.
        */

        if (!session || !session.user) {

            showError(
                "Your login session could not be found. Please return to Home and try again."
            );

            return;
        }


        currentUser =
            session.user;


        await loadCurrentProfile();

        await loadConversationUser();
       


      

        await loadMessages();

        subscribeToMessages();

setupComposer();

const conversationSection =
    document.getElementById(
        "conversationSection"
    );

if (conversationSection) {

    conversationSection.classList.remove(
        "hidden"
    );

}

} catch (error) {

    console.error(
        "Messages initialisation error:",
        error
    );

    showError(
        "Could not load Messages."
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
        await messagesSupabase
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
   FIND CONVERSATION USER
========================================= */

async function loadConversationUser() {

    /*
       ATHLETE → COACH
    */

    if (
        currentRole ===
        "athlete"
    ) {

        await loadCoachForAthlete();

        return;
    }


    /*
       COACH → ATHLETE
    */

    if (
        currentRole ===
        "coach"
    ) {

        await loadAthleteForCoach();

        return;
    }


    /*
       Fallback:
       Try athlete → coach relationship.
    */

    await loadCoachForAthlete();

}


/* =========================================
   ATHLETE → COACH
========================================= */

async function loadCoachForAthlete() {

    const {
        data,
        error
    } =
        await messagesSupabase
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
            "Coach relationship error:",
            error
        );

        showNoConversation();

        return;
    }


    if (!data) {

        showNoConversation();

        return;
    }


    conversationUserId =
        data.coach_id;


    await loadProfileHeader(
        conversationUserId
    );

}


/* =========================================
   COACH → ATHLETE
========================================= */

async function loadAthleteForCoach() {

    const requestedAthleteId =
        new URLSearchParams(
            window.location.search
        ).get("athlete_id");


    let query =
        messagesSupabase
            .from("coach_athletes")
            .select(`
                coach_id,
                athlete_id,
                created_at
            `)
            .eq(
                "coach_id",
                currentUser.id
            );


    /*
       If the notification contains an
       athlete_id, open exactly that athlete.
    */

    if (requestedAthleteId) {

        query = query.eq(
            "athlete_id",
            requestedAthleteId
        );

    } else {

        /*
           Normal Messages page:
           use the most recently connected athlete.
        */

        query = query
            .order(
                "created_at",
                {
                    ascending: false
                }
            )
            .limit(1);

    }


    const {
        data,
        error
    } = await query.maybeSingle();


    if (error) {

        console.error(
            "Athlete relationship error:",
            error
        );

        showNoConversation();

        return;
    }


    if (!data) {

        showNoConversation();

        return;
    }


    conversationUserId =
        data.athlete_id;


    await loadProfileHeader(
        conversationUserId
    );

}


/* =========================================
   LOAD OTHER PROFILE
========================================= */

async function loadProfileHeader(
    userId
) {

    const {
        data,
        error
    } =
        await messagesSupabase
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
            "Other profile error:",
            error
        );

        setProfileHeader(
            currentRole === "coach"
                ? "Athlete"
                : "Coach",
            ""
        );

        return;
    }


    if (!data) {

        setProfileHeader(
            currentRole === "coach"
                ? "Athlete"
                : "Coach",
            ""
        );

        return;
    }


    setProfileHeader(
        data.full_name ||
        (
            currentRole === "coach"
                ? "Athlete"
                : "Coach"
        ),
        data.role ||
        "",
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
        await messagesSupabase
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
            "Could not load your messages."
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

                Start the conversation with your coach.

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
   SCROLL TO LATEST MESSAGE
========================================= */
function scrollToBottom() {

    const list =
        document.getElementById(
            "messagesList"
        );

    if (!list) {
        return;
    }

    requestAnimationFrame(function () {

        requestAnimationFrame(function () {

            list.scrollTop =
                list.scrollHeight;

        });

    });

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
            "No coach connection is available yet."
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
            await messagesSupabase
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

        messagesSupabase
            .removeChannel(
                realtimeChannel
            );

    }


    realtimeChannel =
        messagesSupabase
            .channel(
                "twete-messages-" +
                currentUser.id
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


    await messagesSupabase
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

    window.location.href =
        "athlete.html";

}


function goBack() {

    window.location.href =
        "athlete.html";

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
   ESCAPE HTML
========================================= */

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
