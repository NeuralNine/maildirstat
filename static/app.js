const mails = JSON.parse(document.getElementById("mails-data").textContent);
const colors = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2", "#59a14f", "#edc948", "#b07aa1", "#ff9da7", "#9c755f", "#bab0ac"];

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
    tiles.length = 0;

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
        tiles.push(tile);
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

    fetch(`/mail/${i}`)
        .then((r) => r.json())
        .then(({ body }) => {
            if (selected === i) contentEl.textContent = header + body;
        });
}

renderList();
renderTreemap();
window.addEventListener("resize", renderTreemap);
