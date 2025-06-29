class HabitTracker {
  constructor() {
    this.habits = JSON.parse(localStorage.getItem("habits")) || []
    this.completions = JSON.parse(localStorage.getItem("completions")) || {}
    this.currentDate = new Date()
    this.currentCalendarDate = new Date()
    this.selectedHabitForCalendar = ""
    this.editingHabitId = null
    this.currentFilter = "all"
    this.currentView = "grid"
    this.searchQuery = ""

    this.init()
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

    this.saveToStorage()
  }

  init() {
    this.cleanupHabits() // Añadir esta línea
    this.setupEventListeners()
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

  setupEventListeners() {
    // Tabs
    document.querySelectorAll(".tab-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.switchTab(e.target.dataset.tab))
    })

    // Modal
    document.getElementById("addHabitBtn").addEventListener("click", () => this.openModal())
    document.querySelector(".close-btn").addEventListener("click", () => this.closeModal())
    document.getElementById("cancelBtn").addEventListener("click", () => this.closeModal())
    document.getElementById("habitForm").addEventListener("submit", (e) => this.saveHabit(e))

    // Habit type change
    document.getElementById("habitType").addEventListener("change", (e) => this.handleHabitTypeChange(e.target.value))

    // Color picker
    document.querySelectorAll(".color-option").forEach((option) => {
      option.addEventListener("click", (e) => {
        document.getElementById("habitColor").value = e.target.dataset.color
      })
    })

    // Search and filters
    document.getElementById("searchHabits").addEventListener("input", (e) => {
      this.searchQuery = e.target.value.toLowerCase()
      this.renderAllHabits()
    })

    document.querySelectorAll(".filter-btn").forEach((btn) => {
      btn.addEventListener("click", (e) => this.setFilter(e.target.dataset.category))
    })

    // View options
    document.querySelectorAll(".view-btn").forEach((btn) => {
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

    // Keyboard shortcuts
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && document.getElementById("habitModal").style.display === "block") {
        this.closeModal()
      }
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
    document.querySelectorAll(".filter-btn").forEach((btn) => btn.classList.remove("active"))
    document.querySelector(`[data-category="${category}"]`).classList.add("active")
    this.renderAllHabits()
  }

  setView(view) {
    this.currentView = view
    document.querySelectorAll(".view-btn").forEach((btn) => btn.classList.remove("active"))
    document.querySelector(`[data-view="${view}"]`).classList.add("active")

    const container = document.getElementById("allHabits")
    if (view === "list") {
      container.classList.add("list-view")
    } else {
      container.classList.remove("list-view")
    }
  }

  switchTab(tabName) {
    document.querySelectorAll(".tab-btn").forEach((btn) => btn.classList.remove("active"))
    document.querySelectorAll(".tab-content").forEach((content) => content.classList.remove("active"))

    document.querySelector(`[data-tab="${tabName}"]`).classList.add("active")
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
        this.showToast("Hábito no encontrado", "error")
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

    console.log("Guardando hábito...") // Debug

    const name = document.getElementById("habitName").value.trim()
    const category = document.getElementById("habitCategory").value.trim() || "General"
    const color = document.getElementById("habitColor").value
    const time = document.getElementById("habitTime").value
    const goal = Number.parseInt(document.getElementById("habitGoal").value) || null
    const notes = document.getElementById("habitNotes").value.trim()

    // Obtener días seleccionados - CORREGIDO
    const dayCheckboxes = document.querySelectorAll('.days-selector input[type="checkbox"]:checked')
    const days = []
    dayCheckboxes.forEach((checkbox) => {
      days.push(Number.parseInt(checkbox.value))
    })

    console.log("Días seleccionados:", days) // Debug

    // Validaciones
    if (!name) {
      this.showToast("Por favor ingresa un nombre para el hábito", "error")
      document.getElementById("habitName").focus()
      return
    }

    if (days.length === 0) {
      this.showToast("Por favor selecciona al menos un día", "error")
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

    console.log("Hábito a guardar:", habit) // Debug

    // Guardar hábito
    if (this.editingHabitId) {
      const index = this.habits.findIndex((h) => h.id === this.editingHabitId)
      if (index !== -1) {
        this.habits[index] = habit
        this.showToast("Hábito actualizado correctamente", "success")
      }
    } else {
      this.habits.push(habit)
      this.showToast("Hábito creado correctamente", "success")
    }

    console.log("Lista de hábitos después de guardar:", this.habits) // Debug

    // Guardar en localStorage
    this.saveToStorage()

    // Actualizar todas las vistas
    this.updateProgressSummary()
    this.renderTodayHabits()
    this.renderAllHabits()
    this.updateCalendarHabitSelector()
    this.updateCategoryFilters()
    this.updateCategoryDatalist()

    // Cerrar modal
    this.closeModal()

    // Cambiar a la pestaña "Todos" para mostrar el hábito creado
    if (!this.editingHabitId) {
      setTimeout(() => {
        this.switchTab("all")
      }, 100)
    }
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

      this.saveToStorage()
      this.updateProgressSummary()
      this.renderTodayHabits()
      this.renderAllHabits()
      this.updateCalendarHabitSelector()
      this.updateCategoryFilters()
      this.showToast("Hábito eliminado", "success")
    }
  }

  toggleHabitCompletion(habitId, date = null) {
    const dateKey = date || this.formatDate(this.currentDate)

    if (!this.completions[dateKey]) {
      this.completions[dateKey] = {}
    }

    const wasCompleted = this.completions[dateKey][habitId]
    this.completions[dateKey][habitId] = !wasCompleted

    this.saveToStorage()
    this.updateProgressSummary()
    this.renderTodayHabits()
    this.renderCalendar()

    const habit = this.habits.find((h) => h.id === habitId)
    if (habit) {
      const message = wasCompleted ? `❌ ${habit.name} marcado como no completado` : `✅ ¡${habit.name} completado!`
      this.showToast(message, wasCompleted ? "error" : "success")
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

  calculateMonthlyCompletion(habitId) {
    const habit = this.habits.find((h) => h.id === habitId)
    if (!habit) return 0

    const now = new Date()
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

    let scheduled = 0
    let completed = 0

    for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
      if (habit.days.includes(d.getDay())) {
        scheduled++
        if (this.isHabitCompleted(habitId, d)) {
          completed++
        }
      }
    }

    return scheduled > 0 ? Math.round((completed / scheduled) * 100) : 0
  }

  calculateLongestStreak(habitId) {
    const habit = this.habits.find((h) => h.id === habitId)
    if (!habit) return 0

    let longestStreak = 0
    let currentStreak = 0

    // Obtener todas las fechas ordenadas
    const allDates = Object.keys(this.completions).sort()

    // Crear un rango de fechas desde la creación del hábito hasta hoy
    const startDate = new Date(habit.createdAt)
    const endDate = new Date()
    const dateRange = []

    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      dateRange.push(this.formatDate(new Date(d)))
    }

    dateRange.forEach((dateKey) => {
      const date = new Date(dateKey)

      // Solo considerar días programados
      if (habit.days.includes(date.getDay())) {
        if (this.completions[dateKey] && this.completions[dateKey][habitId]) {
          currentStreak++
          longestStreak = Math.max(longestStreak, currentStreak)
        } else {
          currentStreak = 0
        }
      }
    })

    return longestStreak
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

  getCategoryStats() {
    const categories = [...new Set(this.habits.map((h) => h.category))]

    return categories
      .map((category) => {
        const categoryHabits = this.habits.filter((h) => h.category === category)
        const totalHabits = categoryHabits.length

        let totalScheduled = 0
        let totalCompleted = 0

        // Calcular para este mes
        const now = new Date()
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0)

        categoryHabits.forEach((habit) => {
          for (let d = new Date(firstDay); d <= lastDay; d.setDate(d.getDate() + 1)) {
            if (habit.days.includes(d.getDay())) {
              totalScheduled++
              if (this.isHabitCompleted(habit.id, d)) {
                totalCompleted++
              }
            }
          }
        })

        const completionRate = totalScheduled > 0 ? Math.round((totalCompleted / totalScheduled) * 100) : 0

        return {
          name: category,
          habits: totalHabits,
          completionRate,
          totalCompleted,
          totalScheduled,
        }
      })
      .sort((a, b) => b.completionRate - a.completionRate)
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

    this.setupDragAndDrop(container)
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

    this.setupDragAndDrop(container)
  }

  setupDragAndDrop(container) {
    const cards = container.querySelectorAll(".habit-card")

    cards.forEach((card) => {
      card.addEventListener("dragstart", (e) => {
        card.classList.add("dragging")
        e.dataTransfer.setData("text/plain", card.dataset.habitId)
      })

      card.addEventListener("dragend", () => {
        card.classList.remove("dragging")
      })

      card.addEventListener("dragover", (e) => {
        e.preventDefault()
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

    const draggedHabit = this.habits[draggedIndex]
    this.habits.splice(draggedIndex, 1)
    this.habits.splice(targetIndex, 0, draggedHabit)

    // Update order values
    this.habits.forEach((habit, index) => {
      habit.order = index
    })

    this.saveToStorage()
    this.renderTodayHabits()
    this.renderAllHabits()
    this.showToast("Orden actualizado", "success")
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
    const longestStreak = Math.max(0, ...this.habits.map((habit) => this.calculateLongestStreak(habit.id)))

    // Calcular promedio mensual
    const monthlyRates = this.habits.map((habit) => this.calculateMonthlyCompletion(habit.id))
    const avgMonthlyCompletion =
      monthlyRates.length > 0 ? Math.round(monthlyRates.reduce((a, b) => a + b, 0) / monthlyRates.length) : 0

    // Calcular días activos (días en los que se completó al menos un hábito)
    const activeDays = Object.keys(this.completions).filter((date) => {
      return Object.values(this.completions[date]).some((completed) => completed)
    }).length

    document.getElementById("totalHabits").textContent = totalHabits
    document.getElementById("completedToday").textContent = `${completedToday}/${todayHabits.length}`
    document.getElementById("longestStreak").textContent = `${longestStreak} días`

    // Actualizar estadísticas adicionales
    const statsContainer = document.querySelector(".stats-grid")

    statsContainer.innerHTML = `
    <div class="stat-card highlight">
      <h3>📊 Resumen General</h3>
      <div class="stat-item">
        <span>Total de hábitos:</span>
        <strong>${totalHabits}</strong>
      </div>
      <div class="stat-item">
        <span>Completados hoy:</span>
        <strong>${completedToday}/${todayHabits.length}</strong>
      </div>
      <div class="stat-item">
        <span>Racha más larga:</span>
        <strong>${longestStreak} días</strong>
      </div>
      <div class="stat-item">
        <span>Días activos:</span>
        <strong>${activeDays}</strong>
      </div>
    </div>
    
    <div class="stat-card">
      <h3>📈 Rendimiento Mensual</h3>
      <div class="progress-ring">
        <svg>
          <circle class="bg" cx="40" cy="40" r="32" stroke-dasharray="201" stroke-dashoffset="0"></circle>
          <circle class="progress" cx="40" cy="40" r="32" stroke-dasharray="201" stroke-dashoffset="${201 - (201 * avgMonthlyCompletion) / 100}"></circle>
        </svg>
      </div>
      <div class="stat-number">${avgMonthlyCompletion}%</div>
      <div class="stat-label">Promedio de completación</div>
    </div>
    
    <div class="stat-card">
      <h3>📅 Esta Semana</h3>
      <div id="weeklyChart" class="chart-container"></div>
    </div>
    
    <div class="stat-card">
      <h3>🏆 Mejores Hábitos</h3>
      <div id="topHabits" class="top-habits-list"></div>
    </div>
    
    <div class="stat-card">
      <h3>📂 Por Categorías</h3>
      <div id="categoryStats" class="category-stats"></div>
    </div>
    
    <div class="stat-card">
      <h3>🎯 Hábitos Más Consistentes</h3>
      <div id="consistentHabits" class="top-habits-list"></div>
    </div>
  `

    // Renderizar gráficos específicos
    this.renderWeeklyChart()
    this.renderTopHabits()
    this.renderCategoryStats()
    this.renderConsistentHabits()
  }

  renderCategoryStats() {
    const container = document.getElementById("categoryStats")
    const categoryStats = this.getCategoryStats()

    if (categoryStats.length === 0) {
      container.innerHTML = '<p class="empty-state">No hay categorías aún</p>'
      return
    }

    container.innerHTML = categoryStats
      .map(
        (category) => `
    <div class="category-item">
      <div>
        <div class="category-name">${category.name}</div>
        <small>${category.habits} hábito${category.habits !== 1 ? "s" : ""}</small>
      </div>
      <div class="category-progress">
        <div class="category-bar">
          <div class="category-fill" style="width: ${category.completionRate}%"></div>
        </div>
        <strong>${category.completionRate}%</strong>
      </div>
    </div>
  `,
      )
      .join("")
  }

  renderConsistentHabits() {
    const container = document.getElementById("consistentHabits")

    const consistentHabits = this.habits
      .map((habit) => {
        const longestStreak = this.calculateLongestStreak(habit.id)
        const currentStreak = this.calculateStreak(habit.id)
        const monthlyCompletion = this.calculateMonthlyCompletion(habit.id)

        // Puntuación de consistencia basada en racha actual, racha más larga y completación mensual
        const consistencyScore = currentStreak * 0.4 + longestStreak * 0.3 + monthlyCompletion * 0.3

        return {
          ...habit,
          consistencyScore: Math.round(consistencyScore),
          currentStreak,
          longestStreak,
          monthlyCompletion,
        }
      })
      .sort((a, b) => b.consistencyScore - a.consistencyScore)
      .slice(0, 5)

    if (consistentHabits.length === 0) {
      container.innerHTML = '<p class="empty-state">No hay datos suficientes aún</p>'
      return
    }

    container.innerHTML = consistentHabits
      .map(
        (habit) => `
    <div class="top-habit-item">
      <div>
        <div class="top-habit-name">${habit.name}</div>
        <small>🔥 ${habit.currentStreak} días actuales</small>
      </div>
      <div class="top-habit-score">${habit.consistencyScore} pts</div>
    </div>
  `,
      )
      .join("")
  }

  exportStats() {
    const stats = this.habits.map((habit) => {
      const completedDays = Object.keys(this.completions).filter(
        (date) => this.completions[date] && this.completions[date][habit.id],
      ).length

      const longestStreak = this.calculateLongestStreak(habit.id)
      const currentStreak = this.calculateStreak(habit.id)
      const monthlyCompletion = this.calculateMonthlyCompletion(habit.id)
      const weeklyProgress = this.calculateWeeklyProgress(habit.id)

      return {
        nombre: habit.name,
        categoria: habit.category,
        diasProgramados: habit.days.map((d) => this.getDayName(d)).join(", "),
        totalDiasCompletados: completedDays,
        rachaMasLarga: longestStreak,
        rachaActual: currentStreak,
        completacionMensual: `${monthlyCompletion}%`,
        completacionSemanal: `${weeklyProgress.completed}/${weeklyProgress.total}`,
        metaSemanal: habit.goal || "No definida",
        horarioRecordatorio: habit.time || "No definido",
        notas: habit.notes || "Sin notas",
        fechaCreacion: new Date(habit.createdAt).toLocaleDateString("es-ES"),
      }
    })

    // Estadísticas generales
    const generalStats = {
      totalHabitos: this.habits.length,
      habitosHoy: this.getHabitsForToday().length,
      completadosHoy: this.getHabitsForToday().filter((h) => this.isHabitCompleted(h.id, this.currentDate)).length,
      rachaMasLarga: Math.max(0, ...this.habits.map((h) => this.calculateLongestStreak(h.id))),
      promedioMensual:
        Math.round(
          this.habits.map((h) => this.calculateMonthlyCompletion(h.id)).reduce((a, b) => a + b, 0) / this.habits.length,
        ) || 0,
    }

    const categoryStats = this.getCategoryStats()

    // Crear contenido del archivo TXT
    const txtContent = `
╔══════════════════════════════════════════════════════════════╗
║                    📊 ESTADÍSTICAS DE HÁBITOS                ║
║                     ${new Date().toLocaleDateString("es-ES")}                        ║
╚══════════════════════════════════════════════════════════════╝

📈 RESUMEN GENERAL
═══════════════════════════════════════════════════════════════
• Total de hábitos: ${generalStats.totalHabitos}
• Hábitos programados hoy: ${generalStats.habitosHoy}
• Completados hoy: ${generalStats.completadosHoy}/${generalStats.habitosHoy}
• Racha más larga: ${generalStats.rachaMasLarga} días
• Promedio mensual: ${generalStats.promedioMensual}%

📂 ESTADÍSTICAS POR CATEGORÍA
═══════════════════════════════════════════════════════════════
${categoryStats
  .map((cat) => `• ${cat.name}: ${cat.completionRate}% (${cat.habits} hábito${cat.habits !== 1 ? "s" : ""})`)
  .join("\n")}

🎯 DETALLE DE HÁBITOS
═══════════════════════════════════════════════════════════════
${stats
  .map(
    (habit) => `
📌 ${habit.nombre.toUpperCase()}
   Categoría: ${habit.categoria}
   Días programados: ${habit.diasProgramados}
   Total completados: ${habit.totalDiasCompletados} días
   Racha más larga: ${habit.rachaMasLarga} días
   Racha actual: ${habit.rachaActual} días
   Completación mensual: ${habit.completacionMensual}
   Completación semanal: ${habit.completacionSemanal}
   Meta semanal: ${habit.metaSemanal}
   Recordatorio: ${habit.horarioRecordatorio}
   Notas: ${habit.notas}
   Creado: ${habit.fechaCreacion}
   ${"─".repeat(60)}
`,
  )
  .join("")}

🏆 HÁBITOS MÁS CONSISTENTES
═══════════════════════════════════════════════════════════════
${this.habits
  .map((habit) => {
    const consistency =
      this.calculateStreak(habit.id) + this.calculateLongestStreak(habit.id) + this.calculateMonthlyCompletion(habit.id)
    return { name: habit.name, score: consistency }
  })
  .sort((a, b) => b.score - a.score)
  .slice(0, 5)
  .map((habit, index) => `${index + 1}. ${habit.name} (${Math.round(habit.score)} puntos)`)
  .join("\n")}

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

    this.showToast("Estadísticas exportadas en formato TXT", "success")
  }

  convertToCSV(data) {
    if (data.length === 0) return ""

    const headers = Object.keys(data[0])
    const csvHeaders = headers.join(",")

    const csvRows = data.map((row) =>
      headers
        .map((header) => {
          const value = row[header]
          return typeof value === "string" && value.includes(",") ? `"${value}"` : value
        })
        .join(","),
    )

    return [csvHeaders, ...csvRows].join("\n")
  }

  showToast(message, type = "success") {
    const container = document.getElementById("toastContainer")
    const toast = document.createElement("div")
    toast.className = `toast ${type}`
    toast.textContent = message

    container.appendChild(toast)

    setTimeout(() => {
      toast.remove()
    }, 3000)
  }

  exportData() {
    const data = {
      habits: this.habits,
      completions: this.completions,
      exportDate: new Date().toISOString(),
      version: "2.0",
    }

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `habitos-backup-${new Date().toISOString().split("T")[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    this.showToast("Datos exportados correctamente", "success")
  }

  importData(e) {
    const file = e.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target.result)

        if (data.habits && data.completions) {
          if (confirm("¿Quieres reemplazar todos tus datos actuales? Esta acción no se puede deshacer.")) {
            this.habits = data.habits
            this.completions = data.completions
            this.saveToStorage()
            this.init() // Re-initialize everything
            this.showToast("Datos importados correctamente", "success")
          }
        } else {
          this.showToast("Archivo de datos inválido", "error")
        }
      } catch (error) {
        this.showToast("Error al leer el archivo", "error")
      }
    }
    reader.readAsText(file)

    // Reset file input
    e.target.value = ""
  }

  saveToStorage() {
    try {
      localStorage.setItem("habits", JSON.stringify(this.habits))
      localStorage.setItem("completions", JSON.stringify(this.completions))
    } catch (error) {
      this.showToast("Error al guardar datos", "error")
    }
  }
}

// Initialize the app
const habitTracker = new HabitTracker()

// Service Worker for offline functionality (optional)
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("SW registered: ", registration)
      })
      .catch((registrationError) => {
        console.log("SW registration failed: ", registrationError)
      })
  })
}
