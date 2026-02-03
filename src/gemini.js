const BUTTON_ID = "bulk-delete-btn";

async function injectGeminiButton() {
  const injectionPoint = await new Promise((resolve) => {
    const check = () => {
      const item = document.querySelector("conversations-list");
      if (item) return resolve(item);
      requestAnimationFrame(check);
    };
    check();
  });

  if (document.getElementById(BUTTON_ID)) return;

  const btn = document.createElement("button");
  btn.id = BUTTON_ID;
  btn.style.cssText =
    "margin: 10px; padding: 8px; border-radius: 20px; border: 1px solid #444; background: transparent; color: #e3e3e3; cursor: pointer; font-size: 12px;";
  btn.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: center; gap: 6px;">
      <mat-icon role="img" fonticon="delete" class="mat-icon notranslate gds-icon-l google-symbols mat-ligature-font mat-icon-no-color" aria-hidden="true" data-mat-icon-type="font" data-mat-icon-name="delete"></mat-icon>
      <span>Bulk Delete Chats</span>
    </div>
  `;

  btn.onclick = (e) => {
    e.preventDefault();
    toggleGeminiBulkDelete();
  };

  injectionPoint.prepend(btn);
}

let checkboxesVisible = false;

function toggleGeminiBulkDelete() {
  const chats = document
    .querySelector("conversations-list")
    .querySelectorAll('a[data-test-id]:not([data-test-id="expanded-button"])');
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
  renderGeminiControlPanel();
}

function renderGeminiControlPanel() {
  let controls = document.getElementById("bulk-delete-controls");
  if (!checkboxesVisible) {
    if (controls) controls.remove();
    return;
  }

  if (controls) return;

  controls = document.createElement("div");
  controls.id = "bulk-delete-controls";
  controls.style.cssText =
    "display: flex; flex-direction: column; gap: 8px; padding: 8px 16px; border-bottom: 1px solid rgba(255, 255, 255, 0.2);";

  const btnStyle = `
    text-align: center; 
    font-size: 14px; 
    padding: 4px 0; 
    transition: 0.2s; 
    background: none; 
    border: none; 
    cursor: pointer; 
    color: inherit;
  `;
  controls.innerHTML = `
    <button id="bd-toggle-select" style="${btnStyle}">Select All</button>
    <div style="display: flex; gap: 16px; justify-content: center;">
      <button id="bd-cancel" style="${btnStyle} color: #9ca3af;">Cancel</button>
      <button id="bd-run-delete" style="${btnStyle} color: #ef4444; font-weight: bold;">Delete</button>
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

  document.getElementById("bd-cancel").onclick = toggleGeminiBulkDelete;
  document.getElementById("bd-run-delete").onclick = runGeminiBulkDelete;
}

async function runGeminiBulkDelete() {
  const selected = [
    ...document.querySelectorAll(".bulk-delete-checkbox:checked"),
  ];
  if (selected.length === 0) return alert("Select chats first.");
  if (!confirm(`Delete ${selected.length} chats?`)) return;

  const runBtn = document.getElementById("bd-run-delete");
  runBtn.textContent = "Processing...";

  for (const cb of selected) {
    const chatLink = cb.closest("a");
    if (!chatLink) continue;

    // Gemini doesn't have a simple DELETE /api/ endpoint like ChatGPT.
    // The safest way to do this without getting banned is to trigger the UI delete flow.
    try {
      // 1. Find the 'three dots' menu for this specific chat
      const menuBtn = chatLink.querySelector('button[aria-haspopup="menu"]');
      if (menuBtn) {
        menuBtn.click();
        await new Promise((r) => setTimeout(r, 150));

        // 2. Find the "Delete" option in the popup menu
        const deleteOption = [...document.querySelectorAll("span")].find(
          (s) => s.innerText === "Delete",
        );
        if (deleteOption) {
          deleteOption.click();
          await new Promise((r) => setTimeout(r, 150));

          // 3. Confirm the deletion in the modal
          const confirmBtn = document.querySelector(
            'button[data-hover-id="confirm"]',
          ); // Selector may vary
          if (confirmBtn) confirmBtn.click();
        }
      }
      chatLink.style.opacity = "0.2";
    } catch (err) {
      console.error("Manual click failed", err);
    }
    await new Promise((r) => setTimeout(r, 600)); // Throttling
  }

  alert("Bulk delete finished. Refreshing to update list...");
  location.reload();
}

const observer = new MutationObserver(() => {
  if (!document.getElementById(BUTTON_ID)) injectGeminiButton();
});
observer.observe(document.body, { childList: true, subtree: true });

injectGeminiButton();
