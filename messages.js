/* =========================================
   TWETE MESSAGES
========================================= */


/* =========================================
   SUPABASE
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


/* =========================================
   STATE
========================================= */

let currentUser = null;

let currentRole = null;

let conversationUserId = null;

let realtimeChannel = null;

let selectedAttachments = [];

let messagesCache = [];

let isInitialLoading = true;

let isSendingMessage = false;


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

    showChatLoading();

    try {

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


        /*
            Load profile and
            conversation information.
        */

        await loadCurrentProfile();

        await loadConversationUser();


        /*
            Composer can be prepared
            while the message data is loading.
        */

        setupComposer();


        /*
            Load initial messages.
        */

        await loadMessages(
            true
        );


        /*
            Start realtime only after
            initial data is ready.
        */

        subscribeToMessages();


        /*
            Initial loading finished.
        */

        isInitialLoading =
            false;

        hideChatLoading();


        scrollToBottom();


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
   LOADING UI
========================================= */

function showChatLoading() {

    const chat =
        document.querySelector(
            ".chat"
        );


    if (!chat) {
        return;
    }


    chat.classList.add(
        "chat-loading"
    );


    /*
        Do not create the loader
        more than once.
    */

    let loader =
        document.getElementById(
            "chatLoadingOverlay"
        );


    if (loader) {
        return;
    }


    loader =
        document.createElement(
            "div"
        );


    loader.id =
        "chatLoadingOverlay";

    loader.className =
        "chat-loading-overlay";


    loader.innerHTML = `
        <div class="chat-loading-dots">
            <span></span>
            <span></span>
            <span></span>
        </div>
    `;


    chat.appendChild(
        loader
    );

}


function hideChatLoading() {

    const chat =
        document.querySelector(
            ".chat"
        );


    if (!chat) {
        return;
    }


    chat.classList.remove(
        "chat-loading"
    );


    const loader =
        document.getElementById(
            "chatLoadingOverlay"
        );


    if (loader) {

        loader.classList.add(
            "chat-loading-finished"
        );


        setTimeout(
            function () {

                if (
                    loader &&
                    loader.parentNode
                ) {

                    loader.parentNode.removeChild(
                        loader
                    );

                }

            },
            220
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


    if (!data) {
        return;
    }


    currentRole =
        data.role;

}


/* =========================================
   FIND CONVERSATION USER
========================================= */

async function loadConversationUser() {

    if (
        currentRole ===
        "athlete"
    ) {

        await loadCoachForAthlete();

        return;

    }


    if (
        currentRole ===
        "coach"
    ) {

        await loadAthleteForCoach();

        return;

    }


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


    if (requestedAthleteId) {

        query =
            query.eq(
                "athlete_id",
                requestedAthleteId
            );

    } else {

        query =
            query
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
    } =
        await query.maybeSingle();


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
            null
        );

        return;

    }


    if (!data) {

        setProfileHeader(
            currentRole === "coach"
                ? "Athlete"
                : "Coach",
            null
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
        data.avatar_url
    );

}


/* =========================================
   SET HEADER
========================================= */

function setProfileHeader(
    name,
    avatarUrl
) {

    const nameElement =
        document.querySelector(
            ".header-info h1"
        );


    const avatarElement =
        document.querySelector(
            ".header-avatar"
        );


    if (nameElement) {

        nameElement.textContent =
            name || "Twete";

    }


    if (!avatarElement) {
        return;
    }


    if (avatarUrl) {

        avatarElement.innerHTML =
            "";

        const image =
            document.createElement(
                "img"
            );

        image.src =
            avatarUrl;

        image.alt =
            "";

        image.referrerPolicy =
            "no-referrer";

        image.style.width =
            "100%";

        image.style.height =
            "100%";

        image.style.objectFit =
            "cover";

        image.style.borderRadius =
            "50%";

        avatarElement.appendChild(
            image
        );

    } else {

        avatarElement.textContent =
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

async function loadMessages(
    initialLoad = false
) {

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    if (!conversationUserId) {

        showNoConversation();

        return;

    }


    /*
        Fetch messages.
    */

    const {
        data: messages,
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


    const messageList =
        messages || [];


    /*
        Load attachments in ONE query.
    */

    const messageIds =
        messageList.map(
            message =>
                message.id
        );


    let attachments = [];


    if (messageIds.length) {

        const {
            data,
            error:
                attachmentError
        } =
            await messagesSupabase
                .from(
                    "message_attachments"
                )
                .select(`
                    id,
                    message_id,
                    file_url,
                    file_path,
                    file_name,
                    file_type,
                    file_size,
                    created_at
                `)
                .in(
                    "message_id",
                    messageIds
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (attachmentError) {

            console.error(
                "Attachment loading error:",
                attachmentError
            );

        } else {

            attachments =
                data || [];

        }

    }


    /*
        Create signed URLs in parallel.
        This is considerably faster than
        waiting for every URL one by one.
    */

    await Promise.all(
        attachments.map(
            async function (
                attachment
            ) {

                if (
                    !attachment.file_path
                ) {

                    return;

                }


                const [
                    viewResult,
                    downloadResult
                ] =
                    await Promise.all([

                        messagesSupabase
                            .storage
                            .from(
                                "message-attachments"
                            )
                            .createSignedUrl(
                                attachment.file_path,
                                3600
                            ),

                        messagesSupabase
                            .storage
                            .from(
                                "message-attachments"
                            )
                            .createSignedUrl(
                                attachment.file_path,
                                3600,
                                {
                                    download:
                                        attachment.file_name
                                }
                            )

                    ]);


                if (
                    viewResult.error
                ) {

                    console.error(
                        "View signed URL error:",
                        viewResult.error
                    );

                } else {

                    attachment.view_url =
                        viewResult
                            .data
                            ?.signedUrl ||
                        null;

                }


                if (
                    downloadResult.error
                ) {

                    console.error(
                        "Download signed URL error:",
                        downloadResult.error
                    );

                } else {

                    attachment.download_url =
                        downloadResult
                            .data
                            ?.signedUrl ||
                        null;

                }

            }
        )
    );


    /*
        Group attachments.
    */

    const attachmentsByMessage =
        {};


    attachments.forEach(
        function (
            attachment
        ) {

            if (
                !attachmentsByMessage[
                    attachment.message_id
                ]
            ) {

                attachmentsByMessage[
                    attachment.message_id
                ] = [];

            }


            attachmentsByMessage[
                attachment.message_id
            ].push(
                attachment
            );

        }
    );


    /*
        Add attachments to messages.
    */

    messageList.forEach(
        function (
            message
        ) {

            message.attachments =
                attachmentsByMessage[
                    message.id
                ] || [];

        }
    );


    /*
        Save local cache.
    */

    messagesCache =
        messageList;


    /*
        Render.
    */

    renderMessages(
        messageList
    );


    /*
        Mark unread messages as read.
    */

    await markMessagesRead(
        messageList
    );


    /*
        The initial load has finished.
    */

    if (initialLoad) {

        isInitialLoading =
            false;

    }

}


/* =========================================
   RENDER MESSAGES
========================================= */

function renderMessages(
    messages,
    shouldScroll = true
) {

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        "";


    if (!messages.length) {

        const empty =
            document.createElement(
                "div"
            );

        empty.className =
            "no-messages";

        empty.textContent =
            "No messages yet.";

        list.appendChild(
            empty
        );

        return;

    }


    const fragment =
        document.createDocumentFragment();


    messages.forEach(
        function (
            message
        ) {

            const row =
                createMessageElement(
                    message
                );

            fragment.appendChild(
                row
            );

        }
    );


    list.appendChild(
        fragment
    );


    if (shouldScroll) {

        scrollToBottom();

    }

}


/* =========================================
   CREATE MESSAGE ELEMENT
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
   row.dataset.messageId =
    message.id;


    /*
        Bubble
    */

    const bubble =
        document.createElement(
            "div"
        );


    bubble.className =
        "message-bubble";


    /*
        Text
    */

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


    /*
        Attachments
    */

    if (
        message.attachments &&
        message.attachments.length
    ) {

        const attachmentContainer =
            document.createElement(
                "div"
            );

        attachmentContainer.className =
            "message-attachments";


        message.attachments.forEach(
            function (
                attachment
            ) {

                const item =
                    createAttachmentElement(
                        attachment
                    );


                attachmentContainer.appendChild(
                    item
                );

            }
        );


        bubble.appendChild(
            attachmentContainer
        );

    }


    /*
        Time
    */

    const meta =
        document.createElement(
            "div"
        );


    meta.className =
        sent
            ? "message-meta"
            : "message-time";


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


    /*
        Checks
    */

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
   CREATE ATTACHMENT ELEMENT
========================================= */

function createAttachmentElement(
    attachment
) {

    const item =
        document.createElement(
            "div"
        );


    item.className =
        "message-attachment";


    /*
        IMAGE
    */

    if (
        attachment.file_type &&
        attachment.file_type.startsWith(
            "image/"
        ) &&
        attachment.view_url
    ) {

        const image =
            document.createElement(
                "img"
            );


        image.className =
            "message-attachment-image";


        image.src =
            attachment.view_url;


        image.alt =
            attachment.file_name ||
            "Attachment";


        image.loading =
            "lazy";


        image.addEventListener(
            "click",
            function () {

                window.open(
                    attachment.view_url,
                    "_blank"
                );

            }
        );


        item.appendChild(
            image
        );

    }


    /*
        VIDEO
    */

    else if (
        attachment.file_type &&
        attachment.file_type.startsWith(
            "video/"
        ) &&
        attachment.view_url
    ) {

        const video =
            document.createElement(
                "video"
            );


        video.className =
            "message-attachment-video";


        video.src =
            attachment.view_url;


        video.controls =
            true;


        video.playsInline =
            true;


        video.preload =
            "metadata";


        item.appendChild(
            video
        );

    }


    /*
        OTHER FILE
    */

    else {

        const fileBox =
            document.createElement(
                "div"
            );


        fileBox.className =
            "message-file";


        const icon =
            document.createElement(
                "div"
            );


        icon.className =
            "message-file-icon";


        icon.textContent =
            getFileIcon(
                attachment.file_type
            );


        const information =
            document.createElement(
                "div"
            );


        information.className =
            "message-file-info";


        const fileName =
            document.createElement(
                "div"
            );


        fileName.className =
            "message-file-name";


        fileName.textContent =
            attachment.file_name ||
            "File";


        const fileSize =
            document.createElement(
                "div"
            );


        fileSize.className =
            "message-file-size";


        fileSize.textContent =
            formatFileSize(
                attachment.file_size
            );


        information.appendChild(
            fileName
        );


        information.appendChild(
            fileSize
        );


        fileBox.appendChild(
            icon
        );


        fileBox.appendChild(
            information
        );


        item.appendChild(
            fileBox
        );

    }


    /*
        DOWNLOAD
    */

    if (
        attachment.download_url
    ) {

        const download =
            document.createElement(
                "a"
            );


        download.className =
            "message-attachment-download";


        download.href =
            attachment.download_url;


        download.textContent =
            "Download";


        download.target =
            "_blank";


        download.rel =
            "noopener noreferrer";


        download.setAttribute(
            "download",
            attachment.file_name ||
            ""
        );


        item.appendChild(
            download
        );

    }


    return item;

}


/* =========================================
   FILE ICON
========================================= */

function getFileIcon(
    fileType
) {

    if (!fileType) {
        return "📄";
    }


    if (
        fileType.includes(
            "pdf"
        )
    ) {

        return "📕";

    }


    if (
        fileType.includes(
            "word"
        ) ||
        fileType.includes(
            "document"
        )
    ) {

        return "📘";

    }


    if (
        fileType.includes(
            "sheet"
        ) ||
        fileType.includes(
            "excel"
        ) ||
        fileType.includes(
            "spreadsheet"
        )
    ) {

        return "📗";

    }


    if (
        fileType.includes(
            "zip"
        ) ||
        fileType.includes(
            "compressed"
        )
    ) {

        return "🗜️";

    }


    if (
        fileType.startsWith(
            "audio/"
        )
    ) {

        return "🎵";

    }


    return "📄";

}


/* =========================================
   FORMAT FILE SIZE
========================================= */

function formatFileSize(
    bytes
) {

    if (
        bytes === null ||
        bytes === undefined ||
        bytes === ""
    ) {

        return "";

    }


    const size =
        Number(
            bytes
        );


    if (
        Number.isNaN(
            size
        )
    ) {

        return "";

    }


    if (
        size < 1024
    ) {

        return size +
            " B";

    }


    if (
        size < 1024 * 1024
    ) {

        return (
            size /
            1024
        ).toFixed(1) +
            " KB";

    }


    if (
        size < 1024 * 1024 * 1024
    ) {

        return (
            size /
            (1024 * 1024)
        ).toFixed(1) +
            " MB";

    }


    return (
        size /
        (1024 * 1024 * 1024)
    ).toFixed(1) +
        " GB";

}


/* =========================================
   SCROLL TO LATEST MESSAGE
========================================= */

function scrollToBottom() {

    const list =
        document.getElementById(
            "messagesWindow"
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
   ADD SINGLE MESSAGE
========================================= */

async function addRealtimeMessage(
    message
) {

    /*
        Prevent duplicate messages.
    */

    const alreadyExists =
        messagesCache.some(
            function (
                existing
            ) {

                return (
                    String(
                        existing.id
                    ) ===
                    String(
                        message.id
                    )
                );

            }
        );


    if (alreadyExists) {
        return;
    }


    /*
        Wait for attachments to appear
        in the database.

        The realtime INSERT for the
        message can arrive slightly before
        the attachment INSERT.
    */

    let attachments = [];

    const maxAttempts = 10;

    const delay = 200;


    for (
        let attempt = 0;
        attempt < maxAttempts;
        attempt++
    ) {

        const {
            data,
            error
        } =
            await messagesSupabase
                .from(
                    "message_attachments"
                )
                .select(`
                    id,
                    message_id,
                    file_url,
                    file_path,
                    file_name,
                    file_type,
                    file_size,
                    created_at
                `)
                .eq(
                    "message_id",
                    message.id
                )
                .order(
                    "created_at",
                    {
                        ascending: true
                    }
                );


        if (error) {

            console.error(
                "Realtime attachment error:",
                error
            );

            break;

        }


        attachments =
            data || [];


        /*
            Attachments found.
        */

        if (
            attachments.length > 0
        ) {

            break;

        }


        /*
            Wait before checking again.
        */

        if (
            attempt <
            maxAttempts - 1
        ) {

            await new Promise(
                function (
                    resolve
                ) {

                    setTimeout(
                        resolve,
                        delay
                    );

                }
            );

        }

    }


    /*
        Generate signed URLs.
    */

    await Promise.all(
        attachments.map(
            async function (
                attachment
            ) {

                if (
                    !attachment.file_path
                ) {

                    return;

                }


                const [
                    viewResult,
                    downloadResult
                ] =
                    await Promise.all([

                        messagesSupabase
                            .storage
                            .from(
                                "message-attachments"
                            )
                            .createSignedUrl(
                                attachment.file_path,
                                3600
                            ),

                        messagesSupabase
                            .storage
                            .from(
                                "message-attachments"
                            )
                            .createSignedUrl(
                                attachment.file_path,
                                3600,
                                {
                                    download:
                                        attachment.file_name
                                }
                            )

                    ]);


                if (
                    !viewResult.error
                ) {

                    attachment.view_url =
                        viewResult
                            .data
                            ?.signedUrl ||
                        null;

                }


                if (
                    !downloadResult.error
                ) {

                    attachment.download_url =
                        downloadResult
                            .data
                            ?.signedUrl ||
                        null;

                }

            }
        )
    );


    /*
        Add attachments to message.
    */

    message.attachments =
        attachments;


    /*
        Add message to local cache.
    */

    messagesCache.push(
        message
    );


    messagesCache.sort(
        function (
            a,
            b
        ) {

            return (
                new Date(
                    a.created_at
                ) -
                new Date(
                    b.created_at
                )
            );

        }
    );


    /*
        Add message to chat.
    */

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    /*
        Remove empty state.
    */

    const empty =
        list.querySelector(
            ".no-messages"
        );


    if (empty) {

        empty.remove();

    }


    /*
        Create complete message.
    */

    const row =
        createMessageElement(
            message
        );


    list.appendChild(
        row
    );


    /*
        Keep newest message visible.
    */

    scrollToBottom();


    /*
        Mark received message as read.
    */

    if (
        String(
            message.receiver_id
        ) ===
        String(
            currentUser.id
        )
    ) {

        await markMessagesRead(
            [message]
        );

    }

}
/* =========================================
   SEND MESSAGE + ATTACHMENTS
========================================= */

async function sendMessage() {

    const input =
        document.getElementById(
            "messageInput"
        );

    const button =
        document.querySelector(
            ".send-button"
        );


    if (!input) {
        return;
    }


    const text =
        input.value.trim();


    /*
        TEXT OR ATTACHMENTS
        ARE ENOUGH TO SEND
    */

    if (
        !text &&
        selectedAttachments.length === 0
    ) {

        return;

    }


    if (!conversationUserId) {

        showError(
            "No conversation is available yet."
        );

        return;

    }


    if (button) {

        button.disabled =
            true;

    }


    /*
        Keep the selected files before
        clearing the composer.
    */

    const filesToUpload =
        [...selectedAttachments];


    try {

        /* =====================================
           STEP 1
           CREATE MESSAGE
        ===================================== */

        const {
            data: messageData,
            error: messageError
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

                })
                .select(
                    `
                    id,
                    sender_id,
                    receiver_id,
                    message,
                    created_at,
                    read_at
                    `
                )
                .single();


        if (messageError) {

            console.error(
                "Send message error:",
                messageError
            );

            showError(
                "Could not send message."
            );

            return;

        }


        const messageId =
            messageData.id;


        /* =====================================
           STEP 2
           UPLOAD ATTACHMENTS
        ===================================== */

        const uploadedAttachments =
            [];


        for (
            let i = 0;
            i < filesToUpload.length;
            i++
        ) {

            const file =
                filesToUpload[i];


            const safeFileName =
                file.name.replace(
                    /[^a-zA-Z0-9._-]/g,
                    "_"
                );


            const filePath =
                currentUser.id +
                "/" +
                messageId +
                "/" +
                crypto.randomUUID() +
                "-" +
                safeFileName;


            /*
                UPLOAD FILE
            */

            const {
                error: uploadError
            } =
                await messagesSupabase
                    .storage
                    .from(
                        "message-attachments"
                    )
                    .upload(
                        filePath,
                        file,
                        {
                            cacheControl:
                                "3600",

                            upsert:
                                false,

                            contentType:
                                file.type ||
                                "application/octet-stream"
                        }
                    );


            if (uploadError) {

                console.error(
                    "Attachment upload error:",
                    uploadError
                );

                showError(
                    "Message was created, but an attachment could not be uploaded."
                );

                return;

            }


            /*
                SAVE ATTACHMENT METADATA
            */

            const {
                data:
                    attachmentData,
                error:
                    attachmentError
            } =
                await messagesSupabase
                    .from(
                        "message_attachments"
                    )
                    .insert({

                        message_id:
                            messageId,

                        file_url:
                            null,

                        file_path:
                            filePath,

                        file_name:
                            file.name,

                        file_type:
                            file.type ||
                            "application/octet-stream",

                        file_size:
                            file.size

                    })
                    .select(
                        `
                        id,
                        message_id,
                        file_url,
                        file_path,
                        file_name,
                        file_type,
                        file_size,
                        created_at
                        `
                    )
                    .single();


            if (attachmentError) {

                console.error(
                    "Attachment database error:",
                    attachmentError
                );

                showError(
                    "Attachment was uploaded, but could not be saved."
                );

                return;

            }


            /*
                Create the VIEW signed URL
                immediately.
            */

            let viewUrl =
                null;


            const {
                data:
                    viewData,
                error:
                    viewError
            } =
                await messagesSupabase
                    .storage
                    .from(
                        "message-attachments"
                    )
                    .createSignedUrl(
                        filePath,
                        3600
                    );


            if (viewError) {

                console.error(
                    "View signed URL error:",
                    viewError
                );

            } else {

                viewUrl =
                    viewData?.signedUrl ||
                    null;

            }


            /*
                Create DOWNLOAD signed URL
                immediately.
            */

            let downloadUrl =
                null;


            const {
                data:
                    downloadData,
                error:
                    downloadError
            } =
                await messagesSupabase
                    .storage
                    .from(
                        "message-attachments"
                    )
                    .createSignedUrl(
                        filePath,
                        3600,
                        {
                            download:
                                file.name
                        }
                    );


            if (downloadError) {

                console.error(
                    "Download signed URL error:",
                    downloadError
                );

            } else {

                downloadUrl =
                    downloadData?.signedUrl ||
                    null;

            }


            /*
                Add the complete attachment
                to our local message.
            */

            uploadedAttachments.push({

                id:
                    attachmentData?.id ||
                    crypto.randomUUID(),

                message_id:
                    messageId,

                file_url:
                    null,

                file_path:
                    filePath,

                file_name:
                    file.name,

                file_type:
                    file.type ||
                    "application/octet-stream",

                file_size:
                    file.size,

                created_at:
                    attachmentData?.created_at ||
                    new Date().toISOString(),

                view_url:
                    viewUrl,

                download_url:
                    downloadUrl

            });

        }


        /* =====================================
           STEP 3
           BUILD THE NEW MESSAGE LOCALLY
        ===================================== */

        messageData.attachments =
            uploadedAttachments;


        /*
            IMPORTANT:

            We render the new message directly.
            We do NOT wait for another
            loadMessages() request.
        */

        appendMessageToChat(
            messageData
        );


        /* =====================================
           STEP 4
           CLEAR COMPOSER
        ===================================== */

        input.value =
            "";

        resizeComposer();

        clearAttachments();


        /*
            Keep the newest message visible.
        */

        scrollToBottom();


    } catch (error) {

        console.error(
            "Send message exception:",
            error
        );

        showError(
            "Something went wrong while sending your message."
        );


    } finally {

        if (button) {

            button.disabled =
                false;

        }

    }

}


/* =========================================
   APPEND SINGLE MESSAGE
========================================= */

function appendMessageToChat(
    message
) {

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    /*
        Prevent duplicate messages
    */

    const alreadyExists =
        messagesCache.some(
            function (
                existing
            ) {

                return (
                    String(
                        existing.id
                    ) ===
                    String(
                        message.id
                    )
                );

            }
        );


    if (alreadyExists) {
        return;
    }


    /*
        Add message to local cache
    */

    messagesCache.push(
        message
    );


    messagesCache.sort(
        function (
            a,
            b
        ) {

            return (
                new Date(
                    a.created_at
                ) -
                new Date(
                    b.created_at
                )
            );

        }
    );


    /*
        Remove empty state
    */

    const empty =
        list.querySelector(
            ".no-messages"
        );


    if (empty) {

        empty.remove();

    }


    /*
        Create message using
        the SAME renderer as
        the rest of the chat.
    */

    const row =
        createMessageElement(
            message
        );


    list.appendChild(
        row
    );


    /*
        Keep newest message visible
    */

    scrollToBottom();

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

                   if (
    String(message.sender_id) ===
    String(currentUser.id)
) {

    return;

                   }


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


                    if (!belongs) {
                        return;
                    }


                    /*
                        We do NOT call loadMessages()
                        anymore.

                        Only the new message
                        is loaded and rendered.
                    */

                    await addRealtimeMessage(
                        message
                    );

                }
            )
            .subscribe();

}


/* =========================================
   MARK MESSAGES READ
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


    if (error) {

        console.error(
            "Mark read error:",
            error
        );

    }


    /*
        Keep local cache updated.
    */

    messagesCache.forEach(
        function (
            message
        ) {

            if (
                unreadIds.includes(
                    message.id
                )
            ) {

                message.read_at =
                    new Date().toISOString();

            }

        }
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


    const sendButton =
        document.querySelector(
            ".send-button"
        );


    const attachmentButton =
        document.querySelector(
            ".attachment-button"
        );


    const attachmentInput =
        document.getElementById(
            "attachmentInput"
        );

const cameraButton =
    document.getElementById(
        "cameraButton"
    );

const cameraInput =
    document.getElementById(
        "cameraInput"
    );
    const backButton =
        document.querySelector(
            ".back-button"
        );


    /*
        SEND
    */

    if (sendButton) {

        sendButton.addEventListener(
            "click",
            sendMessage
        );

    }


    /*
        TEXTAREA
    */

    if (input) {

        input.addEventListener(
            "input",
            resizeComposer
        );


        input.addEventListener(
            "keydown",
            function (
                event
            ) {

                /*
                    Enter = new line.
                */

                if (
                    event.key ===
                    "Enter"
                ) {

                    return;

                }

            }
        );

    }
/* =====================================
   CAMERA
===================================== */

if (
    cameraButton &&
    cameraInput
) {

    cameraButton.addEventListener(
        "click",
        function () {

            cameraInput.click();

        }
    );


    cameraInput.addEventListener(
        "change",
        async function () {

            const file =
                cameraInput.files?.[0];


            if (!file) {
                return;
            }


            try {

                /*
                    Compress camera image
                    before keeping it in memory.
                */

                const compressedFile =
                    await compressCameraImage(
                        file
                    );


                const remainingSlots =
                    4 -
                    selectedAttachments.length;


                if (
                    remainingSlots <= 0
                ) {

                    alert(
                        "You can attach a maximum of 4 files."
                    );

                    cameraInput.value =
                        "";

                    return;

                }


                selectedAttachments.push(
                    compressedFile
                );


                renderAttachmentPreview();


            } catch (error) {

                console.error(
                    "Camera image processing error:",
                    error
                );


                /*
                    If compression fails,
                    use the original file.
                */

                selectedAttachments.push(
                    file
                );


                renderAttachmentPreview();

            }


            cameraInput.value =
                "";

        }
    );

}

    /*
        BACK
    */

    if (backButton) {

        backButton.addEventListener(
            "click",
            goBack
        );

    }


    /*
        ATTACHMENTS
    */

    if (
        attachmentButton &&
        attachmentInput
    ) {

        attachmentButton.addEventListener(
            "click",
            function () {

                attachmentInput.click();

            }
        );


        attachmentInput.addEventListener(
            "change",
            function () {

                const files =
                    Array.from(
                        attachmentInput.files
                    );


                if (!files.length) {
                    return;
                }


                const remainingSlots =
                    4 -
                    selectedAttachments.length;


                if (
                    remainingSlots <= 0
                ) {

                    alert(
                        "You can attach a maximum of 4 files."
                    );

                    attachmentInput.value =
                        "";

                    return;

                }


                const filesToAdd =
                    files.slice(
                        0,
                        remainingSlots
                    );


                selectedAttachments =
                    selectedAttachments.concat(
                        filesToAdd
                    );


                if (
                    files.length >
                    remainingSlots
                ) {

                    alert(
                        "You can attach a maximum of 4 files."
                    );

                }


                renderAttachmentPreview();


                attachmentInput.value =
                    "";

            }
        );

    }

}


/* =========================================
   RENDER ATTACHMENT PREVIEW
========================================= */

function renderAttachmentPreview() {

    const preview =
        document.getElementById(
            "attachmentPreview"
        );


    const content =
        document.getElementById(
            "attachmentPreviewContent"
        );


    if (
        !preview ||
        !content
    ) {
        return;
    }


    content.innerHTML =
        "";


    if (
        selectedAttachments.length === 0
    ) {

        preview.hidden =
            true;

        return;

    }


    preview.hidden =
        false;


    selectedAttachments.forEach(
        function (
            file,
            index
        ) {

            const item =
                document.createElement(
                    "div"
                );


            item.className =
                "attachment-item";


            /*
                IMAGE
            */

            if (
                file.type.startsWith(
                    "image/"
                )
            ) {

                const image =
                    document.createElement(
                        "img"
                    );


                image.className =
                    "attachment-preview-image";


                const objectUrl =
                    URL.createObjectURL(
                        file
                    );


                image.src =
                    objectUrl;


                image.alt =
                    file.name;


                image.onload =
                    function () {

                        URL.revokeObjectURL(
                            objectUrl
                        );

                    };


                item.appendChild(
                    image
                );

            }


            /*
                VIDEO
            */

            else if (
                file.type.startsWith(
                    "video/"
                )
            ) {

                const video =
                    document.createElement(
                        "video"
                    );


                video.className =
                    "attachment-preview-video";


                const objectUrl =
                    URL.createObjectURL(
                        file
                    );


                video.src =
                    objectUrl;


                video.muted =
                    true;


                video.playsInline =
                    true;


                video.preload =
                    "metadata";


                video.onloadeddata =
                    function () {

                        URL.revokeObjectURL(
                            objectUrl
                        );

                    };


                item.appendChild(
                    video
                );

            }


            /*
                OTHER FILE
            */

            else {

                const icon =
                    document.createElement(
                        "div"
                    );


                icon.className =
                    "attachment-file-icon";


                icon.textContent =
                    getFileIcon(
                        file.type
                    );


                item.appendChild(
                    icon
                );


                const fileName =
                    document.createElement(
                        "div"
                    );


                fileName.className =
                    "attachment-file-name";


                fileName.textContent =
                    file.name;


                item.appendChild(
                    fileName
                );

            }


            /*
                REMOVE BUTTON
            */

            const remove =
                document.createElement(
                    "button"
                );


            remove.type =
                "button";


            remove.className =
                "attachment-remove";


            remove.textContent =
                "×";


            remove.setAttribute(
                "aria-label",
                "Remove attachment"
            );


            remove.addEventListener(
                "click",
                function () {

                    removeAttachment(
                        index
                    );

                }
            );


            item.appendChild(
                remove
            );


            content.appendChild(
                item
            );

        }
    );

}


/* =========================================
   REMOVE ONE ATTACHMENT
========================================= */

function removeAttachment(
    index
) {

    if (
        index < 0 ||
        index >=
        selectedAttachments.length
    ) {

        return;

    }


    selectedAttachments.splice(
        index,
        1
    );


    renderAttachmentPreview();

}


/* =========================================
   REMOVE ALL ATTACHMENTS
========================================= */

function clearAttachments() {

    selectedAttachments =
        [];


    const attachmentInput =
        document.getElementById(
            "attachmentInput"
        );


    if (attachmentInput) {

        attachmentInput.value =
            "";

    }


    renderAttachmentPreview();

}


/* =========================================
   RESIZE COMPOSER
========================================= */

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
            130
        ) +
        "px";

}


/* =========================================
   NAVIGATION
========================================= */

function goBack() {

    window.location.href =
        "athlete.html";

}


/* =========================================
   EMPTY STATE
========================================= */

function showNoConversation() {

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        "";


    const empty =
        document.createElement(
            "div"
        );


    empty.className =
        "no-messages";


    empty.textContent =
        "No conversation found yet.";


    list.appendChild(
        empty
    );

}


/* =========================================
   ERROR
========================================= */

function showError(
    message
) {

    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    list.innerHTML =
        "";


    const errorElement =
        document.createElement(
            "div"
        );


    errorElement.className =
        "no-messages";


    errorElement.textContent =
        message;


    list.appendChild(
        errorElement
    );


}


/* =========================================
   FORMAT TIME
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


    return date.toLocaleTimeString(
        [],
        {
            hour: "2-digit",
            minute: "2-digit"
        }
    );

}


/* =========================================
   MOBILE KEYBOARD / VISUAL VIEWPORT
========================================= */

function handleKeyboardResize() {

    if (!window.visualViewport) {
        return;
    }


    const chat =
        document.querySelector(
            ".chat"
        );


    if (!chat) {
        return;
    }


    const viewportHeight =
        window.visualViewport.height;


    chat.style.height =
        viewportHeight +
        "px";


    requestAnimationFrame(
        function () {

            scrollToBottom();

        }
    );

}


if (window.visualViewport) {

    window.visualViewport.addEventListener(
        "resize",
        handleKeyboardResize
    );


    window.visualViewport.addEventListener(
        "scroll",
        handleKeyboardResize
    );

}


window.addEventListener(
    "load",
    handleKeyboardResize
);
