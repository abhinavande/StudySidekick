
const chatForm = document.getElementById("chat-form");
const userInput = document.getElementById("user-input");
const chatMessages = document.getElementById("chat-messages");

// Safely format basic Markdown from the AI
function renderMarkdown(container, markdown) {
    const lines = markdown.split("\n");
    let list = null;
    let codeLines = [];
    let inCode = false;

    function addInlineText(parent, text) {
        const pattern = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
        let lastIndex = 0;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            parent.appendChild(
                document.createTextNode(text.slice(lastIndex, match.index))
            );

            const token = match[0];
            const element = document.createElement(
                token.startsWith("**") ? "strong" :
                token.startsWith("`") ? "code" : "em"
            );

            element.textContent = token.startsWith("**")
                ? token.slice(2, -2)
                : token.slice(1, -1);

            parent.appendChild(element);
            lastIndex = pattern.lastIndex;
        }

        parent.appendChild(
            document.createTextNode(text.slice(lastIndex))
        );
    }

    function closeList() {
        if (list) {
            container.appendChild(list);
            list = null;
        }
    }

    for (const line of lines) {
        if (line.trim().startsWith("```")) {
            closeList();

            if (inCode) {
                const pre = document.createElement("pre");
                const code = document.createElement("code");
                code.textContent = codeLines.join("\n");
                pre.appendChild(code);
                container.appendChild(pre);
                codeLines = [];
                inCode = false;
            } else {
                inCode = true;
            }

            continue;
        }

        if (inCode) {
            codeLines.push(line);
            continue;
        }

        const heading = line.match(/^(#{1,3})\s+(.+)$/);

        if (heading) {
            closeList();
            const h = document.createElement(
                "h" + heading[1].length
            );
            addInlineText(h, heading[2]);
            container.appendChild(h);
            continue;
        }

        const listItem = line.match(/^\s*[-*]\s+(.+)$/);

        if (listItem) {
            if (!list) {
                list = document.createElement("ul");
            }

            const li = document.createElement("li");
            addInlineText(li, listItem[1]);
            list.appendChild(li);
            continue;
        }

        closeList();

        if (line.trim() === "" || /^\s*---+\s*$/.test(line)) {
            continue;
        }

        const paragraph = document.createElement("p");
        addInlineText(paragraph, line);
        container.appendChild(paragraph);
    }

    if (inCode) {
        const pre = document.createElement("pre");
        const code = document.createElement("code");
        code.textContent = codeLines.join("\n");
        pre.appendChild(code);
        container.appendChild(pre);
    }

    closeList();
}

chatForm.addEventListener("submit", async function(event) {
    event.preventDefault();

    const message = userInput.value.trim();
    if (!message) return;

    const userMessage = document.createElement("p");
    userMessage.textContent = "You: " + message;
    chatMessages.appendChild(userMessage);

    userInput.value = "";

    const reply = document.createElement("div");
    reply.textContent = "StudySidekick: Thinking...";
    chatMessages.appendChild(reply);

    try {
        const response = await fetch("/api/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ message: message })
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || "Request failed");
        }

        reply.replaceChildren();

        const label = document.createElement("strong");
        label.textContent = "StudySidekick:";
        reply.appendChild(label);

        const formattedReply = document.createElement("div");
        formattedReply.className = "markdown-reply";

        renderMarkdown(
            formattedReply,
            data.reply || "I couldn't generate a reply."
        );

        reply.appendChild(formattedReply);

    } catch (error) {
        console.error("Chat error:", error);
        reply.textContent =
            "StudySidekick: Sorry, I couldn't connect. Please try again.";
    }
});
 

const plannerForm = document.getElementById("planner-form");
const subjectsInput = document.getElementById("subjects");
const difficultSubjectInput = document.getElementById("difficult-subject");
const studyTimeInput = document.getElementById("study-time");
const studyPlan = document.getElementById("study-plan");

plannerForm.addEventListener("submit", function(event) {
    event.preventDefault();

    const subjects = subjectsInput.value
        .split(",")
        .map(subject => subject.trim())
        .filter(subject => subject !== "");

    const difficultSubject = difficultSubjectInput.value.trim().toLowerCase();
    const totalMinutes = Number(studyTimeInput.value);

    if (subjects.length === 0 || totalMinutes < 15) {
        studyPlan.textContent = "Please enter subjects and at least 15 minutes.";
        return;
    }

    const difficultIndex = subjects.findIndex(
        subject => subject.toLowerCase() === difficultSubject
    );

    if (difficultIndex === -1) {
        studyPlan.textContent =
            "Enter the hardest subject exactly as it appears in your subject list.";
        return;
    }

    // Reserve half the time for the hardest subject.
    const difficultMinutes = Math.floor(totalMinutes / 2);
    const remainingMinutes = totalMinutes - difficultMinutes;

    const otherSubjects = subjects.filter(
        (_, index) => index !== difficultIndex
    );

    const baseMinutes = otherSubjects.length > 0
        ? Math.floor(remainingMinutes / otherSubjects.length)
        : 0;

    const extraMinutes = otherSubjects.length > 0
        ? remainingMinutes % otherSubjects.length
        : 0;

    const heading = document.createElement("h3");
    heading.textContent = "Your Smart Study Plan";

    const tip = document.createElement("p");
    tip.textContent = "Extra focus on your hardest subject: " +
        subjects[difficultIndex];

    const list = document.createElement("ul");

    subjects.forEach(function(subject, index) {
        let minutes;

        if (index === difficultIndex) {
            minutes = difficultMinutes;
        } else {
            const otherIndex = otherSubjects.indexOf(subject);
            minutes = baseMinutes + (otherIndex < extraMinutes ? 1 : 0);
        }

        const item = document.createElement("li");
        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";

        const label = document.createElement("label");
        label.appendChild(checkbox);
        label.appendChild(
            document.createTextNode(" " + subject + " — " + minutes + " minutes")
        );

        item.appendChild(label);
        list.appendChild(item);
    });

    studyPlan.replaceChildren(heading, tip, list);

    const progressText = document.getElementById("progress-text");
    const progressFill = document.getElementById("progress-fill");

    function updateProgress() {
        const checkboxes = list.querySelectorAll('input[type="checkbox"]');
        const completed = list.querySelectorAll(
            'input[type="checkbox"]:checked'
        ).length;

        const percentage = checkboxes.length === 0
            ? 0
            : Math.round((completed / checkboxes.length) * 100);

        progressText.textContent = `Progress: ${percentage}%`;
        progressFill.style.width = percentage + "%";
    }

    list.addEventListener("change", updateProgress);
    updateProgress();
});
