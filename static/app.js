let mails = JSON.parse(document.getElementById("mails-data").textContent);
let groups = JSON.parse(document.getElementById("groups-data").textContent);
let grouped = document.body.dataset.grouped === "1";
let appliedTopK = Number(document.getElementById("top-k").value) || 100;
const colors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"];

const chooseFileEl = document.getElementById("choose-file");
const fileInputEl = document.getElementById("file-input");
const fileNameEl = document.getElementById("file-name");
const topKEl = document.getElementById("top-k");
const groupedToggleEl = document.getElementById("grouped-toggle");
const applyViewEl = document.getElementById("apply-view");
const listEl = document.getElementById("mail-list");
const treemapEl = document.getElementById("treemap");
const contentEl = document.getElementById("content");

const rows = [];
const tiles = [];
let selected = -1;

const sizeLabel = (size) => {
    if (size >= 1e6) return (size / 1e6).toFixed(1) + " MB";
    if (size >= 1e3) return (size / 1e3).toFixed(1) + " KB";
    return size + " B";
};

function squarify(values, x, y, w, h) {
    if (!values.length) return [];
    if (values.length === 1) return [{ x, y, w, h }];

    const total = values.reduce((a, b) => a + b, 0);
    let sum = 0;
    let split = 1;

    for (let i = 0; i < values.length; i++) {
        sum += values[i];

        if (sum >= total / 2) {
            split = i + 1;
            break;
        }
    }

    if (split >= values.length) split = values.length - 1;

    const left = values.slice(0, split);
    const right = values.slice(split);
    const ratio = left.reduce((a, b) => a + b, 0) / total;

    if (w >= h) {
        return [
            ...squarify(left, x, y, w * ratio, h),
            ...squarify(right, x + w * ratio, y, w * (1 - ratio), h),
        ];
    }

    return [
        ...squarify(left, x, y, w, h * ratio),
        ...squarify(right, x, y + h * ratio, w, h * (1 - ratio)),
    ];
}

function cell(text) {
    const td = document.createElement("td");
    td.textContent = text;
    td.title = text;
    return td;
}

function renderList() {
    listEl.textContent = "";
    rows.length = 0;

    mails.forEach((mail, i) => {
        const tr = document.createElement("tr");
        tr.append(cell(mail.subject), cell(mail.sender), cell(mail.date), cell(sizeLabel(mail.size)));
        tr.lastChild.style.textAlign = "right";
        tr.addEventListener("click", () => selectMail(i));
        listEl.appendChild(tr);
        rows.push(tr);
    });
}

function renderTreemap() {
    treemapEl.textContent = "";
    tiles.length = mails.length;

    if (grouped && groups.length) {
        const groupRects = squarify(groups.map((g) => g.totalSize), 0, 0, treemapEl.clientWidth, treemapEl.clientHeight);

        groupRects.forEach((groupRect, groupIdx) => {
            const group = groups[groupIdx];
            const groupEl = document.createElement("div");
            groupEl.className = "group";
            groupEl.style.left = groupRect.x + "px";
            groupEl.style.top = groupRect.y + "px";
            groupEl.style.width = Math.max(0, groupRect.w) + "px";
            groupEl.style.height = Math.max(0, groupRect.h) + "px";

            if (groupRect.w > 130 && groupRect.h > 26) {
                const label = document.createElement("div");
                label.className = "group-label";
                label.textContent = `${group.sender} (${sizeLabel(group.totalSize)})`;
                groupEl.appendChild(label);
            }

            const innerOffset = 2;
            const innerWidth = Math.max(0, groupRect.w - innerOffset * 2);
            const innerHeight = Math.max(0, groupRect.h - innerOffset * 2);
            const mailIndices = group.mailIndices;
            const mailSizes = mailIndices.map((mailIdx) => mails[mailIdx].size);
            const subRects = squarify(mailSizes, 0, 0, innerWidth, innerHeight);

            subRects.forEach((r, i) => {
                const mailIdx = mailIndices[i];
                const mail = mails[mailIdx];
                const tile = document.createElement("div");

                tile.className = "tile";
                tile.style.left = r.x + innerOffset + "px";
                tile.style.top = r.y + innerOffset + "px";
                tile.style.width = Math.max(0, r.w) + "px";
                tile.style.height = Math.max(0, r.h) + "px";
                tile.style.background = colors[group.colorIdx % colors.length];

                if (r.w > 60 && r.h > 30) {
                    const label = document.createElement("div");
                    label.className = "tile-label";

                    const subject = document.createElement("div");
                    subject.textContent = mail.subject;

                    const size = document.createElement("div");
                    size.className = "tile-size";
                    size.textContent = sizeLabel(mail.size);

                    label.append(subject, size);
                    tile.appendChild(label);
                } else if (r.w > 26 && r.h > 14) {
                    const size = document.createElement("div");
                    size.className = "tile-size";
                    size.textContent = sizeLabel(mail.size);
                    tile.appendChild(size);
                }

                if (mailIdx === selected) tile.classList.add("selected");

                tile.addEventListener("click", () => selectMail(mailIdx));

                groupEl.appendChild(tile);
                tiles[mailIdx] = tile;
            });

            treemapEl.appendChild(groupEl);
        });

        return;
    }

    const rects = squarify(mails.map((m) => m.size), 0, 0, treemapEl.clientWidth, treemapEl.clientHeight);

    rects.forEach((r, i) => {
        const mail = mails[i];
        const tile = document.createElement("div");

        tile.className = "tile";
        tile.style.left = r.x + 1 + "px";
        tile.style.top = r.y + 1 + "px";
        tile.style.width = Math.max(0, r.w - 2) + "px";
        tile.style.height = Math.max(0, r.h - 2) + "px";
        tile.style.background = colors[mail.colorIdx % colors.length];

        if (r.w > 60 && r.h > 30) {
            const label = document.createElement("div");
            label.className = "tile-label";

            const subject = document.createElement("div");
            subject.textContent = mail.subject;

            const size = document.createElement("div");
            size.className = "tile-size";
            size.textContent = sizeLabel(mail.size);

            label.append(subject, size);
            tile.appendChild(label);
        } else if (r.w > 26 && r.h > 14) {
            const size = document.createElement("div");
            size.className = "tile-size";
            size.textContent = sizeLabel(mail.size);
            tile.appendChild(size);
        }

        if (i === selected) tile.classList.add("selected");

        tile.addEventListener("click", () => selectMail(i));

        treemapEl.appendChild(tile);
        tiles[i] = tile;
    });
}

function selectMail(i) {
    rows[selected]?.classList.remove("selected");
    tiles[selected]?.classList.remove("selected");

    selected = i;
    rows[i]?.classList.add("selected");
    rows[i]?.scrollIntoView({ block: "nearest" });
    tiles[i]?.classList.add("selected");

    const m = mails[i];
    const header = `Subject: ${m.subject}\nFrom: ${m.sender}\nDate: ${m.date}\nSize: ${sizeLabel(m.size)}\n${"-".repeat(60)}\n\n`;

    contentEl.textContent = header + "Loading...";

    fetch(`/mail/${i}?grouped=${grouped ? 1 : 0}`)
        .then((r) => r.json())
        .then(({ body }) => {
            if (selected === i) contentEl.textContent = header + body;
        });
}

function setModeData(data) {
    mails = data.mails;
    groups = data.groups;
    grouped = data.grouped;

    selected = -1;
    contentEl.textContent = mails.length ? "Select a mail to view its content." : "Choose a file and click Apply.";
    renderList();
    renderTreemap();
}

chooseFileEl.addEventListener("click", () => {
    fileInputEl.click();
});

fileInputEl.addEventListener("change", () => {
    fileNameEl.textContent = fileInputEl.files[0]?.name || "No file selected";
});

applyViewEl.addEventListener("click", async () => {
    const nextGrouped = groupedToggleEl.checked;
    const selectedFile = fileInputEl.files[0];
    const topK = Number(topKEl.value) || 100;

    if (!selectedFile && mails.length === 0) {
        contentEl.textContent = "Choose a file and click Apply.";
        return;
    }

    if (!selectedFile && nextGrouped === grouped && topK === appliedTopK) return;

    contentEl.textContent = "Loading view...";
    treemapEl.textContent = "Loading view...";
    listEl.textContent = "";

    chooseFileEl.disabled = true;
    fileInputEl.disabled = true;
    topKEl.disabled = true;
    groupedToggleEl.disabled = true;
    applyViewEl.disabled = true;

    try {
        let response;

        if (selectedFile) {
            const formData = new FormData();
            formData.append("file", selectedFile);
            response = await fetch(`/load?grouped=${nextGrouped ? 1 : 0}&top_k=${topK}`, {
                method: "POST",
                body: formData,
            });
            fileInputEl.value = "";
        } else {
            response = await fetch(`/data?grouped=${nextGrouped ? 1 : 0}&top_k=${topK}`);
        }

        const data = await response.json();
        setModeData(data);
        appliedTopK = topK;
    } finally {
        groupedToggleEl.checked = grouped;
        chooseFileEl.disabled = false;
        fileInputEl.disabled = false;
        topKEl.disabled = false;
        groupedToggleEl.disabled = false;
        applyViewEl.disabled = false;
    }
});

renderList();
renderTreemap();
window.addEventListener("resize", renderTreemap);
