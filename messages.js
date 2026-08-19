/* =========================================
   TWETE MESSAGES
========================================= */


/* =========================================
   SUPABASE
========================================= */

const MESSAGES_SUPABASE_URL =
    "https://uhbhsyuodizauwhhdffu.supabase.co";

const MESSAGES_SUPABASE_KEY =
    "sb_publishable_o-hfeydDJf5J-xPQyxwVow_DJ3StSN";

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


/* =========================================
   CAMERA STATE
========================================= */

let cameraStream = null;


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


        await loadCurrentProfile();

        await loadConversationUser();

        setupComposer();

        await loadMessages(true);

        subscribeToMessages();

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
        document.querySelector(".chat");


    if (!chat) {
        return;
    }


    chat.classList.add(
        "chat-loading"
    );


    let loader =
        document.getElementById(
            "chatLoadingOverlay"
        );


    if (loader) {
        return;
    }


    loader =
        document.createElement("div");


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


    chat.appendChild(loader);

}


function hideChatLoading() {

    const chat =
        document.querySelector(".chat");


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
        currentRole === "athlete"
    ) {

        await loadCoachForAthlete();

        return;

    }


    if (
        currentRole === "coach"
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
            document.createElement("img");


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


    messagesCache =
        messageList;


    renderMessages(
        messageList
    );


    await markMessagesRead(
        messageList
    );


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
            document.createElement("div");


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

            fragment.appendChild(
                createMessageElement(
                    message
                )
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
        document.createElement("div");


    row.className =
        sent
            ? "message-row sent"
            : "message-row received";


    row.dataset.messageId =
        message.id;


    const bubble =
        document.createElement("div");


    bubble.className =
        "message-bubble";


    if (
        message.message &&
        message.message.trim()
    ) {

        const text =
            document.createElement("div");


        text.className =
            "message-text";


        text.textContent =
            message.message;


        bubble.appendChild(
            text
        );

    }


    if (
        message.attachments &&
        message.attachments.length
    ) {

        const attachmentContainer =
            document.createElement("div");


        attachmentContainer.className =
            "message-attachments";


        message.attachments.forEach(
            function (
                attachment
            ) {

                attachmentContainer.appendChild(
                    createAttachmentElement(
                        attachment
                    )
                );

            }
        );


        bubble.appendChild(
            attachmentContainer
        );

    }


    const meta =
        document.createElement("div");


    meta.className =
        sent
            ? "message-meta"
            : "message-time";


    const time =
        document.createElement("span");


    time.textContent =
        formatTime(
            message.created_at
        );


    meta.appendChild(
        time
    );


    if (sent) {

        const checks =
            document.createElement("span");


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
        document.createElement("div");


    item.className =
        "message-attachment";


    if (
        attachment.file_type &&
        attachment.file_type.startsWith(
            "image/"
        ) &&
        attachment.view_url
    ) {

        const image =
            document.createElement("img");


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

    else if (
        attachment.file_type &&
        attachment.file_type.startsWith(
            "video/"
        ) &&
        attachment.view_url
    ) {

        const video =
            document.createElement("video");


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

    else {

        const fileBox =
            document.createElement("div");


        fileBox.className =
            "message-file";


        const icon =
            document.createElement("div");


        icon.className =
            "message-file-icon";


        icon.textContent =
            getFileIcon(
                attachment.file_type
            );


        const information =
            document.createElement("div");


        information.className =
            "message-file-info";


        const fileName =
            document.createElement("div");


        fileName.className =
            "message-file-name";


        fileName.textContent =
            attachment.file_name ||
            "File";


        const fileSize =
            document.createElement("div");


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


    if (
        attachment.download_url
    ) {

        const download =
            document.createElement("a");


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
            attachment.file_name || ""
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
        fileType.includes("pdf")
    ) {
        return "📕";
    }


    if (
        fileType.includes("word") ||
        fileType.includes("document")
    ) {
        return "📘";
    }


    if (
        fileType.includes("sheet") ||
        fileType.includes("excel") ||
        fileType.includes("spreadsheet")
    ) {
        return "📗";
    }


    if (
        fileType.includes("zip") ||
        fileType.includes("compressed")
    ) {
        return "🗜️";
    }


    if (
        fileType.startsWith("audio/")
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
        Number(bytes);


    if (
        Number.isNaN(size)
    ) {

        return "";

    }


    if (
        size < 1024
    ) {

        return size + " B";

    }


    if (
        size < 1024 * 1024
    ) {

        return (
            size / 1024
        ).toFixed(1) + " KB";

    }


    if (
        size < 1024 * 1024 * 1024
    ) {

        return (
            size / (1024 * 1024)
        ).toFixed(1) + " MB";

    }


    return (
        size / (1024 * 1024 * 1024)
    ).toFixed(1) + " GB";

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
   ADD REALTIME MESSAGE
========================================= */

async function addRealtimeMessage(
    message
) {

    const alreadyExists =
        messagesCache.some(
            function (
                existing
            ) {

                return (
                    String(existing.id) ===
                    String(message.id)
                );

            }
        );


    if (alreadyExists) {
        return;
    }


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


        if (
            attachments.length > 0
        ) {

            break;

        }


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


    message.attachments =
        attachments;


    messagesCache.push(
        message
    );


    messagesCache.sort(
        function (
            a,
            b
        ) {

            return (
                new Date(a.created_at) -
                new Date(b.created_at)
            );

        }
    );


    const list =
        document.getElementById(
            "messagesWindow"
        );


    if (!list) {
        return;
    }


    const empty =
        list.querySelector(
            ".no-messages"
        );


    if (empty) {
        empty.remove();
    }


    list.appendChild(
        createMessageElement(
            message
        )
    );


    scrollToBottom();


    if (
        String(message.receiver_id) ===
        String(currentUser.id)
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
        button.disabled = true;
    }


    const filesToUpload =
        [...selectedAttachments];


    try {

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
                .select(`
                    id,
                    sender_id,
                    receiver_id,
                    message,
                    created_at,
                    read_at
                `)
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


            let viewUrl = null;


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


            let downloadUrl = null;


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


        messageData.attachments =
            uploadedAttachments;


        appendMessageToChat(
            messageData
        );


        input.value =
            "";

        resizeComposer();

        clearAttachments();

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
            button.disabled = false;
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


    const alreadyExists =
        messagesCache.some(
            function (
                existing
            ) {

                return (
                    String(existing.id) ===
                    String(message.id)
                );

            }
        );


    if (alreadyExists) {
        return;
    }


    messagesCache.push(
        message
    );


    messagesCache.sort(
        function (
            a,
            b
        ) {

            return (
                new Date(a.created_at) -
                new Date(b.created_at)
            );

        }
    );


    const empty =
        list.querySelector(
            ".no-messages"
        );


    if (empty) {
        empty.remove();
    }


    list.appendChild(
        createMessageElement(
            message
        )
    );


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

        messagesSupabase.removeChannel(
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
                            String(message.sender_id) ===
                            String(currentUser.id) &&
                            String(message.receiver_id) ===
                            String(conversationUserId)
                        )
                        ||
                        (
                            String(message.sender_id) ===
                            String(conversationUserId) &&
                            String(message.receiver_id) ===
                            String(currentUser.id)
                        );


                    if (!belongs) {
                        return;
                    }


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


    const readTime =
        new Date().toISOString();


    const {
        error
    } =
        await messagesSupabase
            .from("messages")
            .update({
                read_at: readTime
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
                    readTime;

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
        document.getElementById(
            "attachmentButton"
        );


    const attachmentInput =
        document.getElementById(
            "attachmentInput"
        );


    const cameraButton =
        document.getElementById(
            "cameraButton"
        );


    const cameraOverlay =
        document.getElementById(
            "cameraOverlay"
        );


    const cameraVideo =
        document.getElementById(
            "cameraVideo"
        );


    const cameraCanvas =
        document.getElementById(
            "cameraCanvas"
        );


    const cameraClose =
        document.getElementById(
            "cameraClose"
        );


    const cameraCapture =
        document.getElementById(
            "cameraCapture"
        );


    const backButton =
        document.querySelector(
            ".back-button"
        );


    /* =====================================
       SEND
    ===================================== */

    if (sendButton) {

        sendButton.addEventListener(
            "click",
            sendMessage
        );

    }


    /* =====================================
       TEXTAREA
    ===================================== */

    if (input) {

        input.addEventListener(
            "input",
            resizeComposer
        );

    }


    /* =====================================
       CAMERA
    ===================================== */

    if (
        cameraButton &&
        cameraOverlay
    ) {

        cameraButton.addEventListener(
            "click",
            openTweteCamera
        );

    }


    if (cameraClose) {

        cameraClose.addEventListener(
            "click",
            closeTweteCamera
        );

    }


    if (cameraCapture) {

        cameraCapture.addEventListener(
            "click",
            captureTwetePhoto
        );

    }


    /* =====================================
       ATTACHMENTS
    ===================================== */

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


    /* =====================================
       BACK
    ===================================== */

    if (backButton) {

        backButton.addEventListener(
            "click",
            goBack
        );

    }

}


/* =========================================
   CAMERA
========================================= */

async function openTweteCamera() {

    const overlay =
        document.getElementById(
            "cameraOverlay"
        );


    const video =
        document.getElementById(
            "cameraVideo"
        );


    if (
        !overlay ||
        !video
    ) {

        return;

    }


    if (
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ) {

        alert(
            "Camera access is not available on this device."
        );

        return;

    }


    try {

        if (cameraStream) {

            closeTweteCamera();

        }


        cameraStream =
            await navigator.mediaDevices.getUserMedia({

                video: {
                    facingMode: {
                        ideal: "environment"
                    }
                },

                audio: false

            });


        video.srcObject =
            cameraStream;


        overlay.hidden =
            false;


        document.body.classList.add(
            "camera-open"
        );


        await video.play();


    } catch (error) {

        console.error(
            "Camera error:",
            error
        );


        alert(
            "Could not access the camera."
        );

    }

}


/* =========================================
   CLOSE CAMERA
========================================= */

function closeTweteCamera() {

    if (cameraStream) {

        cameraStream
            .getTracks()
            .forEach(
                function (
                    track
                ) {

                    track.stop();

                }
            );


        cameraStream =
            null;

    }


    const video =
        document.getElementById(
            "cameraVideo"
        );


    const overlay =
        document.getElementById(
            "cameraOverlay"
        );


    if (video) {

        video.srcObject =
            null;

    }


    if (overlay) {

        overlay.hidden =
            true;

    }


    document.body.classList.remove(
        "camera-open"
    );

}


/* =========================================
   CAPTURE PHOTO
========================================= */

async function captureTwetePhoto() {

    const video =
        document.getElementById(
            "cameraVideo"
        );


    const canvas =
        document.getElementById(
            "cameraCanvas"
        );


    if (
        !video ||
        !canvas
    ) {

        return;

    }


    if (
        video.readyState <
        HTMLMediaElement.HAVE_CURRENT_DATA
    ) {

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

        return;

    }


    const MAX_SIZE =
        1920;


    let width =
        video.videoWidth;


    let height =
        video.videoHeight;


    if (
        !width ||
        !height
    ) {

        return;

    }


    if (
        width > MAX_SIZE ||
        height > MAX_SIZE
    ) {

        if (
            width > height
        ) {

            height =
                Math.round(
                    height *
                    MAX_SIZE /
                    width
                );

            width =
                MAX_SIZE;

        } else {

            width =
                Math.round(
                    width *
                    MAX_SIZE /
                    height
                );

            height =
                MAX_SIZE;

        }

    }


    canvas.width =
        width;


    canvas.height =
        height;


    const context =
        canvas.getContext(
            "2d"
        );


    if (!context) {
        return;
    }


    context.drawImage(
        video,
        0,
        0,
        width,
        height
    );


    const blob =
        await new Promise(
            function (
                resolve
            ) {

                canvas.toBlob(
                    resolve,
                    "image/jpeg",
                    0.82
                );

            }
        );


    if (!blob) {

        alert(
            "Could not process the photo."
        );

        return;

    }


    const file =
        new File(
            [blob],
            "twete-camera-" +
            Date.now() +
            ".jpg",
            {
                type:
                    "image/jpeg",

                lastModified:
                    Date.now()
            }
        );


    selectedAttachments.push(
        file
    );


    closeTweteCamera();


    renderAttachmentPreview();

}


/* =========================================
   CAMERA CLEANUP
========================================= */

window.addEventListener(
    "beforeunload",
    function () {

        closeTweteCamera();

    }
);


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
        new Date(value);


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
