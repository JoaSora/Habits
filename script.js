// Variables globales
let editingGoalId = null

// Al inicio del archivo, después de las variables globales, agregar:
function getUnifiedData() {
  const data = JSON.parse(localStorage.getItem("productivityData") || "{}")
  return {
    habits: data.habits || [],
    completions: data.completions || {},
    journalEntries: data.journalEntries || [],
    goals: data.goals || [],
    version: "3.0",
    lastUpdated: data.lastUpdated || new Date().toISOString(),
  }
}

function saveUnifiedData(updates = {}) {
  const currentData = getUnifiedData()
  const newData = {
    ...currentData,
    ...updates,
    lastUpdated: new Date().toISOString(),
  }
  localStorage.setItem("productivityData", JSON.stringify(newData))
}

// Inicialización
document.addEventListener("DOMContentLoaded", () => {
  initializeApp()
})

// Modificar la función initializeApp() para incluir la migración:
function initializeApp() {
  // Migrar datos antiguos si es necesario
  migrateOldData()

  // Cargar datos guardados
  loadJournalEntries()
  loadGoals()

  // Event listeners
  setupEventListeners()
  setupJournalTabs()

  // Navegación suave
  setupSmoothNavigation()

  // Renderizar estadísticas del journal
  renderJournalStats()

  // Configurar fecha mínima para metas
  const today = new Date().toISOString().split("T")[0]
  document.getElementById("goal-deadline").setAttribute("min", today)
}

function setupEventListeners() {
  // Journal
  document.getElementById("save-journal").addEventListener("click", saveJournalEntry)

  // Metas
  document.getElementById("add-goal").addEventListener("click", saveGoal)
  document.getElementById("cancel-edit").addEventListener("click", cancelEditGoal)
}

function setupSmoothNavigation() {
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault()
      const targetId = this.getAttribute("href")
      const targetSection = document.querySelector(targetId)
      if (targetSection) {
        targetSection.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  })
}

// ==================== JOURNAL DIARIO ====================

// Reemplazar la función saveJournalEntry():
function saveJournalEntry() {
  const text = document.getElementById("journal-text").value.trim()
  const selectedTags = getSelectedTags()
  const selectedMood = document.querySelector('input[name="dayMood"]:checked')

  if (!text) {
    alert("Por favor escribe algo en tu journal antes de guardar.")
    return
  }

  if (!selectedMood) {
    alert("Por favor selecciona cómo fue tu día.")
    return
  }

  const entry = {
    id: Date.now(),
    date: new Date().toISOString(),
    text: text,
    tags: selectedTags,
    mood: selectedMood.value,
  }

  // Guardar en el sistema unificado
  const currentData = getUnifiedData()
  currentData.journalEntries.unshift(entry) // Agregar al inicio
  saveUnifiedData({ journalEntries: currentData.journalEntries })

  // Limpiar formulario
  document.getElementById("journal-text").value = ""
  clearSelectedTags()
  clearSelectedMood()

  // Recargar lista y estadísticas
  loadJournalEntries()
  renderJournalStats()

  // Mensaje de éxito
  showMessage("¡Entrada guardada exitosamente! 📝")
}

function clearSelectedMood() {
  document.querySelectorAll('input[name="dayMood"]').forEach((radio) => {
    radio.checked = false
  })
}

function getSelectedTags() {
  const checkboxes = document.querySelectorAll('.categories-section input[type="checkbox"]:checked')
  return Array.from(checkboxes).map((cb) => cb.value)
}

function clearSelectedTags() {
  document.querySelectorAll('.categories-section input[type="checkbox"]').forEach((cb) => {
    cb.checked = false
  })
}

// Reemplazar la función getJournalEntries():
function getJournalEntries() {
  return getUnifiedData().journalEntries
}

function loadJournalEntries() {
  const entries = getJournalEntries()
  const container = document.getElementById("entries-list")

  if (entries.length === 0) {
    container.innerHTML =
      '<p style="text-align: center; color: #666;">No hay entradas aún. ¡Escribe tu primera reflexión!</p>'
    return
  }

  container.innerHTML = entries
    .map(
      (entry) => `
      <div class="journal-entry" data-entry-id="${entry.id}">
          <div class="entry-header">
              <div class="entry-date">${formatDate(entry.date)}</div>
              <button class="delete-entry-btn" onclick="deleteJournalEntry(${entry.id})" title="Eliminar entrada">
                  🗑️
              </button>
          </div>
          ${entry.mood ? `<div class="entry-mood">${entry.mood}</div>` : ""}
          <div class="entry-text">${entry.text}</div>
          <div class="entry-tags">
              ${entry.tags.map((tag) => `<span class="entry-tag">${tag}</span>`).join("")}
          </div>
      </div>
  `,
    )
    .join("")
}

// Agregar la función deleteJournalEntry después de la función loadJournalEntries():

function deleteJournalEntry(entryId) {
  if (confirm("¿Estás seguro de que quieres eliminar esta entrada del journal? Esta acción no se puede deshacer.")) {
    const currentData = getUnifiedData()
    const filteredEntries = currentData.journalEntries.filter((entry) => entry.id !== entryId)

    saveUnifiedData({ journalEntries: filteredEntries })

    // Recargar lista y estadísticas
    loadJournalEntries()
    renderJournalStats()

    showMessage("Entrada del journal eliminada 🗑️")
  }
}

// ==================== METAS ====================

// Reemplazar la función saveGoal():
function saveGoal() {
  const description = document.getElementById("goal-description").value.trim()
  const category = document.getElementById("goal-category").value.trim()
  const duration = document.getElementById("goal-duration").value
  const priority = document.getElementById("goal-priority").value
  const deadline = document.getElementById("goal-deadline").value

  if (!description) {
    alert("Por favor ingresa una descripción para tu meta.")
    return
  }

  const currentData = getUnifiedData()
  const goals = currentData.goals

  if (editingGoalId) {
    // Editar meta existente
    const goalIndex = goals.findIndex((g) => g.id === editingGoalId)
    if (goalIndex !== -1) {
      goals[goalIndex] = {
        ...goals[goalIndex],
        description,
        category: category || "General",
        duration,
        priority,
        deadline: deadline || null,
      }
    }
    editingGoalId = null
    document.getElementById("add-goal").textContent = "➕ Agregar Meta"
    document.getElementById("cancel-edit").style.display = "none"
  } else {
    // Nueva meta
    const goal = {
      id: Date.now(),
      description,
      category: category || "General",
      duration,
      priority,
      deadline: deadline || null,
      completed: false,
      createdAt: new Date().toISOString(),
    }
    goals.push(goal)
  }

  // Guardar en el sistema unificado
  saveUnifiedData({ goals: goals })

  // Limpiar formulario
  clearGoalForm()

  // Recargar lista
  loadGoals()

  // Mensaje de éxito
  showMessage(editingGoalId ? "¡Meta actualizada! 🎯" : "¡Meta agregada exitosamente! 🎯")
}

function clearGoalForm() {
  document.getElementById("goal-description").value = ""
  document.getElementById("goal-category").value = ""
  document.getElementById("goal-duration").value = "corto"
  document.getElementById("goal-priority").value = "media"
  document.getElementById("goal-deadline").value = ""
}

function cancelEditGoal() {
  editingGoalId = null
  clearGoalForm()
  document.getElementById("add-goal").textContent = "➕ Agregar Meta"
  document.getElementById("cancel-edit").style.display = "none"
}

// Reemplazar la función getGoals():
function getGoals() {
  return getUnifiedData().goals
}

function loadGoals() {
  const goals = getGoals()
  const container = document.getElementById("goals-container")

  if (goals.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">No hay metas aún. ¡Crea tu primera meta!</p>'
    return
  }

  container.innerHTML = goals
    .map((goal) => {
      const deadlineInfo = getDeadlineInfo(goal.deadline)

      return `
        <div class="goal-item ${goal.completed ? "completed" : ""}" draggable="true" data-goal-id="${goal.id}">
            <div class="goal-header">
                <div class="goal-description">${goal.description}</div>
                <div class="goal-priority priority-${goal.priority}">🔥 ${goal.priority.toUpperCase()}</div>
            </div>
            <div class="goal-details">
                <span class="goal-category">🏷 ${goal.category}</span>
                <span class="goal-duration">⏳ ${getDurationText(goal.duration)}</span>
                ${deadlineInfo.html}
            </div>
            <div class="goal-actions">
                <button class="btn btn-success" onclick="toggleGoalComplete(${goal.id})">
                    ${goal.completed ? "↩️ Reactivar" : "✅ Completar"}
                </button>
                <button class="btn btn-secondary" onclick="editGoal(${goal.id})">✏️ Editar</button>
                <button class="btn btn-danger" onclick="deleteGoal(${goal.id})">🗑️ Eliminar</button>
            </div>
        </div>
    `
    })
    .join("")

  // Configurar drag and drop
  setupDragAndDrop()
}

function getDurationText(duration) {
  const durations = {
    corto: "Corto (1-3 meses)",
    medio: "Medio (3-6 meses)",
    largo: "Largo (6-12 meses)",
    futuro: "Futuro (1-3 años)",
  }
  return durations[duration] || duration
}

// Reemplazar la función toggleGoalComplete():
function toggleGoalComplete(goalId) {
  const currentData = getUnifiedData()
  const goals = currentData.goals
  const goalIndex = goals.findIndex((g) => g.id === goalId)

  if (goalIndex !== -1) {
    goals[goalIndex].completed = !goals[goalIndex].completed
    saveUnifiedData({ goals: goals })
    loadGoals()

    const message = goals[goalIndex].completed ? "¡Meta completada! 🎉" : "Meta reactivada 🔄"
    showMessage(message)
  }
}

function editGoal(goalId) {
  const goals = getGoals()
  const goal = goals.find((g) => g.id === goalId)

  if (goal) {
    document.getElementById("goal-description").value = goal.description
    document.getElementById("goal-category").value = goal.category
    document.getElementById("goal-duration").value = goal.duration
    document.getElementById("goal-priority").value = goal.priority
    document.getElementById("goal-deadline").value = goal.deadline || ""

    editingGoalId = goalId
    document.getElementById("add-goal").textContent = "💾 Actualizar Meta"
    document.getElementById("cancel-edit").style.display = "inline-block"

    // Scroll al formulario
    document.querySelector(".goals-form").scrollIntoView({ behavior: "smooth" })
  }
}

// Reemplazar la función deleteGoal():
function deleteGoal(goalId) {
  if (confirm("¿Estás seguro de que quieres eliminar esta meta?")) {
    const currentData = getUnifiedData()
    const filteredGoals = currentData.goals.filter((g) => g.id !== goalId)
    saveUnifiedData({ goals: filteredGoals })
    loadGoals()
    showMessage("Meta eliminada 🗑️")
  }
}

// ==================== DRAG AND DROP ====================

function setupDragAndDrop() {
  const goalItems = document.querySelectorAll(".goal-item")

  goalItems.forEach((item) => {
    item.addEventListener("dragstart", handleDragStart)
    item.addEventListener("dragover", handleDragOver)
    item.addEventListener("drop", handleDrop)
    item.addEventListener("dragend", handleDragEnd)
  })
}

let draggedElement = null

function handleDragStart(e) {
  draggedElement = this
  this.classList.add("dragging")
  e.dataTransfer.effectAllowed = "move"
  e.dataTransfer.setData("text/html", this.outerHTML)
}

function handleDragOver(e) {
  if (e.preventDefault) {
    e.preventDefault()
  }

  this.classList.add("drag-over")
  e.dataTransfer.dropEffect = "move"
  return false
}

function handleDrop(e) {
  if (e.stopPropagation) {
    e.stopPropagation()
  }

  if (draggedElement !== this) {
    // Reordenar elementos
    const container = document.getElementById("goals-container")
    const allItems = Array.from(container.children)
    const draggedIndex = allItems.indexOf(draggedElement)
    const targetIndex = allItems.indexOf(this)

    if (draggedIndex < targetIndex) {
      container.insertBefore(draggedElement, this.nextSibling)
    } else {
      container.insertBefore(draggedElement, this)
    }

    // Actualizar orden en localStorage
    updateGoalsOrder()
  }

  this.classList.remove("drag-over")
  return false
}

function handleDragEnd(e) {
  this.classList.remove("dragging")

  // Limpiar clases de drag-over
  document.querySelectorAll(".goal-item").forEach((item) => {
    item.classList.remove("drag-over")
  })
}

// Reemplazar la función updateGoalsOrder():
function updateGoalsOrder() {
  const goalItems = document.querySelectorAll(".goal-item")
  const currentData = getUnifiedData()
  const goals = currentData.goals
  const reorderedGoals = []

  goalItems.forEach((item) => {
    const goalId = Number.parseInt(item.dataset.goalId)
    const goal = goals.find((g) => g.id === goalId)
    if (goal) {
      reorderedGoals.push(goal)
    }
  })

  saveUnifiedData({ goals: reorderedGoals })
}

// ==================== UTILIDADES ====================

function formatDate(dateString) {
  const date = new Date(dateString)
  const options = {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }
  return date.toLocaleDateString("es-ES", options)
}

function showMessage(message) {
  // Crear elemento de mensaje
  const messageEl = document.createElement("div")
  messageEl.textContent = message
  messageEl.style.cssText = `
        position: fixed;
        top: 100px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 1rem 1.5rem;
        border-radius: 10px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.2);
        z-index: 1001;
        animation: slideIn 0.3s ease;
    `

  // Agregar animación CSS
  const style = document.createElement("style")
  style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `
  document.head.appendChild(style)

  document.body.appendChild(messageEl)

  // Remover después de 3 segundos
  setTimeout(() => {
    messageEl.style.animation = "slideIn 0.3s ease reverse"
    setTimeout(() => {
      if (messageEl.parentNode) {
        messageEl.parentNode.removeChild(messageEl)
      }
    }, 300)
  }, 3000)
}

// ==================== TRACKER DE HÁBITOS ====================

class HabitTracker {
  // En la clase HabitTracker, reemplazar el constructor:
  constructor() {
    const unifiedData = getUnifiedData()
    this.habits = unifiedData.habits
    this.completions = unifiedData.completions
    this.currentDate = new Date()
    this.currentCalendarDate = new Date()
    this.selectedHabitForCalendar = ""
    this.editingHabitId = null
    this.currentFilter = "all"
    this.currentView = "grid"
    this.searchQuery = ""

    this.initHabits()
  }

  cleanupHabits() {
    // Limpiar hábitos con datos corruptos
    this.habits = this.habits.filter((habit) => {
      return habit && habit.id && habit.name && habit.days && Array.isArray(habit.days) && habit.days.length > 0
    })

    // Asegurar que todos los hábitos tengan las propiedades necesarias
    this.habits.forEach((habit) => {
      if (!habit.category) habit.category = "General"
      if (!habit.color) habit.color = "#8B9DC3"
      if (!habit.order && habit.order !== 0) habit.order = 0
      if (!habit.createdAt) habit.createdAt = new Date().toISOString()
    })

    this.saveHabitsToStorage()
  }

  initHabits() {
    this.cleanupHabits()
    this.setupHabitsEventListeners()
    this.updateCurrentDate()
    this.updateProgressSummary()
    this.renderTodayHabits()
    this.renderAllHabits()
    this.renderCalendar()
    this.renderStats()
    this.updateCalendarHabitSelector()
    this.updateCategoryFilters()
    this.updateCategoryDatalist()
  }

  setupHabitsEventListeners() {
    // Tabs
    document.querySelectorAll(".habits-container-wrapper .tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.switchTab(e.target.dataset.tab))
    })

    // Modal
    document.getElementById("addHabitBtn").addEventListener("click", () => this.openModal())
    document.querySelector(".habits-container-wrapper .close-btn").addEventListener("click", () => this.closeModal())
    document.getElementById("cancelBtn").addEventListener("click", () => this.closeModal())
    document.getElementById("habitForm").addEventListener("submit", (e) => this.saveHabit(e))

    // Habit type change
    document.getElementById("habitType").addEventListener("change", (e) => this.handleHabitTypeChange(e.target.value))

    // Color picker
    document.querySelectorAll(".habits-container-wrapper .color-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        document.getElementById("habitColor").value = e.target.dataset.color
      })
    })

    // Search and filters
    document.getElementById("searchHabits").addEventListener("input", (e) => {
      this.searchQuery = e.target.value.toLowerCase()
      this.renderAllHabits()
    })

    document.querySelectorAll(".habits-container-wrapper .filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.setFilter(e.target.dataset.category))
    })

    // View options
    document.querySelectorAll(".habits-container-wrapper .view-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.setView(e.target.dataset.view))
    })

    // Export/Import
    document.getElementById("exportDataBtn").addEventListener("click", () => this.exportData())
    document.getElementById("exportStatsBtn").addEventListener("click", () => this.exportStats())
    document.getElementById("importDataBtn").addEventListener("change", (e) => this.importData(e))

    // Calendar navigation
    document.getElementById("prevMonth").addEventListener("click", () => this.changeMonth(-1))
    document.getElementById("nextMonth").addEventListener("click", () => this.changeMonth(1))
    document.getElementById("calendarHabitSelect").addEventListener("change", (e) => {
      this.selectedHabitForCalendar = e.target.value
      this.renderCalendar()
    })

    // Modal click outside to close
    document.getElementById("habitModal").addEventListener("click", (e) => {
      if (e.target.id === "habitModal") this.closeModal()
    })
  }

  handleHabitTypeChange(type) {
    const daysGroup = document.getElementById("daysGroup")
    const checkboxes = document.querySelectorAll('.days-selector input[type="checkbox"]')

    // Limpiar todas las selecciones primero
    checkboxes.forEach((cb) => {
      cb.checked = false
    })

    if (type === "daily") {
      // Seleccionar todos los días
      checkboxes.forEach((cb) => {
        cb.checked = true
      })
      daysGroup.style.opacity = "0.6"
      daysGroup.style.pointerEvents = "none"
    } else if (type === "weekly") {
      // Seleccionar días laborables (Lunes a Viernes)
      checkboxes.forEach((checkbox) => {
        const day = Number.parseInt(checkbox.value)
        if (day >= 1 && day <= 5) {
          checkbox.checked = true
        }
      })
      daysGroup.style.opacity = "0.6"
      daysGroup.style.pointerEvents = "none"
    } else {
      // Custom - habilitar selección manual
      daysGroup.style.opacity = "1"
      daysGroup.style.pointerEvents = "auto"
    }
  }

  setFilter(category) {
    this.currentFilter = category
    document.querySelectorAll(".habits-container-wrapper .filter-btn").forEach((btn) => btn.classList.remove("active"))
    document.querySelector(`.habits-container-wrapper [data-category="${category}"]`).classList.add("active")
    this.renderAllHabits()
  }

  setView(view) {
    this.currentView = view
    document.querySelectorAll(".habits-container-wrapper .view-btn").forEach((btn) => btn.classList.remove("active"))
    document.querySelector(`.habits-container-wrapper [data-view="${view}"]`).classList.add("active")

    const container = document.getElementById("allHabits")
    if (view === "list") {
      container.classList.add("list-view")
    } else {
      container.classList.remove("list-view")
    }
  }

  switchTab(tabName) {
    document.querySelectorAll(".habits-container-wrapper .tab-btn").forEach((btn) => btn.classList.remove("active"))
    document
      .querySelectorAll(".habits-container-wrapper .tab-content")
      .forEach((content) => content.classList.remove("active"))

    document.querySelector(`.habits-container-wrapper [data-tab="${tabName}"]`).classList.add("active")
    document.getElementById(tabName).classList.add("active")

    if (tabName === "calendar") {
      this.renderCalendar()
    } else if (tabName === "stats") {
      this.renderStats()
    }
  }

  updateCurrentDate() {
    const options = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }
    document.getElementById("currentDate").textContent = this.currentDate.toLocaleDateString("es-ES", options)
  }

  updateProgressSummary() {
    const todayHabits = this.getHabitsForToday()
    const completedToday = todayHabits.filter((habit) => this.isHabitCompleted(habit.id, this.currentDate)).length

    const bestStreak = Math.max(0, ...this.habits.map((habit) => this.calculateStreak(habit.id)))

    document.getElementById("todayProgress").textContent = `${completedToday}/${todayHabits.length}`
    document.getElementById("bestStreak").textContent = bestStreak

    // Update daily progress bar
    const progressPercentage = todayHabits.length > 0 ? (completedToday / todayHabits.length) * 100 : 0
    document.getElementById("dailyProgressFill").style.width = `${progressPercentage}%`
    document.getElementById("dailyProgressText").textContent = `${Math.round(progressPercentage)}% completado`
  }

  updateCategoryFilters() {
    const categories = [...new Set(this.habits.map((habit) => habit.category))]
    const container = document.getElementById("categoryFilters")

    container.innerHTML = categories
      .map((category) => `<button class="filter-btn" data-category="${category}">${category}</button>`)
      .join("")

    // Re-attach event listeners
    container.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.setFilter(e.target.dataset.category))
    })
  }

  updateCategoryDatalist() {
    const categories = [...new Set(this.habits.map((habit) => habit.category))]
    const datalist = document.getElementById("categoryList")

    datalist.innerHTML = categories.map((category) => `<option value="${category}">`).join("")
  }

  openModal(habitId = null) {
    this.editingHabitId = habitId
    const modal = document.getElementById("habitModal")
    const form = document.getElementById("habitForm")

    if (habitId) {
      const habit = this.habits.find((h) => h.id === habitId)
      if (!habit) {
        this.showHabitToast("Hábito no encontrado", "error")
        return
      }

      document.getElementById("modalTitle").textContent = "Editar Hábito"
      document.getElementById("habitName").value = habit.name
      document.getElementById("habitCategory").value = habit.category
      document.getElementById("habitColor").value = habit.color
      document.getElementById("habitTime").value = habit.time || ""
      document.getElementById("habitGoal").value = habit.goal || ""
      document.getElementById("habitNotes").value = habit.notes || ""

      // Determinar tipo de hábito
      if (habit.days.length === 7) {
        document.getElementById("habitType").value = "daily"
      } else if (habit.days.length === 5 && habit.days.every((d) => d >= 1 && d <= 5)) {
        document.getElementById("habitType").value = "weekly"
      } else {
        document.getElementById("habitType").value = "custom"
      }

      // Limpiar checkboxes primero
      document.querySelectorAll('.days-selector input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = false
      })

      // Seleccionar días del hábito
      habit.days.forEach((day) => {
        const checkbox = document.querySelector(`input[value="${day}"]`)
        if (checkbox) checkbox.checked = true
      })

      this.handleHabitTypeChange(document.getElementById("habitType").value)
    } else {
      document.getElementById("modalTitle").textContent = "Agregar Hábito"
      form.reset()
      document.getElementById("habitColor").value = "#8B9DC3"
      document.getElementById("habitType").value = "custom"

      // Limpiar checkboxes
      document.querySelectorAll('.days-selector input[type="checkbox"]').forEach((checkbox) => {
        checkbox.checked = false
      })

      this.handleHabitTypeChange("custom")
    }

    modal.style.display = "block"

    // Enfocar el campo de nombre después de un pequeño delay
    setTimeout(() => {
      document.getElementById("habitName").focus()
    }, 100)
  }

  closeModal() {
    const modal = document.getElementById("habitModal")
    modal.style.display = "none"
    this.editingHabitId = null

    // Limpiar el formulario
    document.getElementById("habitForm").reset()
    document.getElementById("habitColor").value = "#8B9DC3"
    document.getElementById("habitType").value = "custom"

    // Resetear los checkboxes de días
    document.querySelectorAll('.days-selector input[type="checkbox"]').forEach((cb) => {
      cb.checked = false
    })

    // Resetear la visibilidad del grupo de días
    const daysGroup = document.getElementById("daysGroup")
    daysGroup.style.opacity = "1"
    daysGroup.style.pointerEvents = "auto"
  }

  saveHabit(e) {
    e.preventDefault()

    const name = document.getElementById("habitName").value.trim()
    const category = document.getElementById("habitCategory").value.trim() || "General"
    const color = document.getElementById("habitColor").value
    const time = document.getElementById("habitTime").value
    const goal = Number.parseInt(document.getElementById("habitGoal").value) || null
    const notes = document.getElementById("habitNotes").value.trim()

    // Obtener días seleccionados
    const dayCheckboxes = document.querySelectorAll('.days-selector input[type="checkbox"]:checked')
    const days = []
    dayCheckboxes.forEach((checkbox) => {
      days.push(Number.parseInt(checkbox.value))
    })

    // Validaciones
    if (!name) {
      this.showHabitToast("Por favor ingresa un nombre para el hábito", "error")
      document.getElementById("habitName").focus()
      return
    }

    if (days.length === 0) {
      this.showHabitToast("Por favor selecciona al menos un día", "error")
      return
    }

    // Crear o actualizar hábito
    const habit = {
      id: this.editingHabitId || Date.now().toString(),
      name,
      category,
      color,
      days,
      time,
      goal,
      notes,
      createdAt: this.editingHabitId
        ? this.habits.find((h) => h.id === this.editingHabitId).createdAt
        : new Date().toISOString(),
      order: this.editingHabitId ? this.habits.find((h) => h.id === this.editingHabitId).order : this.habits.length,
    }

    // Guardar hábito
    if (this.editingHabitId) {
      const index = this.habits.findIndex((h) => h.id === this.editingHabitId)
      if (index !== -1) {
        this.habits[index] = habit
        this.showHabitToast("Hábito actualizado correctamente", "success")
      }
    } else {
      this.habits.push(habit)
      this.showHabitToast("Hábito creado correctamente", "success")
    }

    // Guardar en localStorage
    this.saveHabitsToStorage()

    // Actualizar todas las vistas
    this.updateProgressSummary()
    this.renderTodayHabits()
    this.renderAllHabits()
    this.updateCalendarHabitSelector()
    this.updateCategoryFilters()
    this.updateCategoryDatalist()

    // Cerrar modal
    this.closeModal()
  }

  deleteHabit(habitId) {
    if (confirm("¿Estás seguro de que quieres eliminar este hábito? Esta acción no se puede deshacer.")) {
      this.habits = this.habits.filter((h) => h.id !== habitId)

      // Remove completions for this habit
      Object.keys(this.completions).forEach((date) => {
        if (this.completions[date] && this.completions[date][habitId]) {
          delete this.completions[date][habitId]
        }
      })

      this.saveHabitsToStorage()
      this.updateProgressSummary()
      this.renderTodayHabits()
      this.renderAllHabits()
      this.updateCalendarHabitSelector()
      this.updateCategoryFilters()
      this.showHabitToast("Hábito eliminado", "success")
    }
  }

  toggleHabitCompletion(habitId, date = null) {
    const dateKey = date || this.formatDate(this.currentDate)

    if (!this.completions[dateKey]) {
      this.completions[dateKey] = {}
    }

    const wasCompleted = this.completions[dateKey][habitId]
    this.completions[dateKey][habitId] = !wasCompleted

    this.saveHabitsToStorage()
    this.updateProgressSummary()
    this.renderTodayHabits()
    this.renderCalendar()

    const habit = this.habits.find((h) => h.id === habitId)
    if (habit) {
      const message = wasCompleted ? `❌ ${habit.name} marcado como no completado` : `✅ ¡${habit.name} completado!`
      this.showHabitToast(message, wasCompleted ? "error" : "success")
    }
  }

  isHabitCompleted(habitId, date) {
    const dateKey = this.formatDate(date)
    return this.completions[dateKey] && this.completions[dateKey][habitId]
  }

  formatDate(date) {
    return date.toISOString().split("T")[0]
  }

  getDayName(dayIndex) {
    const days = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    return days[dayIndex]
  }

  getHabitsForToday() {
    const today = this.currentDate.getDay()
    return this.habits
      .filter((habit) => habit.days && Array.isArray(habit.days) && habit.days.includes(today))
      .sort((a, b) => a.order - b.order)
  }

  getFilteredHabits() {
    let filtered = this.habits

    // Apply category filter
    if (this.currentFilter !== "all") {
      filtered = filtered.filter((habit) => habit.category === this.currentFilter)
    }

    // Apply search filter
    if (this.searchQuery) {
      filtered = filtered.filter(
        (habit) =>
          habit.name.toLowerCase().includes(this.searchQuery) ||
          habit.category.toLowerCase().includes(this.searchQuery) ||
          (habit.notes && habit.notes.toLowerCase().includes(this.searchQuery)),
      )
    }

    return filtered.sort((a, b) => a.order - b.order)
  }

  calculateStreak(habitId) {
    let streak = 0
    const currentDate = new Date()
    const habit = this.habits.find((h) => h.id === habitId)

    if (!habit || !habit.days || !Array.isArray(habit.days)) {
      return 0
    }

    // Empezar desde hoy y retroceder
    while (true) {
      // Si este día no está programado para el hábito, continuar al día anterior
      if (!habit.days.includes(currentDate.getDay())) {
        currentDate.setDate(currentDate.getDate() - 1)
        continue
      }

      const dateKey = this.formatDate(currentDate)

      // Si el hábito fue completado este día programado, incrementar racha
      if (this.completions[dateKey] && this.completions[dateKey][habitId]) {
        streak++
        currentDate.setDate(currentDate.getDate() - 1)
      } else {
        // Si no fue completado en un día programado, romper la racha
        break
      }
    }

    return streak
  }

  calculateWeeklyProgress(habitId) {
    const habit = this.habits.find((h) => h.id === habitId)
    if (!habit) return { completed: 0, total: 0 }

    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())

    let completed = 0
    let total = 0

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)

      if (habit.days && Array.isArray(habit.days) && habit.days.includes(date.getDay())) {
        total++
        if (this.isHabitCompleted(habitId, date)) {
          completed++
        }
      }
    }

    return { completed, total }
  }

  renderTodayHabits() {
    const container = document.getElementById("todayHabits")
    const todayHabits = this.getHabitsForToday()

    if (todayHabits.length === 0) {
      container.innerHTML = '<div class="empty-state"><p>No hay hábitos programados para hoy 🎉</p></div>'
      return
    }

    container.innerHTML = todayHabits
      .map((habit) => {
        const isCompleted = this.isHabitCompleted(habit.id, this.currentDate)
        const streak = this.calculateStreak(habit.id)
        const weeklyProgress = this.calculateWeeklyProgress(habit.id)

        return `
                <div class="habit-card ${isCompleted ? "completed-today" : ""}" 
                     draggable="true" 
                     data-habit-id="${habit.id}" 
                     style="border-left-color: ${habit.color}">
                    <div class="habit-header">
                        <div class="habit-info">
                            <h3>${habit.name}</h3>
                            <span class="habit-category">${habit.category}</span>
                        </div>
                        <div class="habit-actions">
                            <button class="complete-btn ${isCompleted ? "completed" : ""}" 
                                    onclick="habitTracker.toggleHabitCompletion('${habit.id}')"
                                    title="${isCompleted ? "Marcar como no completado" : "Marcar como completado"}">
                                ${isCompleted ? "✓" : "○"}
                            </button>
                            <button class="edit-btn" onclick="habitTracker.openModal('${habit.id}')" title="Editar">
                                ✏️
                            </button>
                        </div>
                    </div>
                    <div class="habit-details">
                        <div class="habit-days">
                            ${habit.days.map((day) => `<span class="day-badge">${this.getDayName(day)}</span>`).join("")}
                        </div>
                        ${habit.time ? `<div class="habit-time">⏰ ${habit.time}</div>` : ""}
                        ${habit.notes ? `<div class="habit-notes">"${habit.notes}"</div>` : ""}
                        <div class="habit-meta">
                            <span class="habit-streak">🔥 ${streak} días</span>
                            <span class="habit-goal">📊 ${weeklyProgress.completed}/${weeklyProgress.total} esta semana</span>
                        </div>
                    </div>
                </div>
            `
      })
      .join("")

    this.setupHabitsDragAndDrop(container)
  }

  setupHabitsDragAndDrop(container) {
    const cards = container.querySelectorAll(".habit-card")

    cards.forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        card.classList.add("dragging")
        e.dataTransfer.setData("text/plain", card.dataset.habitId)
        e.dataTransfer.effectAllowed = "move"
      })

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging")
      })

      card.addEventListener("dragover", (e) => {
        e.preventDefault()
        e.dataTransfer.dropEffect = "move"
      })

      card.addEventListener("drop", (e) => {
        e.preventDefault()
        const draggedId = e.dataTransfer.getData("text/plain")
        const targetId = card.dataset.habitId

        if (draggedId !== targetId) {
          this.reorderHabits(draggedId, targetId)
        }
      })
    })
  }

  reorderHabits(draggedId, targetId) {
    const draggedIndex = this.habits.findIndex((h) => h.id === draggedId)
    const targetIndex = this.habits.findIndex((h) => h.id === targetId)

    if (draggedIndex === -1 || targetIndex === -1) return

    const draggedHabit = this.habits[draggedIndex]
    this.habits.splice(draggedIndex, 1)
    this.habits.splice(targetIndex, 0, draggedHabit)

    // Update order values
    this.habits.forEach((habit, index) => {
      habit.order = index
    })

    this.saveHabitsToStorage()
    this.renderTodayHabits()
    this.renderAllHabits()
    this.showHabitToast("Orden actualizado", "success")
  }

  renderAllHabits() {
    const container = document.getElementById("allHabits")
    const filteredHabits = this.getFilteredHabits()

    if (filteredHabits.length === 0) {
      const message = this.searchQuery
        ? "No se encontraron hábitos que coincidan con tu búsqueda"
        : this.currentFilter !== "all"
          ? `No hay hábitos en la categoría "${this.currentFilter}"`
          : "No tienes hábitos creados aún"
      container.innerHTML = `<div class="empty-state"><p>${message}</p></div>`
      return
    }

    container.innerHTML = filteredHabits
      .map((habit) => {
        const streak = this.calculateStreak(habit.id)
        const weeklyProgress = this.calculateWeeklyProgress(habit.id)

        return `
                <div class="habit-card" 
                     draggable="true" 
                     data-habit-id="${habit.id}" 
                     style="border-left-color: ${habit.color}">
                    <div class="habit-header">
                        <div class="habit-info">
                            <h3>${habit.name}</h3>
                            <span class="habit-category">${habit.category}</span>
                        </div>
                        <div class="habit-actions">
                            <button class="edit-btn" onclick="habitTracker.openModal('${habit.id}')" title="Editar">
                                ✏️
                            </button>
                            <button class="delete-btn" onclick="habitTracker.deleteHabit('${habit.id}')" title="Eliminar">
                                🗑️
                            </button>
                        </div>
                    </div>
                    <div class="habit-details">
                        <div class="habit-days">
                            ${habit.days.map((day) => `<span class="day-badge">${this.getDayName(day)}</span>`).join("")}
                        </div>
                        ${habit.time ? `<div class="habit-time">⏰ ${habit.time}</div>` : ""}
                        ${habit.goal ? `<div class="habit-goal">🎯 Meta: ${habit.goal} veces por semana</div>` : ""}
                        ${habit.notes ? `<div class="habit-notes">"${habit.notes}"</div>` : ""}
                        <div class="habit-meta">
                            <span class="habit-streak">🔥 ${streak} días</span>
                            <span class="habit-progress">📊 ${weeklyProgress.completed}/${weeklyProgress.total} esta semana</span>
                        </div>
                    </div>
                </div>
            `
      })
      .join("")
  }

  updateCalendarHabitSelector() {
    const select = document.getElementById("calendarHabitSelect")
    select.innerHTML = '<option value="">Selecciona un hábito</option>'

    this.habits.forEach((habit) => {
      const option = document.createElement("option")
      option.value = habit.id
      option.textContent = habit.name
      select.appendChild(option)
    })
  }

  changeMonth(direction) {
    this.currentCalendarDate.setMonth(this.currentCalendarDate.getMonth() + direction)
    this.renderCalendar()
  }

  renderCalendar() {
    const monthNames = [
      "Enero",
      "Febrero",
      "Marzo",
      "Abril",
      "Mayo",
      "Junio",
      "Julio",
      "Agosto",
      "Septiembre",
      "Octubre",
      "Noviembre",
      "Diciembre",
    ]

    document.getElementById("calendarMonth").textContent =
      `${monthNames[this.currentCalendarDate.getMonth()]} ${this.currentCalendarDate.getFullYear()}`

    const grid = document.getElementById("calendarGrid")
    const firstDay = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth(), 1)
    const lastDay = new Date(this.currentCalendarDate.getFullYear(), this.currentCalendarDate.getMonth() + 1, 0)
    const startDate = new Date(firstDay)
    startDate.setDate(startDate.getDate() - firstDay.getDay())

    let html = ""

    // Headers
    const dayHeaders = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
    dayHeaders.forEach((day) => {
      html += `<div class="calendar-day header">${day}</div>`
    })

    // Calendar days
    const currentDate = new Date(startDate)
    for (let i = 0; i < 42; i++) {
      const isCurrentMonth = currentDate.getMonth() === this.currentCalendarDate.getMonth()
      const isToday = this.formatDate(currentDate) === this.formatDate(new Date())

      let classes = "calendar-day"
      if (!isCurrentMonth) classes += " other-month"
      if (isToday) classes += " today"

      if (this.selectedHabitForCalendar && isCurrentMonth) {
        const habit = this.habits.find((h) => h.id === this.selectedHabitForCalendar)
        if (habit) {
          const isScheduled = habit.days && Array.isArray(habit.days) && habit.days.includes(currentDate.getDay())
          const isCompleted = this.isHabitCompleted(habit.id, currentDate)

          if (isCompleted) {
            classes += " completed"
          } else if (isScheduled) {
            classes += " scheduled"
          }
        }
      }

      html += `<div class="${classes}" data-date="${this.formatDate(currentDate)}">${currentDate.getDate()}</div>`
      currentDate.setDate(currentDate.getDate() + 1)
    }

    grid.innerHTML = html
  }

  renderStats() {
    // Estadísticas generales
    const totalHabits = this.habits.length
    const todayHabits = this.getHabitsForToday()
    const completedToday = todayHabits.filter((habit) => this.isHabitCompleted(habit.id, this.currentDate)).length
    const longestStreak = Math.max(0, ...this.habits.map((habit) => this.calculateStreak(habit.id)))

    document.getElementById("totalHabits").textContent = totalHabits
    document.getElementById("completedToday").textContent = `${completedToday}/${todayHabits.length}`
    document.getElementById("longestStreak").textContent = `${longestStreak} días`

    this.renderWeeklyChart()
    this.renderTopHabits()
  }

  renderWeeklyChart() {
    const container = document.getElementById("weeklyChart")
    const today = new Date()
    const startOfWeek = new Date(today)
    startOfWeek.setDate(today.getDate() - today.getDay())

    let html = ""
    const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]

    for (let i = 0; i < 7; i++) {
      const date = new Date(startOfWeek)
      date.setDate(startOfWeek.getDate() + i)

      const habitsForDay = this.habits.filter(
        (habit) => habit.days && Array.isArray(habit.days) && habit.days.includes(date.getDay()),
      )
      const completedForDay = habitsForDay.filter((habit) => this.isHabitCompleted(habit.id, date)).length

      const percentage = habitsForDay.length > 0 ? (completedForDay / habitsForDay.length) * 100 : 0
      const height = Math.max(4, percentage)

      html += `<div class="chart-bar" 
                        style="height: ${height}%" 
                        data-day="${dayNames[i]}"
                        title="${completedForDay}/${habitsForDay.length} completados"></div>`
    }

    container.innerHTML = html
  }

  renderTopHabits() {
    const container = document.getElementById("topHabits")

    const habitStats = this.habits
      .map((habit) => {
        const streak = this.calculateStreak(habit.id)
        const weeklyProgress = this.calculateWeeklyProgress(habit.id)
        const completionRate =
          weeklyProgress.total > 0 ? Math.round((weeklyProgress.completed / weeklyProgress.total) * 100) : 0

        return {
          ...habit,
          streak,
          completionRate,
          score: streak * 2 + completionRate,
        }
      })
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)

    if (habitStats.length === 0) {
      container.innerHTML = '<p class="empty-state">No hay datos suficientes aún</p>'
      return
    }

    container.innerHTML = habitStats
      .map(
        (habit) => `
          <div class="top-habit-item">
              <div class="top-habit-name">${habit.name}</div>
              <div class="top-habit-score">${habit.completionRate}% esta semana</div>
          </div>
      `,
      )
      .join("")
  }

  // En la clase HabitTracker, reemplazar exportData():
  exportData() {
    const data = getUnifiedData()

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `productividad-backup-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    this.showHabitToast("Todos los datos exportados correctamente", "success")
  }

  exportStats() {
    const stats = this.habits.map((habit) => {
      const completedDays = Object.keys(this.completions).filter(
        (date) => this.completions[date] && this.completions[date][habit.id],
      ).length

      const longestStreak = this.calculateStreak(habit.id)
      const currentStreak = this.calculateStreak(habit.id)
      const weeklyProgress = this.calculateWeeklyProgress(habit.id)

      return {
        nombre: habit.name,
        categoria: habit.category,
        diasProgramados: habit.days.map((d) => this.getDayName(d)).join(", "),
        totalDiasCompletados: completedDays,
        rachaActual: currentStreak,
        completacionSemanal: `${weeklyProgress.completed}/${weeklyProgress.total}`,
        metaSemanal: habit.goal || "No definida",
        horarioRecordatorio: habit.time || "No definido",
        notas: habit.notes || "Sin notas",
        fechaCreacion: new Date(habit.createdAt).toLocaleDateString("es-ES"),
      }
    })

    const txtContent = `
╔══════════════════════════════════════════════════════════════╗
║                    📊 ESTADÍSTICAS DE HÁBITOS                ║
║                     ${new Date().toLocaleDateString("es-ES")}                        ║
╚══════════════════════════════════════════════════════════════╝

📈 RESUMEN GENERAL
═══════════════════════════════════════════════════════════════
• Total de hábitos: ${this.habits.length}
• Hábitos programados hoy: ${this.getHabitsForToday().length}
• Completados hoy: ${this.getHabitsForToday().filter((h) => this.isHabitCompleted(h.id, this.currentDate)).length}/${this.getHabitsForToday().length}
• Racha más larga: ${Math.max(0, ...this.habits.map((habit) => this.calculateStreak(habit.id)))} días

🎯 DETALLE DE HÁBITOS
═══════════════════════════════════════════════════════════════
${stats
  .map(
    (habit) => `
📌 ${habit.nombre.toUpperCase()}
   Categoría: ${habit.categoria}
   Días programados: ${habit.diasProgramados}
   Total completados: ${habit.totalDiasCompletados} días
   Racha actual: ${habit.rachaActual} días
   Completación semanal: ${habit.completacionSemanal}
   Meta semanal: ${habit.metaSemanal}
   Recordatorio: ${habit.horarioRecordatorio}
   Notas: ${habit.notas}
   Creado: ${habit.fechaCreacion}
   ${"─".repeat(60)}
`,
  )
  .join("")}

═══════════════════════════════════════════════════════════════
Generado por Tracker de Hábitos - ${new Date().toLocaleString("es-ES")}
═══════════════════════════════════════════════════════════════
`

    const blob = new Blob([txtContent], { type: "text/plain;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `estadisticas-habitos-${new Date().toISOString().split("T")[0]}.txt`
    a.click()
    URL.revokeObjectURL(url)

    this.showHabitToast("Estadísticas exportadas en formato TXT", "success")
  }

  // En la clase HabitTracker, reemplazar importData():
  importData(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)

        // Verificar si es el formato nuevo unificado o el formato antiguo
        if (data.habits !== undefined || data.journalEntries !== undefined || data.goals !== undefined) {
          if (confirm("¿Quieres reemplazar todos tus datos actuales? Esta acción no se puede deshacer.")) {
            // Migrar datos del formato antiguo si es necesario
            const unifiedData = {
              habits: data.habits || [],
              completions: data.completions || {},
              journalEntries: data.journalEntries || JSON.parse(localStorage.getItem("journalEntries") || "[]"),
              goals: data.goals || JSON.parse(localStorage.getItem("goals") || "[]"),
              version: "3.0",
              lastUpdated: new Date().toISOString(),
            }

            localStorage.setItem("productivityData", JSON.stringify(unifiedData))

            // Limpiar datos antiguos
            localStorage.removeItem("habits")
            localStorage.removeItem("completions")
            localStorage.removeItem("journalEntries")
            localStorage.removeItem("goals")

            // Recargar datos
            const newData = getUnifiedData()
            this.habits = newData.habits
            this.completions = newData.completions

            this.initHabits()
            loadJournalEntries()
            loadGoals()
            renderJournalStats()

            this.showHabitToast("Todos los datos importados correctamente", "success")
          }
        } else {
          this.showHabitToast("Archivo de datos inválido", "error")
        }
      } catch (error) {
        this.showHabitToast("Error al leer el archivo", "error")
      }
    }
    reader.readAsText(file)

    // Reset file input
    e.target.value = ""
  }

  showHabitToast(message, type = "success") {
    const container = document.getElementById("toastContainer")
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.textContent = message

    container.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  // En la clase HabitTracker, reemplazar saveHabitsToStorage():
  saveHabitsToStorage() {
    try {
      saveUnifiedData({
        habits: this.habits,
        completions: this.completions,
      })
    } catch (error) {
      this.showHabitToast("Error al guardar datos", "error")
    }
  }
}

// Inicializar el tracker de hábitos cuando se carga la página
let habitTracker
document.addEventListener("DOMContentLoaded", () => {
  // Esperar un poco para asegurar que todo esté cargado
  setTimeout(() => {
    habitTracker = new HabitTracker()
  }, 100)
})

// ==================== ESTADÍSTICAS DEL JOURNAL ====================

function setupJournalTabs() {
  document.querySelectorAll(".journal-tab-btn").forEach((btn) => {
    btn.addEventListener("click", (e) => {
      const tabName = e.target.dataset.tab

      // Cambiar tabs activos
      document.querySelectorAll(".journal-tab-btn").forEach((b) => b.classList.remove("active"))
      document.querySelectorAll(".journal-tab-content").forEach((c) => c.classList.remove("active"))

      e.target.classList.add("active")
      document.getElementById(`journal-${tabName}-tab`).classList.add("active")

      if (tabName === "stats") {
        renderJournalStats()
      }
    })
  })
}

function renderJournalStats() {
  const entries = getJournalEntries()

  // Estadísticas generales
  document.getElementById("totalEntries").textContent = entries.length

  const uniqueDays = new Set(entries.map((entry) => entry.date.split("T")[0])).size
  document.getElementById("activeDays").textContent = uniqueDays

  // Estado de ánimo promedio
  const moodValues = { "😍 Excelente": 5, "😊 Bueno": 4, "😐 Meh": 3, "😞 Malo": 2, "😡 Horrible": 1 }
  const entriesWithMood = entries.filter((entry) => entry.mood)

  if (entriesWithMood.length > 0) {
    const avgMood =
      entriesWithMood.reduce((sum, entry) => sum + (moodValues[entry.mood] || 3), 0) / entriesWithMood.length
    const avgMoodText = Object.keys(moodValues).find((key) => moodValues[key] === Math.round(avgMood)) || "😐 Meh"
    document.getElementById("averageMood").textContent = avgMoodText.split(" ")[0]
  } else {
    document.getElementById("averageMood").textContent = "-"
  }

  // Renderizar gráficos
  renderMoodChart(entries)
  renderTopTags(entries)
  renderMoodDistribution(entries)
}

function renderMoodChart(entries) {
  const container = document.getElementById("moodChart")
  const moodValues = { "😍 Excelente": 5, "😊 Bueno": 4, "😐 Meh": 3, "😞 Malo": 2, "😡 Horrible": 1 }

  // Obtener últimos 14 días
  const last14Days = []
  for (let i = 13; i >= 0; i--) {
    const date = new Date()
    date.setDate(date.getDate() - i)
    last14Days.push(date.toISOString().split("T")[0])
  }

  let html = ""
  last14Days.forEach((dateStr) => {
    const dayEntries = entries.filter((entry) => entry.date.split("T")[0] === dateStr && entry.mood)
    let avgMood = 0

    if (dayEntries.length > 0) {
      avgMood = dayEntries.reduce((sum, entry) => sum + (moodValues[entry.mood] || 3), 0) / dayEntries.length
    }

    const height = avgMood > 0 ? (avgMood / 5) * 100 : 5
    const date = new Date(dateStr)
    const dayName = date.toLocaleDateString("es-ES", { weekday: "short", day: "numeric" })

    html += `<div class="mood-bar" 
                  style="height: ${height}%" 
                  data-date="${dayName}"
                  title="Promedio: ${avgMood.toFixed(1)}/5"></div>`
  })

  container.innerHTML = html
}

function renderTopTags(entries) {
  const container = document.getElementById("topTags")
  const tagCounts = {}

  entries.forEach((entry) => {
    if (entry.tags) {
      entry.tags.forEach((tag) => {
        tagCounts[tag] = (tagCounts[tag] || 0) + 1
      })
    }
  })

  const sortedTags = Object.entries(tagCounts)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10)

  if (sortedTags.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">No hay etiquetas aún</p>'
    return
  }

  container.innerHTML = sortedTags
    .map(
      ([tag, count]) => `
      <div class="tag-stat-item">
        <span class="tag-name">${tag}</span>
        <span class="tag-count">${count}</span>
      </div>
    `,
    )
    .join("")
}

function renderMoodDistribution(entries) {
  const container = document.getElementById("moodDistribution")
  const moodCounts = {
    "😍 Excelente": 0,
    "😊 Bueno": 0,
    "😐 Meh": 0,
    "😞 Malo": 0,
    "😡 Horrible": 0,
  }

  entries.forEach((entry) => {
    if (entry.mood && moodCounts.hasOwnProperty(entry.mood)) {
      moodCounts[entry.mood]++
    }
  })

  const total = Object.values(moodCounts).reduce((sum, count) => sum + count, 0)

  if (total === 0) {
    container.innerHTML = '<p style="text-align: center; color: #666;">No hay datos de estado de ánimo aún</p>'
    return
  }

  container.innerHTML = Object.entries(moodCounts)
    .map(([mood, count]) => {
      const percentage = (count / total) * 100
      const [emoji, text] = mood.split(" ")

      return `
        <div class="mood-dist-item">
          <span class="mood-dist-emoji">${emoji}</span>
          <div class="mood-dist-bar-container">
            <div class="mood-dist-bar" style="width: ${percentage}%"></div>
          </div>
          <span class="mood-dist-count">${count}</span>
        </div>
      `
    })
    .join("")
}

function getDeadlineInfo(deadline) {
  if (!deadline) {
    return { html: "" }
  }

  const deadlineDate = new Date(deadline)
  const today = new Date()
  const diffTime = deadlineDate - today
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  let countdownClass = "goal-countdown"
  let countdownText = ""

  if (diffDays < 0) {
    countdownClass += " completed"
    countdownText = `⏰ Venció hace ${Math.abs(diffDays)} días`
  } else if (diffDays === 0) {
    countdownClass += " urgent"
    countdownText = "⏰ ¡Hoy es el límite!"
  } else if (diffDays <= 3) {
    countdownClass += " urgent"
    countdownText = `⏰ ${diffDays} días restantes`
  } else {
    countdownText = `⏰ ${diffDays} días restantes`
  }

  const deadlineFormatted = deadlineDate.toLocaleDateString("es-ES", {
    day: "numeric",
    month: "short",
  })

  return {
    html: `
      <span class="goal-deadline">📅 ${deadlineFormatted}</span>
      <span class="${countdownClass}">${countdownText}</span>
    `,
  }
}

// Agregar función de migración automática al inicializar la app:
function migrateOldData() {
  // Verificar si existen datos en el formato antiguo
  const oldHabits = localStorage.getItem("habits")
  const oldCompletions = localStorage.getItem("completions")
  const oldJournal = localStorage.getItem("journalEntries")
  const oldGoals = localStorage.getItem("goals")
  const newData = localStorage.getItem("productivityData")

  if (!newData && (oldHabits || oldCompletions || oldJournal || oldGoals)) {
    console.log("Migrando datos del formato antiguo...")

    const unifiedData = {
      habits: JSON.parse(oldHabits || "[]"),
      completions: JSON.parse(oldCompletions || "{}"),
      journalEntries: JSON.parse(oldJournal || "[]"),
      goals: JSON.parse(oldGoals || "[]"),
      version: "3.0",
      lastUpdated: new Date().toISOString(),
    }

    localStorage.setItem("productivityData", JSON.stringify(unifiedData))

    // Limpiar datos antiguos
    localStorage.removeItem("habits")
    localStorage.removeItem("completions")
    localStorage.removeItem("journalEntries")
    localStorage.removeItem("goals")

    showMessage("📦 Datos migrados al nuevo formato unificado")
  }
}
