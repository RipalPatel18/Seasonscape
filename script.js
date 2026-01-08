const calendarContainer = document.getElementById("calendar");
const fxLayer = document.getElementById("fxLayer");

const currentMonthYearEl = document.getElementById("currentMonthYear");
const seasonLabelEl = document.getElementById("seasonLabel");
const seasonModeEl = document.getElementById("seasonMode");
const seasonBarFill = document.getElementById("seasonBarFill");

const calendarDaysEl = document.getElementById("calendarDays");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

const today = new Date();
let viewYear = today.getFullYear();
let viewMonth = today.getMonth();

const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

// seasons
function getSeasonByMonth(monthIndex) {
    if (monthIndex >= 2 && monthIndex <= 4) return "spring";
    if (monthIndex >= 5 && monthIndex <= 7) return "summer";
    if (monthIndex >= 8 && monthIndex <= 10) return "autumn";
    return "winter";
}

function resolveSeason() {
    const mode = seasonModeEl.value;
    return mode === "auto" ? getSeasonByMonth(viewMonth) : mode;
}

function setSeasonUI(season) {
    calendarContainer.classList.remove("season-spring", "season-summer", "season-autumn", "season-winter");
    calendarContainer.classList.add(`season-${season}`);

    const nice = season.charAt(0).toUpperCase() + season.slice(1);
    seasonLabelEl.textContent = seasonModeEl.value === "auto" ? `Auto • ${nice}` : nice;

    // season progress across 3-month blocks (1..100%)
    const seasonStartMonth = (season === "spring") ? 2 : (season === "summer") ? 5 : (season === "autumn") ? 8 : 11;
    // winter spans Dec(11),Jan(0),Feb(1)
    let indexInSeason;
    if (season !== "winter") {
        indexInSeason = viewMonth - seasonStartMonth; // 0..2
    } else {
        indexInSeason = (viewMonth === 11) ? 0 : (viewMonth === 0) ? 1 : 2;
    }
    const pct = [22, 55, 88][Math.max(0, Math.min(2, indexInSeason))];
    seasonBarFill.style.width = `${pct}%`;

    startFxForSeason(season);
}

// FX
let fxTimer = null;
function clearFx() {
    if (fxTimer) clearInterval(fxTimer);
    fxTimer = null;
    fxLayer.innerHTML = "";
}

function spawnFx(type, densityPerSecond) {
    const interval = Math.max(50, Math.floor(1000 / densityPerSecond));
    fxTimer = setInterval(() => {
        const el = document.createElement("div");
        el.className = `fx ${type}`;

        const left = Math.random() * 100;
        const size = Math.random() * 7 + 6;       // 6-13px
        const duration = Math.random() * 6 + 7;   // 7-13s
        const delay = Math.random() * 0.6;

        const drift = (Math.random() * 120 - 60).toFixed(0) + "px";
        const spin = (Math.random() * 360 - 180).toFixed(0) + "deg";

        el.style.left = `${left}vw`;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.animationDuration = `${duration}s`;
        el.style.animationDelay = `${delay}s`;
        el.style.setProperty("--drift", drift);
        el.style.setProperty("--spin", spin);

        fxLayer.appendChild(el);
        setTimeout(() => el.remove(), (duration + delay) * 1000);
    }, interval);
}

function startFxForSeason(season) {
    clearFx();
    if (season === "winter") spawnFx("snow", 16);
    if (season === "spring") spawnFx("petal", 9);
    if (season === "summer") spawnFx("sun", 6);
    if (season === "autumn") spawnFx("leaf", 11);
}

// flip card day
function createDayButton(dayNumber, isToday, isWeekend) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "day";
    btn.setAttribute("role", "gridcell");
    btn.setAttribute("aria-label", `Day ${dayNumber}`);

    if (isToday) btn.classList.add("today");
    if (isWeekend) btn.classList.add("weekend");

    const inner = document.createElement("div");
    inner.className = "day-inner";

    const front = document.createElement("div");
    front.className = "face front";
    const num = document.createElement("div");
    num.className = "num";
    num.textContent = dayNumber;
    front.appendChild(num);

    const back = document.createElement("div");
    back.className = "face back";
    back.setAttribute("aria-hidden", "true");

    inner.appendChild(front);
    inner.appendChild(back);
    btn.appendChild(inner);

    // tiny click pop
    btn.addEventListener("click", () => {
        btn.animate(
            [{ transform: "scale(1)" }, { transform: "scale(0.985)" }, { transform: "scale(1)" }],
            { duration: 160, easing: "ease-out" }
        );
    });

    return btn;
}

// month transition
let lastDirection = "next"; // next | prev

function animateOut(direction) {
    calendarDaysEl.classList.remove("slide-left", "slide-right");
    calendarDaysEl.classList.add(direction === "next" ? "slide-left" : "slide-right");
}

function animateIn() {
    // reset to neutral after a tick
    requestAnimationFrame(() => {
        calendarDaysEl.classList.remove("slide-left", "slide-right");
    });
}

function renderCalendar({ animate = false } = {}) {
    if (animate) animateOut(lastDirection);

    const doRender = () => {
        calendarDaysEl.innerHTML = "";
        currentMonthYearEl.textContent = `${monthNames[viewMonth]} ${viewYear}`;

        const season = resolveSeason();
        setSeasonUI(season);

        const firstDay = new Date(viewYear, viewMonth, 1);
        const lastDay = new Date(viewYear, viewMonth + 1, 0);

        const daysInMonth = lastDay.getDate();
        const startWeekday = firstDay.getDay(); 

        // leading blanks
        for (let i = 0; i < startWeekday; i++) {
            const blank = document.createElement("div");
            blank.className = "day other-month";
            blank.setAttribute("aria-hidden", "true");
            calendarDaysEl.appendChild(blank);
        }

        // days
        for (let d = 1; d <= daysInMonth; d++) {
            const isToday =
                viewYear === today.getFullYear() &&
                viewMonth === today.getMonth() &&
                d === today.getDate();

            // weekday for this date
            const weekday = new Date(viewYear, viewMonth, d).getDay();
            const isWeekend = (weekday === 0 || weekday === 6);

            const dayBtn = createDayButton(d, isToday, isWeekend);
            calendarDaysEl.appendChild(dayBtn);
        }

        
        const totalCells = startWeekday + daysInMonth;
        const remaining = (7 - (totalCells % 7)) % 7;

        for (let i = 0; i < remaining; i++) {
            const blank = document.createElement("div");
            blank.className = "day other-month";
            blank.setAttribute("aria-hidden", "true");
            calendarDaysEl.appendChild(blank);
        }

        const nowCells = calendarDaysEl.children.length;
        if (nowCells < 42) {
            for (let i = 0; i < 42 - nowCells; i++) {
                const blank = document.createElement("div");
                blank.className = "day other-month";
                blank.setAttribute("aria-hidden", "true");
                calendarDaysEl.appendChild(blank);
            }
        }

        animateIn();
    };

    if (!animate) {
        doRender();
    } else {
        // render after the out-transition starts
        setTimeout(doRender, 160);
    }
}

function goPrevMonth() {
    lastDirection = "prev";
    viewMonth--;
    if (viewMonth < 0) { viewMonth = 11; viewYear--; }
    renderCalendar({ animate: true });
}

function goNextMonth() {
    lastDirection = "next";
    viewMonth++;
    if (viewMonth > 11) { viewMonth = 0; viewYear++; }
    renderCalendar({ animate: true });
}

prevMonthBtn.addEventListener("click", goPrevMonth);
nextMonthBtn.addEventListener("click", goNextMonth);

document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") goPrevMonth();
    if (e.key === "ArrowRight") goNextMonth();
});

seasonModeEl.addEventListener("change", () => renderCalendar({ animate: false }));

document.addEventListener("DOMContentLoaded", () => renderCalendar({ animate: false }));
