
const $ = (id) => document.getElementById(id);

const fallback = "—";
let dashboardData = null;

function setText(id, value, suffix = "") {
    const element = $(id);

    if (!element) return;

    element.textContent =
        value === null || value === undefined || value === ""
            ? fallback
            : `${value}${suffix}`;
}

function getNumber(value) {
    if (value === null || value === undefined) return 0;

    const parsed = Number(String(value).replace("%", "").replace(",", "."));

    return Number.isFinite(parsed) ? parsed : 0;
}

function animateNumber(element, value, suffix = "") {
    if (!element) return;

    const target = getNumber(value);

    if (value === null || value === undefined || value === "") {
        element.textContent = fallback;
        return;
    }

    const start = performance.now();
    const duration = 1100;

    function update(now) {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        const current = target * eased;

        element.textContent =
            `${Number(current.toFixed(2)).toLocaleString("ru-RU")}${suffix}`;

        if (progress < 1) {
            requestAnimationFrame(update);
        }
    }

    requestAnimationFrame(update);
}

function setProgress(id, value, max = 100) {
    const element = $(id);

    if (!element) return;

    const percentage = Math.max(
        0,
        Math.min(100, (getNumber(value) / max) * 100)
    );

    requestAnimationFrame(() => {
        element.style.width = `${percentage}%`;
    });
}

/* PAGE LOADER */

function initializeLoader() {
    const loader = $("pageLoader");

    if (!loader) return;

    window.addEventListener("load", () => {
        setTimeout(() => {
            loader.classList.add("loaded");
        }, 500);
    });

    setTimeout(() => {
        loader.classList.add("loaded");
    }, 2500);
}

/* PARTICLES */

function createParticles() {
    const container = $("particles");

    if (!container) return;

    container.replaceChildren();

    for (let i = 0; i < 35; i++) {
        const particle = document.createElement("span");

        particle.className = "particle";
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.animationDuration = `${7 + Math.random() * 12}s`;
        particle.style.animationDelay = `${Math.random() * 10}s`;
        particle.style.opacity = `${0.2 + Math.random() * 0.5}`;

        const size = 1 + Math.random() * 3;

        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;

        container.appendChild(particle);
    }
}

/* WEAPON MOVEMENT */

function initializeWeapon() {
    const stage = $("weaponStage");
    const weapon = $("weaponArt");

    if (!stage || !weapon) return;

    const supportsHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    if (!supportsHover) return;

    stage.addEventListener("mousemove", (event) => {
        const rect = stage.getBoundingClientRect();

        const x = (event.clientX - rect.left) / rect.width;
        const y = (event.clientY - rect.top) / rect.height;

        const rotateY = (x - 0.5) * 13;
        const rotateX = (0.5 - y) * 9;

        weapon.style.animation = "none";

        weapon.style.transform = `
            translateY(-5px)
            rotateX(${rotateX}deg)
            rotateY(${rotateY}deg)
            scale(1.035)
        `;
    });

    stage.addEventListener("mouseleave", () => {
        weapon.style.transform = "";
        weapon.style.animation = "";
    });
}

/* SCROLL ANIMATIONS */

function initializeScrollAnimations() {
    const elements = document.querySelectorAll(
        ".stat-card, .data-panel, .section-heading"
    );

    if (!("IntersectionObserver" in window)) return;

    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add("visible");
                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12
    });

    elements.forEach((element) => {
        element.classList.add("reveal");
        observer.observe(element);
    });
}

/* MATCHES */

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleDateString("ru-RU", {
        day: "2-digit",
        month: "short"
    }).toUpperCase();
}

function renderMatches(matches) {
    const host = $("matchesList");

    if (!host) return;

    if (!matches || matches.length === 0) {
        host.innerHTML = `
            <div class="empty-state">
                NO RECENT MATCH DATA AVAILABLE
            </div>
        `;
        return;
    }

    host.replaceChildren();

    matches.forEach((match, index) => {
        const row = document.createElement("div");
        row.className = "match-row";
        row.style.animationDelay = `${index * 70}ms`;

        const result = document.createElement("div");
        result.className = "match-result neutral";

        const rawResult = String(match.result || "").toLowerCase();

        if (rawResult === "win") {
            result.textContent = "WIN";
            result.className = "match-result win";
        } else if (rawResult === "loss") {
            result.textContent = "LOSS";
            result.className = "match-result loss";
        } else {
            result.textContent = "MATCH";
        }

        const opponent = document.createElement("div");
        opponent.className = "match-name";
        opponent.textContent = match.opponent || "FACEIT MATCH";

        const map = document.createElement("div");
        map.className = "match-map";
        map.textContent = match.map || "—";

        const score = document.createElement("div");
        score.className = "match-score";
        score.textContent = match.score || "—";

        const date = document.createElement("div");
        date.className = "match-date";
        date.textContent = formatDate(match.finishedAt);

        row.append(result, opponent, map, score, date);
        host.appendChild(row);
    });
}

/* DASHBOARD */

function renderDashboard(data) {
    dashboardData = data;

    const nickname = $("nickname");

    if (nickname) {
        nickname.textContent = (data.nickname || "VEERO").toUpperCase();
    }

    if (data.avatar && $("playerAvatar")) {
        $("playerAvatar").src = data.avatar;
    }

    animateNumber($("elo"), data.elo);
    animateNumber($("levelText"), data.level, "");

    if ($("levelText")) {
        $("levelText").textContent =
            data.level !== null && data.level !== undefined
                ? `LEVEL ${data.level}`
                : "LEVEL —";
    }

    animateNumber($("winRate"), data.winRate,
        data.winRate !== null && data.winRate !== undefined &&
        !String(data.winRate).includes("%") ? "%" : "");

    animateNumber($("kd"), data.averageKd);

    animateNumber($("headshots"), data.headshots,
        data.headshots !== null && data.headshots !== undefined &&
        !String(data.headshots).includes("%") ? "%" : "");

    animateNumber($("totalMatches"), data.matches);

    setProgress("levelProgress", data.level, 10);
    setProgress("winRateBar", data.winRate, 100);
    setProgress("kdBar", data.averageKd, 3);
    setProgress("headshotsBar", data.headshots, 100);

    renderMatches(data.recentMatches);

    if (data.updatedAt && $("updated")) {
        const date = new Date(data.updatedAt);

        $("updated").textContent = Number.isNaN(date.getTime())
            ? "DATA UPDATED"
            : `UPDATED ${date.toLocaleTimeString("ru-RU", {
                hour: "2-digit",
                minute: "2-digit"
            })}`;
    }
}

async function loadDashboard(force = false) {
    const button = $("refreshButton");
    const notice = $("toast");

    if (button) {
        button.disabled = true;
        button.innerHTML = "<span>↻</span> LOADING";
    }

    if (notice) {
        notice.hidden = true;
        notice.textContent = "";
    }

    try {
        const response = await fetch(
            `/api/dashboard${force ? "?refresh=true" : ""}`,
            { cache: "no-store" }
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.detail || data.title || "Не удалось загрузить статистику."
            );
        }

        renderDashboard(data);

    } catch (error) {
        console.error("FACEIT dashboard error:", error);

        if (notice) {
            notice.textContent = error.message;
            notice.hidden = false;
        }

        if ($("updated")) {
            $("updated").textContent = "DATA UNAVAILABLE";
        }

    } finally {
        if (button) {
            button.disabled = false;
            button.innerHTML = "<span>↻</span> REFRESH";
        }
    }
}

/* REFRESH BUTTON */

function initializeRefresh() {
    const button = $("refreshButton");

    if (!button) return;

    button.addEventListener("click", () => {
        loadDashboard(true);
    });
}

/* NAVIGATION */

function initializeNavigation() {
    document.querySelectorAll(".nav-link").forEach((link) => {
        link.addEventListener("click", () => {
            document.querySelectorAll(".nav-link").forEach((item) => {
                item.classList.remove("active");
            });

            link.classList.add("active");
        });
    });
}

/* START */

document.addEventListener("DOMContentLoaded", () => {
    initializeLoader();
    createParticles();
    initializeWeapon();
    initializeScrollAnimations();
    initializeRefresh();
    initializeNavigation();

    loadDashboard();

    setInterval(() => {
        loadDashboard(false);
    }, 5 * 60 * 1000);
});
