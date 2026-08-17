/* =========================================
   TWETE MESSAGES
========================================= */

const SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxvWov_DJ3StSN";


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

let selectedFile = null;


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


        if (
            error ||
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

        setupAttachmentInput();

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
   PROFILE
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
   ATHLETE
========================================= */

async function initialiseAthlete() {

    const list =
        document.getElementById(
            "athleteListSection"
        );


    if (list) {

        list.classList.add(
            "hidden"
        );

    }


    await loadCoachForAthlete();


    if (conversationUserId) {

        showConversation();

        await loadMessages();

        subscribeToMessages();

    } else {

        showConversation();

        showNoConversation();

    }

}


/* =========================================
   ATHLETE → COACH
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


    if (error || !data) {

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
   COACH
========================================= */

async function initialiseCoach() {

    const list =
        document.getElementById(
            "athleteListSection"
        );


    if (list) {

        list.classList.remove(
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

        list.innerHTML = `

            <div class="no-messages">
                No athletes are connected yet.
            </div>

        `;

        return;
    }


    const ids =
        connections.map(
            item =>
                item.athlete_id
        );


    const {
        data: profiles
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
                ids
            );


    athletes =
        profiles || [];


    const enriched =
        await Promise.all(
            athletes.map(
                async athlete => {

                    return {
                        ...athlete,
                        ...await getLastMessageInfo(
                            athlete.id
                        )
                    };

                }
            )
        );


    athletes =
        enriched.sort(
            (
                a,
                b
            ) => {

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


    renderAthleteList();

}


/* =========================================
   LAST MESSAGE
========================================= */

async function getLastMessageInfo(
    athleteId
) {

    const {
        data
    } =
        await supabaseClient
            .from("messages")
            .select(`
                id,
                sender_id,
                receiver_id,
                message,
                created_at,
                read_at,
                attachment_name,
                attachment_type
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


    if (!data) {

        return {

            last_message:
                "",

            last_message_at:
                null,

            unread_count:
                0

        };

    }


    const {
        count
    } =
        await supabaseClient
            .from("messages")
            .select(
                "id",
                {
                    count: "exact",
                    head: true
                }
            )
            .eq(
                "sender_id",
                athleteId
            )
            .eq(
                "receiver_id",
                currentUser.id
            )
            .is(
                "read_at",
                null
            );


    let preview =
        data.message ||
        "";


    if (
        !preview &&
        data.attachment_name
    ) {

        preview =
            getAttachmentLabel(
                data.attachment_type
            ) +
            ": " +
            data.attachment_name;

    }


    return {

        last_message:
            preview,

        last_message_at:
            data.created_at,

        unread_count:
            count || 0

    };

}


/* =========================================
   ATHLETE LIST
========================================= */

function renderAthleteList() {

    const list =
        document.getElementById(
            "athleteList"
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        athletes
            .map(
                athlete => {

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
                                    athlete.unread_count
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
                                    athlete.unread_count
                                    ?
                                    `
                                    <span class="unread-count">
                                        ${
                                            athlete.unread_count > 99
                                            ?
                                            "99+"
                                            :
                                            athlete.unread_count
                                        }
                                    </span>
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
   OPEN CONVERSATION
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
   PROFILE HEADER
========================================= */

async function loadProfileHeader(
    userId
) {

    const {
        data
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


    if (!data) {

        setProfileHeader(
            currentRole === "coach"
                ?
                "Athlete"
                :
                "Coach",
            "",
            null
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
   SHOW CONVERSATION
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

        document
            .getElementById(
                "athleteListSection"
            )
            ?.classList.add(
                "hidden"
            );

    }

}


function hideConversation() {

    document
        .getElementById(
            "conversationSection"
        )
        ?.classList.add(
            "hidden"
        );

}


/* =========================================
   BACK TO ATHLETES
========================================= */

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


    document
        .getElementById(
            "athleteListSection"
        )
        ?.classList.remove(
            "hidden"
        );


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
                read_at,
                attachment_path,
                attachment_name,
                attachment_type,
                attachment_size
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


    await renderMessages(
        data || []
    );


    await markMessagesRead(
        data || []
    );

}


/* =========================================
   RENDER MESSAGES
========================================= */

async function renderMessages(
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


    let unreadDividerShown =
        false;


    let html = "";


    for (
        const message
        of messages
    ) {

        const sent =
            String(
                message.sender_id
            ) ===
            String(
                currentUser.id
            );


        const unread =
            !sent &&
            !message.read_at;


        /*
           Add unread divider before the
           first unread incoming message.
        */

        if (
            unread &&
            !unreadDividerShown
        ) {

            html += `

                <div class="unread-divider">

                    Unread

                </div>

            `;

            unreadDividerShown =
                true;

        }


        let attachmentHtml =
            "";


        if (
            message.attachment_path
        ) {

            attachmentHtml =
                await createAttachmentHtml(
                    message
                );

        }


        let statusHtml =
            "";


        if (sent) {

            statusHtml = `

                <span
                    class="
                        message-status
                        ${
                            message.read_at
                            ?
                            "read"
                            :
                            "unread"
                        }
                    "
                >

                    ${
                        message.read_at
                        ?
                        "Read"
                        :
                        "Unread"
                    }

                </span>

            `;

        }


        html += `

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

                    ${attachmentHtml}


                    ${
                        message.message
                        ?
                        `
                        <div>

                            ${escapeHtml(
                                message.message
                            ).replaceAll(
                                "\n",
                                "<br>"
                            )}

                        </div>
                        `
                        :
                        ""
                    }


                    <span class="message-time">

                        ${formatTime(
                            message.created_at
                        )}

                    </span>


                    ${statusHtml}

                </div>

            </div>

        `;

    }


    list.innerHTML =
        html;


    scrollToBottom();

}


/* =========================================
   ATTACHMENT HTML
========================================= */

async function createAttachmentHtml(
    message
) {

    const {
        data,
        error
    } =
        await supabaseClient
            .storage
            .from(
                "message-attachments"
            )
            .createSignedUrl(
                message.attachment_path,
                3600
            );


    if (
        error ||
        !data
    ) {

        return `

            <div class="message-file">

                <div class="file-icon">
                    📎
                </div>

                <div class="file-name">

                    ${escapeHtml(
                        message.attachment_name ||
                        "Attachment"
                    )}

                </div>

            </div>

        `;

    }


    const url =
        data.signedUrl;


    const type =
        message.attachment_type ||
        "";


    const name =
        message.attachment_name ||
        "Attachment";


    if (
        type.startsWith(
            "image/"
        )
    ) {

        return `

            <a
                href="${escapeHtml(url)}"
                target="_blank"
                rel="noopener"
            >

                <img
                    class="message-image"
                    src="${escapeHtml(url)}"
                    alt="${escapeHtml(name)}"
                >

            </a>

        `;

    }


    if (
        type.startsWith(
            "video/"
        )
    ) {

        return `

            <video
                class="message-video"
                controls
                preload="metadata"
            >

                <source
                    src="${escapeHtml(url)}"
                    type="${escapeHtml(type)}"
                >

            </video>

        `;

    }


    return `

        <a
            class="message-file"
            href="${escapeHtml(url)}"
            target="_blank"
            rel="noopener"
        >

            <div class="file-icon">
                📄
            </div>


            <div class="file-name">

                ${escapeHtml(name)}

            </div>

        </a>

    `;

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


    if (
        !text &&
        !selectedFile
    ) {

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

        /*
           Generate the message ID now.

           This lets us use the same ID
           for the attachment path.
        */

        const messageId =
            crypto.randomUUID();


        let attachmentPath =
            null;

        let attachmentName =
            null;

        let attachmentType =
            null;

        let attachmentSize =
            null;


        /* =============================
           UPLOAD ATTACHMENT
        ============================= */

        if (selectedFile) {

            const extension =
                getFileExtension(
                    selectedFile.name
                );


            attachmentPath =
                currentUser.id +
                "/" +
                messageId +
                (
                    extension
                    ?
                    "." +
                    extension
                    :
                    ""
                );


            const {
                error:
                    uploadError
            } =
                await supabaseClient
                    .storage
                    .from(
                        "message-attachments"
                    )
                    .upload(
                        attachmentPath,
                        selectedFile,
                        {
                            contentType:
                                selectedFile.type ||
                                "application/octet-stream",

                            upsert:
                                false
                        }
                    );


            if (uploadError) {

                console.error(
                    "Attachment upload error:",
                    uploadError
                );

                alert(
                    "Could not upload the attachment."
                );

                return;

            }


            attachmentName =
                selectedFile.name;


            attachmentType =
                selectedFile.type ||
                "application/octet-stream";


            attachmentSize =
                selectedFile.size;

        }


        /* =============================
           INSERT MESSAGE
        ============================= */

        const {
            error
        } =
            await supabaseClient
                .from("messages")
                .insert({

                    id:
                        messageId,

                    sender_id:
                        currentUser.id,

                    receiver_id:
                        conversationUserId,

                    message:
                        text || null,

                    attachment_path:
                        attachmentPath,

                    attachment_name:
                        attachmentName,

                    attachment_type:
                        attachmentType,

                    attachment_size:
                        attachmentSize

                });


        if (error) {

            console.error(
                "Send message error:",
                error
            );


            /*
               If the database insert fails after
               upload, remove the orphaned file.
            */

            if (
                attachmentPath
            ) {

                await supabaseClient
                    .storage
                    .from(
                        "message-attachments"
                    )
                    .remove([
                        attachmentPath
                    ]);

            }


            alert(
                "Could not send message."
            );

            return;

        }


        input.value = "";

        clearSelectedFile();

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
   ATTACHMENT INPUT
========================================= */

function setupAttachmentInput() {

    const input =
        document.getElementById(
            "attachmentInput"
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        "change",
        function () {

            if (
                !input.files ||
                !input.files.length
            ) {

                return;

            }


            const file =
                input.files[0];


            const maxSize =
                50 * 1024 * 1024;


            if (
                file.size >
                maxSize
            ) {

                alert(
                    "The file is too large. Maximum size is 50 MB."
                );


                input.value =
                    "";

                return;

            }


            selectedFile =
                file;


            const fileName =
                document.getElementById(
                    "selectedFileName"
                );


            const selected =
                document.getElementById(
                    "selectedFile"
                );


            if (fileName) {

                fileName.textContent =
                    file.name;

            }


            if (selected) {

                selected.classList.remove(
                    "hidden"
                );

            }

        }
    );

}


/* =========================================
   CLEAR FILE
========================================= */

function clearSelectedFile() {

    selectedFile =
        null;


    const input =
        document.getElementById(
            "attachmentInput"
        );


    if (input) {

        input.value =
            "";

    }


    document
        .getElementById(
            "selectedFile"
        )
        ?.classList.add(
            "hidden"
        );

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
                message => {

                    return (

                        String(
                            message.receiver_id
                        ) ===
                        String(
                            currentUser.id
                        )

                        &&

                        !message.read_at

                    );

                }
            )
            .map(
                message =>
                    message.id
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

        return;

    }


    /*
       Refresh coach athlete list so unread
       counters disappear immediately.
    */

    if (
        currentRole ===
        "coach"
    ) {

        await loadAthletes();

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
                    event:
                        "INSERT",

                    schema:
                        "public",

                    table:
                        "messages"
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
                            )

                            &&

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
                            )

                            &&

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
                event.key ===
                "Enter"

                &&

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
            month:
                "short",

            day:
                "numeric",

            hour:
                "2-digit",

            minute:
                "2-digit"
        }
    );

}


function getFileExtension(
    fileName
) {

    const parts =
        String(
            fileName
        )
        .split(".");


    if (
        parts.length <= 1
    ) {

        return "";

    }


    return parts
        .pop()
        .toLowerCase()
        .replace(
            /[^a-z0-9]/g,
            ""
        );

}


function getAttachmentLabel(
    type
) {

    if (
        type &&
        type.startsWith(
            "image/"
        )
    ) {

        return "Image";

    }


    if (
        type &&
        type.startsWith(
            "video/"
        )
    ) {

        return "Video";

    }


    return "File";

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
        value ??
        ""
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
        value ??
        ""
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
