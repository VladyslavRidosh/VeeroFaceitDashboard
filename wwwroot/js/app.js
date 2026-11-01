const $ = (id) => document.getElementById(id);
const fallback = "—";

function setText(id, value, suffix = "") {
  $(id).textContent = value === null || value === undefined || value === "" ? fallback : `${value}${suffix}`;
}

function formatDate(value) {
  if (!value) return "DATE UNAVAILABLE";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "DATE UNAVAILABLE";
  return date.toLocaleDateString("ru-RU", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
}

function renderMatches(matches) {
  const host = $("matches-list");
  if (!matches || matches.length === 0) {
    host.innerHTML = '<div class="empty-state">NO RECENT MATCH DATA AVAILABLE</div>';
    return;
  }

  host.replaceChildren();
  for (const match of matches) {
    const isWin = match.result?.toLowerCase() === "faction1" || match.result?.toLowerCase() === "faction2";
    const row = document.createElement("div");
    row.className = "match-row";

    const result = document.createElement("div");
    result.className = `match-result ${isWin ? "win" : ""}`;
    result.textContent = match.result && match.result !== "unknown" ? match.result.toUpperCase() : "MATCH";

    const info = document.createElement("div");
    const name = document.createElement("div");
    name.className = "match-name";
    name.textContent = match.opponent || "FACEIT MATCH";
    const map = document.createElement("div");
    map.className = "match-map";
    map.textContent = match.map || "MAP NOT PROVIDED";
    info.append(name, map);

    const score = document.createElement("div");
    score.className = "match-score";
    score.textContent = match.score || "—";

    const date = document.createElement("div");
    date.className = "match-date";
    date.textContent = formatDate(match.finishedAt);

    row.append(result, info, score, date);
    host.append(row);
  }
}

async function loadDashboard(force = false) {
  const button = $("refresh");
  const notice = $("notice");
  button.disabled = true;
  button.textContent = "…";
  notice.hidden = true;

  try {
    const response = await fetch(`/api/dashboard${force ? "?refresh=true" : ""}`, { cache: "no-store" });
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.detail || data.title || "Не удалось загрузить статистику.");
    }

    setText("nickname", data.nickname);
    $("nickname").innerHTML = "";
    $("nickname").append(document.createTextNode((data.nickname || "VEERO").toUpperCase()));
    const period = document.createElement("span");
    period.className = "hero-period";
    period.textContent = ".";
    $("nickname").append(period);

    if (data.avatar) $("avatar").src = data.avatar;
    setText("country", data.country ? `COUNTRY ${data.country.toUpperCase()}` : null);
    setText("region", data.region ? `REGION ${data.region.toUpperCase()}` : null);
    setText("membership", data.membership ? data.membership.toUpperCase() : null);
    setText("elo", data.elo);
    setText("level", data.level);
    setText("level-badge", data.level !== null ? `LVL ${data.level}` : null);
    setText("winrate", data.winRate, data.winRate && !String(data.winRate).includes("%") ? "%" : "");
    setText("kd", data.averageKd);
    setText("hs", data.headshots, data.headshots && !String(data.headshots).includes("%") ? "%" : "");
    setText("matches", data.matches);
    $("level-progress").style.width = data.level ? `${Math.max(0, Math.min(10, Number(data.level))) * 10}%` : "0%";
    $("updated").textContent = `UPDATED ${new Date(data.updatedAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
    renderMatches(data.recentMatches);
  } catch (error) {
    notice.textContent = error.message;
    notice.hidden = false;
    if ($("matches-list").children.length === 0) {
      $("matches-list").innerHTML = '<div class="empty-state">WAITING FOR FACEIT API CONNECTION</div>';
    }
    $("updated").textContent = "DATA UNAVAILABLE";
  } finally {
    button.disabled = false;
    button.textContent = "↻";
  }
}

$("refresh").addEventListener("click", () => loadDashboard(true));
loadDashboard();
setInterval(() => loadDashboard(false), 5 * 60 * 1000);
