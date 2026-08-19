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

        await loadMessages();

        subscribeToMessages();

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

async function loadMessages() {

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
        Load messages
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


    /*
        Load attachments belonging
        to these messages.
    */

    const messageIds =
        (messages || []).map(
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
        Create temporary signed URLs
        for private Storage files.
    */

    for (
        const attachment of attachments
    ) {

        if (
            !attachment.file_path
        ) {
            continue;
        }


        /*
            View URL
        */

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
                    attachment.file_path,
                    3600
                );


        if (viewError) {

            console.error(
                "Signed URL error:",
                viewError
            );

            continue;

        }


        attachment.view_url =
            viewData?.signedUrl ||
            null;


        /*
            Download URL
        */

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
                    attachment.file_path,
                    3600,
                    {
                        download:
                            attachment.file_name
                    }
                );


        if (!downloadError) {

            attachment.download_url =
                downloadData?.signedUrl ||
                null;

        }

    }


    /*
        Attachments onto their messages
    */

    const attachmentsByMessage =
        {};


    attachments.forEach(
        function (attachment) {

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
        Add attachments to messages
    */

    (messages || []).forEach(
        function (message) {

            message.attachments =
                attachmentsByMessage[
                    message.id
                ] || [];

        }
    );


    renderMessages(
        messages || []
    );


    await markMessagesRead(
        messages || []
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


    messages.forEach(
        function (message) {

            const sent =
                String(
                    message.sender_id
                ) ===
                String(
                    currentUser.id
                );


            /*
                Row
            */

            const row =
                document.createElement(
                    "div"
                );

            row.className =
                sent
                    ? "message-row sent"
                    : "message-row received";


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
                TEXT
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
                ATTACHMENTS
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


                            /*
                                Clicking image opens
                                the full image.
                            */

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
                                "📄";


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
                            DOWNLOAD BUTTON
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
                                "noopener";


                            item.appendChild(
                                download
                            );

                        }


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
                TIME + CHECKS
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


            list.appendChild(
                row
            );

        }
    );


    scrollToBottom();

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

            requestAnimationFrame(
                function () {

                    list.scrollTop =
                        list.scrollHeight;

                }
            );

        }
    );

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
        Text OR attachments
        are enough to send.
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


    try {

        /*
            STEP 1
            Create message
        */

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
                    "id"
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


        /*
            STEP 2
            Upload attachments
        */

        for (
            let i = 0;
            i < selectedAttachments.length;
            i++
        ) {

            const file =
                selectedAttachments[i];


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


            /*
                STEP 3
                Save attachment metadata
            */

            const {
                error: attachmentError
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

                    });


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

        }


        /*
            STEP 4
            Clear composer
        */

        input.value =
            "";

        resizeComposer();

        clearAttachments();


        /*
            STEP 5
            Reload messages
        */

        await loadMessages();


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


                    if (!belongs) {
                        return;
                    }


                    await loadMessages();

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


        /*
            Enter creates a new line.
        */

        input.addEventListener(
            "keydown",
            function (event) {

                if (
                    event.key ===
                    "Enter"
                ) {

                    return;

                }

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
        ATTACHMENT BUTTON
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

                image.src =
                    URL.createObjectURL(
                        file
                    );

                image.alt =
                    file.name;

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

                video.src =
                    URL.createObjectURL(
                        file
                    );

                video.muted =
                    true;

                video.playsInline =
                    true;

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
                    "📄";

                item.appendChild(
                    icon
                );

            }


            /*
                Remove button
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
