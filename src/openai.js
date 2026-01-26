const BUTTON_ID = "bulk-delete-btn";

async function injectOpenAIButton() {
  const injectionPoint = await new Promise((resolve) => {
    const check = () => {
      const item = document.getElementsByClassName(
        "group\/sidebar-expando-section",
      )[0];
      if (item) return resolve(item);
      requestAnimationFrame(check);
    };
    check();
  });

  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.className =
    "block mx-auto m-2.5 p-2 rounded-full border-2 border-[#444] bg-transparent text-[#e3e3e3] cursor-pointer text-xs";

  btn.innerHTML = `
  <div class="flex items-center justify-center gap-1.5">
    <div class="flex items-center justify-center icon">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" aria-hidden="true" class="icon">
          <use href="/cdn/assets/sprites-core-k5zux585.svg#3ee541" fill="currentColor"></use>
      </svg>
    </div>
    <span>Bulk Delete Chats</span>
  </div>
  `;

  btn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();

    toggleOpenAIBulkDelete();
  });

  injectionPoint.prepend(btn);
}

let checkboxesVisible = false;

function toggleOpenAIBulkDelete() {
  const chats = document.querySelectorAll('nav a[href^="/c/"]');
  checkboxesVisible = !checkboxesVisible;

  chats.forEach((chat) => {
    let cb = chat.querySelector(".bulk-delete-checkbox");

    if (!cb && checkboxesVisible) {
      cb = document.createElement("input");
      cb.type = "checkbox";
      cb.className = "bulk-delete-checkbox";
      cb.style.marginRight = "10px";
      cb.style.cursor = "pointer";
      cb.style.flexShrink = "0";

      cb.onclick = (e) => e.stopPropagation();
      chat.prepend(cb);
    }

    if (cb) {
      cb.style.display = checkboxesVisible ? "inline-block" : "none";
      if (!checkboxesVisible) cb.checked = false;
    }
  });
  renderOpenAIControlPanel();
}

function renderOpenAIControlPanel() {
  let controls = document.getElementById("bulk-delete-controls");
  if (!checkboxesVisible) {
    if (controls) controls.remove();
    return;
  }

  if (controls) return;

  controls = document.createElement("div");
  controls.id = "bulk-delete-controls";
  controls.className = "flex flex-col px-4 py-2 gap-2 border-b border-white/20";

  const btnStyle = "text-center text-sm py-1 transition";
  controls.innerHTML = `
    <button id="bd-toggle-select" class="${btnStyle}">Select All</button>
    <div class="flex gap-4 justify-center">
      <button id="bd-cancel" class="${btnStyle} text-gray-400">Cancel</button>
      <button id="bd-run-delete" class="${btnStyle} text-red-500 font-bold">Delete</button>
    </div>
  `;

  document.getElementById(BUTTON_ID).after(controls);

  document.getElementById("bd-toggle-select").onclick = () => {
    const isSelectAll =
      document.getElementById("bd-toggle-select").textContent === "Select All";

    if (isSelectAll) {
      document.getElementById("bd-toggle-select").textContent = "Select None";
    } else {
      document.getElementById("bd-toggle-select").textContent = "Select All";
    }

    document
      .querySelectorAll(".bulk-delete-checkbox")
      .forEach((c) => (c.checked = isSelectAll));
  };

  document.getElementById("bd-run-delete").onclick = runOpenAIBulkDelete;
  document.getElementById("bd-cancel").onclick = toggleOpenAIBulkDelete;
}

async function getOpenAIAccessToken() {
  try {
    const response = await fetch("https://chatgpt.com/api/auth/session");
    const data = await response.json();
    return data.accessToken;
  } catch (err) {
    console.error("Failed to get access token:", err);
    return null;
  }
}

async function runOpenAIBulkDelete() {
  const selectedCbs = [
    ...document.querySelectorAll(".bulk-delete-checkbox:checked"),
  ];
  if (selectedCbs.length === 0) return alert("Select some chats first!");
  if (!confirm(`Delete ${selectedCbs.length} chats?`)) return;

  const token = await getOpenAIAccessToken();
  if (!token) return alert("Could not find session token. Are you logged in?");

  // Change button state to show progress
  const runBtn = document.getElementById("bd-run-delete");
  runBtn.textContent = "Deleting...";
  runBtn.disabled = true;

  for (const cb of selectedCbs) {
    const chatLink = cb.closest("a");
    if (!chatLink) continue;

    // Extract the UUID from the href (e.g., /c/12345-abcd-...)
    const url = new URL(chatLink.href);
    const chatId = url.pathname.split("/").pop();

    try {
      const res = await fetch(
        `https://chatgpt.com/backend-api/conversation/${chatId}`,
        {
          method: "PATCH",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ is_visible: false }), // This is how ChatGPT "deletes" chats
        },
      );

      if (res.ok) {
        chatLink.style.opacity = "0.3"; // Visual feedback
        console.log(`Deleted: ${chatId}`);
      }
    } catch (err) {
      console.error(`Failed to delete ${chatId}:`, err);
    }

    // Tiny delay to avoid rate limiting
    await new Promise((r) => setTimeout(r, 200));
  }

  alert("Bulk delete finished. Refreshing to update list...");
  location.reload();
}

// Re-inject if ChatGPT rerenders sidebar
const observer = new MutationObserver(injectOpenAIButton);
observer.observe(document.body, { childList: true, subtree: true });

injectOpenAIButton();
