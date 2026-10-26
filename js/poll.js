/* ===== QUICK POLL: one vote per browser/account ===== */

let pollData = null;

async function initPoll() {
  await loadPoll();
}

async function loadPoll() {
  try {
    pollData = await api("/poll?voter=" + encodeURIComponent(getVoterId()));
  } catch (e) {
    pollData = {
      question: SETTINGS.pollQuestion,
      options: SETTINGS.pollOptions,
      counts: SETTINGS.pollOptions.map(() => 0),
      total: 0,
      myVote: null
    };
  }
  renderPoll();
}

function renderPoll() {
  const box = $("#poll");
  if (!box || !pollData) return;
  const { question, options, counts, total, myVote } = pollData;
  const max = Math.max(1, ...counts);
  box.innerHTML = `
    <p class="poll-q">${esc(question)}</p>
    <div class="poll-options">
      ${options.map((option, i) => {
        const pct = total ? Math.round((counts[i] / total) * 100) : 0;
        const width = total ? Math.round((counts[i] / max) * 100) : 0;
        const chosen = myVote === i;
        return `
          <div class="poll-opt ${chosen ? "chosen" : ""}">
            <button class="poll-btn" ${myVote !== null ? "disabled" : ""} onclick="vote(${i})">
              <span class="poll-name">${chosen ? "✓ " : ""}${esc(option)}</span>
              ${myVote !== null ? `<span class="poll-pct">${pct}%</span>` : '<span class="poll-cta">Vote</span>'}
            </button>
            ${myVote !== null ? `<div class="bar"><i style="width:${width}%"></i></div>` : ""}
          </div>`;
      }).join("")}
    </div>
    <div class="poll-foot">
      <span>${total} vote${total === 1 ? "" : "s"} so far</span>
      ${myVote !== null
        ? '<span class="poll-thanks">Thanks for voting! 🎉</span>'
        : '<span class="muted">Pick one — one vote per browser.</span>'}
    </div>`;
}

async function vote(index) {
  if (!pollData || pollData.myVote !== null) return;
  try {
    const data = await api("/poll/vote", {
      method: "POST",
      body: { option: index, voter: getVoterId() }
    });
    pollData = data;
    renderPoll();
    toast("Vote recorded. Thank you!", "success", 2200);
  } catch (e) {
    toast(e.message, "error");
    await loadPoll();
  }
}
