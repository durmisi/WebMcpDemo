// ============================================================
// WebMCP Demo — Todo Manager
// Exposes todo management tools via navigator.modelContext
// so AI agents can discover and invoke them.
// ============================================================

// --- State ---
let todos = [];
let nextId = 1;

// --- DOM refs ---
const statusEl = document.getElementById("webmcp-status");
const todosList = document.getElementById("todos-list");
const todoCount = document.getElementById("todo-count");
const addTodoForm = document.getElementById("add-todo-form");
const searchInput = document.getElementById("search-input");
const toolLog = document.getElementById("tool-log");

// --- Core todo operations (shared by UI and WebMCP tools) ---
// Make handleDelete globally available immediately
window.handleDelete = function (id) {
  deleteTodo(id);
};

function addTodo(title, content, tag, due = null, completed = false) {
  const todo = {
    id: nextId++,
    title,
    content,
    tag: tag || null,
    due: due || null,
    completed,
    createdAt: new Date().toISOString(),
  };
  todos.push(todo);
  renderTodos();
  return todo;
}

function deleteTodo(id) {
  const idx = todos.findIndex((t) => t.id === id);
  if (idx === -1) return null;
  const removed = todos.splice(idx, 1)[0];
  renderTodos();
  return removed;
}

function searchTodos(query) {
  const q = query.toLowerCase();
  return todos.filter(
    (t) =>
      t.title.toLowerCase().includes(q) ||
      t.content.toLowerCase().includes(q) ||
      (t.tag && t.tag.toLowerCase().includes(q)),
  );
}

function getTodoStats() {
  const tagCounts = {};
  let completedCount = 0;
  let pendingCount = 0;
  for (const t of todos) {
    const tag = t.tag || "untagged";
    tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    if (t.completed) {
      completedCount++;
    } else {
      pendingCount++;
    }
  }
  return {
    total: todos.length,
    completed: completedCount,
    pending: pendingCount,
    byTag: tagCounts,
  };
}

// --- UI rendering ---

function renderTodos(filteredTodos) {
  const list = filteredTodos || todos;
  todoCount.textContent = `(${todos.length})`;

  if (list.length === 0) {
    todosList.innerHTML =
      '<p class="empty-state">No todos yet. Add one above or let an AI agent do it via WebMCP!</p>';
    return;
  }

  todosList.innerHTML = list
    .map(
      (t) => `
    <div class="todo-card ${t.completed ? "completed" : ""} bg-white border border-gray-200 rounded-lg p-4 shadow-sm flex justify-between items-start gap-4" data-id="${t.id}">
      <div class="todo-body">
        <div class="todo-title">
          <input type="checkbox" class="complete-checkbox h-4 w-4 mr-3" ${t.completed ? "checked" : ""} onchange="handleComplete(${t.id}, this.checked)">
          <span class="font-medium ${t.completed ? "line-through text-gray-500" : "text-gray-900"}">${escapeHtml(t.title)}</span>
          ${t.tag ? `<span class="todo-tag ml-2 inline-block text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">${escapeHtml(t.tag)}</span>` : ""}
        </div>
        <div class="todo-content text-sm text-gray-600 mt-2">${escapeHtml(t.content)}</div>
        <div class="todo-meta text-xs text-gray-400 mt-2">ID: ${t.id} &middot; ${new Date(t.createdAt).toLocaleString()}</div>
      </div>
      <button class="delete-btn text-sm text-red-600 border rounded px-2 py-1 hover:bg-red-50" onclick="handleDelete(${t.id})">Delete</button>
    </div>
  `,
    )
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// --- Tool call logging ---

function logToolCall(toolName, input, result, error) {
  // Clear empty state on first log
  if (toolLog.querySelector(".empty-state")) {
    toolLog.innerHTML = "";
  }

  const time = new Date().toLocaleTimeString();
  const entry = document.createElement("div");
  entry.className = "log-entry";

  if (error) {
    entry.innerHTML = `<span class="log-time">${time}</span> <span class="log-tool">${toolName}</span>(${JSON.stringify(input)}) → <span class="log-error">ERROR: ${escapeHtml(error)}</span>`;
  } else {
    const resultStr =
      typeof result === "string" ? result : JSON.stringify(result);
    entry.innerHTML = `<span class="log-time">${time}</span> <span class="log-tool">${toolName}</span>(${JSON.stringify(input)}) → <span class="log-result">${escapeHtml(resultStr)}</span>`;
  }

  toolLog.prepend(entry);
}

// --- UI event handlers ---

// Enhanced Manual Controls UX: live validation, char count, priority buttons, autosize
const titleInput = document.getElementById("todo-title");
const contentInput = document.getElementById("todo-content");
const priorityHidden = document.getElementById("todo-priority");
const priorityButtons = Array.from(document.querySelectorAll(".priority-btn"));
const addTodoButton = document.getElementById("add-todo-button");
const contentCountEl = document.getElementById("content-count");

function updateAddButtonState() {
  const isReady =
    titleInput.value.trim().length > 0 && contentInput.value.trim().length > 0;
  addTodoButton.disabled = !isReady;
}

function updateContentCount() {
  const max = parseInt(contentInput.getAttribute("maxlength") || "200", 10);
  const len = contentInput.value.length;
  contentCountEl.textContent = `${len}/${max}`;
}

function setPriority(v) {
  priorityHidden.value = v || "";
  // removed priority preview update
  // update button states
  for (const btn of priorityButtons) {
    const isActive = btn.dataset.priority === (v || "");
    btn.classList.toggle("active", isActive);
    btn.setAttribute("aria-pressed", isActive ? "true" : "false");
  }
}

function autosizeTextarea(el) {
  if (!el) return;
  el.style.height = "auto";
  el.style.height = `${el.scrollHeight}px`;
}

// submit handler supports due date and priority
addTodoForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const title = titleInput.value.trim();
  const content = contentInput.value.trim();
  const prioritySelect = document.getElementById("todo-priority");
  const priority = prioritySelect ? prioritySelect.value : "";
  if (title) {
    addTodo(title, content, priority);
    addTodoForm.reset();
    // reset helpers
    autosizeTextarea(contentInput);
    if (prioritySelect) prioritySelect.value = "low";
    updateContentCount();
    updateAddButtonState();
    titleInput.focus();
  }
});

// wire up live UX
titleInput.addEventListener("input", updateAddButtonState);
contentInput.addEventListener("input", () => {
  autosizeTextarea(contentInput);
  updateContentCount();
  updateAddButtonState();
});

// Ctrl/Cmd+Enter submits the form from the textarea
contentInput.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
    e.preventDefault();
    if (!addTodoButton.disabled) addTodoButton.click();
  }
});

// priority buttons behavior
for (const btn of priorityButtons) {
  btn.addEventListener("click", () => {
    const p = btn.dataset.priority || "";
    setPriority(p);
    updateAddButtonState();
  });
}

// initialize helper state
autosizeTextarea(contentInput);
updateContentCount();
setPriority("");
updateAddButtonState();

searchInput.addEventListener("input", (e) => {
  const query = e.target.value.trim();
  if (query) {
    renderTodos(searchTodos(query));
  } else {
    renderTodos();
  }
});

window.handleComplete = function (id, completed) {
  const todo = todos.find((t) => t.id === id);
  if (todo) {
    todo.completed = completed;
    renderTodos();
  }
};

// --- WebMCP tool definitions ---

const webmcpTools = [
  {
    name: "add_todo",
    description:
      "Add a new todo to the todo manager. Returns the created todo with its assigned ID.",
    inputSchema: {
      type: "object",
      properties: {
        title: {
          type: "string",
          description: "The title of the todo",
        },
        content: {
          type: "string",
          description: "The description/content of the todo",
        },
        tag: {
          type: "string",
          enum: ["low", "medium", "high"],
          description: "Optional priority tag for the todo",
        },
        completed: {
          type: "boolean",
          description: "Whether the todo is completed (default: false)",
        },
      },
      required: ["title", "content"],
    },
    async execute({ title, content, tag, completed = false }) {
      const todo = addTodo(title, content, tag, completed);
      logToolCall("add_todo", { title, content, tag, completed }, todo);
      return {
        content: [
          {
            type: "text",
            text: `Todo "${todo.title}" created with ID ${todo.id}.`,
          },
        ],
      };
    },
  },
  {
    name: "list_todos",
    description:
      "List all todos currently stored in the todo manager. Optionally filter by completion status.",
    inputSchema: {
      type: "object",
      properties: {
        filter: {
          type: "string",
          enum: ["all", "pending", "completed"],
          description: "Filter todos by completion status (default: all)",
        },
      },
    },
    async execute({ filter = "all" }) {
      let filteredTodos = todos;
      if (filter === "pending") {
        filteredTodos = todos.filter((t) => !t.completed);
      } else if (filter === "completed") {
        filteredTodos = todos.filter((t) => t.completed);
      }
      logToolCall("list_todos", { filter }, { count: filteredTodos.length });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(filteredTodos, null, 2),
          },
        ],
      };
    },
  },
  {
    name: "search_todos",
    description:
      "Search todos by a query string. Matches against title, content, and tags.",
    inputSchema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "The search query to filter todos by",
        },
      },
      required: ["query"],
    },
    async execute({ query }) {
      const results = searchTodos(query);
      logToolCall("search_todos", { query }, { matchCount: results.length });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(results, null, 2),
          },
        ],
      };
    },
  },
  {
    name: "mark_todo_complete",
    description:
      "Mark a todo as completed or incomplete by its ID. Returns the updated todo.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "The ID of the todo to update",
        },
        completed: {
          type: "boolean",
          description:
            "Whether to mark as completed (true) or incomplete (false)",
        },
      },
      required: ["id", "completed"],
    },
    async execute({ id, completed }) {
      const todo = todos.find((t) => t.id === id);
      if (!todo) {
        logToolCall(
          "mark_todo_complete",
          { id, completed },
          null,
          "Todo not found",
        );
        throw new Error(`Todo with ID ${id} not found.`);
      }
      todo.completed = completed;
      renderTodos();
      logToolCall("mark_todo_complete", { id, completed }, todo);
      return {
        content: [
          {
            type: "text",
            text: `Todo "${todo.title}" (ID ${todo.id}) marked as ${completed ? "completed" : "incomplete"}.`,
          },
        ],
      };
    },
  },
  {
    name: "delete_todo",
    description: "Delete a todo by its ID. Returns the deleted todo if found.",
    inputSchema: {
      type: "object",
      properties: {
        id: {
          type: "number",
          description: "The ID of the todo to delete",
        },
      },
      required: ["id"],
    },
    annotations: {
      readOnlyHint: false,
    },
    async execute({ id }, agent) {
      // Demonstrate requestUserInteraction for destructive actions
      if (agent && agent.requestUserInteraction) {
        const confirmed = await agent.requestUserInteraction(async () => {
          return confirm(`Allow AI agent to delete todo #${id}?`);
        });
        if (!confirmed) {
          logToolCall("delete_todo", { id }, null, "User denied deletion");
          throw new Error("User cancelled the deletion.");
        }
      }

      const removed = deleteTodo(id);
      if (!removed) {
        logToolCall("delete_todo", { id }, null, "Todo not found");
        throw new Error(`Todo with ID ${id} not found.`);
      }

      logToolCall("delete_todo", { id }, removed);
      return {
        content: [
          {
            type: "text",
            text: `Todo "${removed.title}" (ID ${removed.id}) deleted.`,
          },
        ],
      };
    },
  },
  {
    name: "get_todo_stats",
    description:
      "Get statistics about the todos collection: total count, completed/pending breakdown, and breakdown by tag.",
    inputSchema: {
      type: "object",
      properties: {},
    },
    annotations: {
      readOnlyHint: true,
    },
    async execute() {
      const stats = getTodoStats();
      logToolCall("get_todo_stats", {}, stats);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    },
  },
];

// --- WebMCP registration ---

function registerWebMCP() {
  // Always expose tools on window for manual/automated testing
  window.__webmcp_tools = {};
  for (const tool of webmcpTools) {
    window.__webmcp_tools[tool.name] = tool.execute;
  }
  console.log(
    "[WebMCP] Tools exposed on window.__webmcp_tools for manual testing.",
  );
  // Register with WebMCP if available
  if ("modelContext" in navigator) {
    navigator.modelContext.provideContext({ tools: webmcpTools });
    statusEl.textContent = "WebMCP supported natively";
    statusEl.className = "status status--supported";
    console.log(
      "[WebMCP] Tools registered via navigator.modelContext:",
      webmcpTools.map((t) => t.name),
    );
    return;
  }
  if (window.modelContext) {
    window.modelContext.provideContext({ tools: webmcpTools });
    statusEl.textContent = "WebMCP available via polyfill";
    statusEl.className = "status status--polyfill";
    console.log(
      "[WebMCP] Tools registered via polyfill:",
      webmcpTools.map((t) => t.name),
    );
    return;
  }
  // No support — log tools to console for inspection
  statusEl.textContent =
    "WebMCP not available — enable chrome://flags/#web-mcp in Chrome 146+ Canary";
  statusEl.className = "status status--unsupported";
  console.log("[WebMCP] Not available. Tools that would be registered:");
  console.table(
    webmcpTools.map((t) => ({
      name: t.name,
      description: t.description,
      params: Object.keys(t.inputSchema.properties || {}).join(", "),
    })),
  );
}

// --- Initialize ---

renderTodos();
registerWebMCP();
