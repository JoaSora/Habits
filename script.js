// Variables de estado del calendario
let mesActual = new Date().getMonth();
let añoActual = new Date().getFullYear();

// Utilidades
function obtenerHabitos() {
  return JSON.parse(localStorage.getItem("habitos")) || [];
}

function guardarHabitos(habitos) {
  localStorage.setItem("habitos", JSON.stringify(habitos));
}

// Renderizar los hábitos
function renderizarHabitos() {
  const hoy = new Date().getDay();
  const contenedorHoy = document.getElementById("today-habits");
  const contenedorTodos = document.getElementById("all-habits");
  contenedorHoy.innerHTML = "";
  contenedorTodos.innerHTML = "";

  const habitos = obtenerHabitos();

  habitos.forEach((habito, index) => {
    const tarjeta = document.createElement("div");
    tarjeta.classList.add("habit-card", habito.categoria);
    tarjeta.innerHTML = `
      <strong>${habito.nombre}</strong><br/>
      <small>Días: ${habito.dias.map((d) => "DLMXJVS"[d]).join(", ")}</small><br/>
      <small>Meta: ${habito.meta || "—"}</small>
      <div class="habit-buttons">
        <button onclick="editarHabito(${index})">Editar</button>
        <button onclick="eliminarHabito(${index})">Eliminar</button>
      </div>
      <div class="calendar" id="cal-${index}"></div>
    `;

    tarjeta.addEventListener("click", (e) => {
  if (!e.target.closest(".habit-buttons")) {
    const calendario = tarjeta.querySelector(".calendar");

    // Alternar visibilidad
    if (calendario.style.display === "grid") {
      calendario.style.display = "none";
    } else {
      calendario.style.display = "grid";
      renderizarCalendario(index, habito);
    }
  }
});

    contenedorTodos.appendChild(tarjeta);
    if (habito.dias.includes(hoy)) {
    const tarjetaHoy = tarjeta.cloneNode(true);
    tarjetaHoy.querySelector(".calendar").id = `cal-hoy-${index}`;
    tarjetaHoy.addEventListener("click", (e) => {
    if (!e.target.closest(".habit-buttons")) {
      const calendario = tarjetaHoy.querySelector(".calendar");
      calendario.style.display = calendario.style.display === "grid" ? "none" : "grid";
      renderizarCalendarioHoy(index, habito);
    }
    });
    const botonCompletado = document.createElement("button");
botonCompletado.textContent = "✔ Completado";
botonCompletado.style.marginTop = "8px";
botonCompletado.onclick = (e) => {
  e.stopPropagation();
  const hoyFecha = new Date();
  const dia = hoyFecha.getDate();
  const mes = hoyFecha.getMonth();
  const año = hoyFecha.getFullYear();

  let historial = habito.historial || {};
  let mesHistorial = historial[`${año}-${mes}`] || [];

  if (!mesHistorial.includes(dia)) {
    mesHistorial.push(dia);
  }

  historial[`${año}-${mes}`] = mesHistorial;
  habito.historial = historial;

  const habitos = obtenerHabitos();
  habitos[index] = habito;
  guardarHabitos(habitos);
  renderizarHabitos();
};

tarjetaHoy.appendChild(botonCompletado);

    contenedorHoy.appendChild(tarjetaHoy);
    }
  });
}

// Esta función convierte un número de mes en su abreviatura
function abrevMes(mes) {
  return ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"][mes];
}

function renderizarCalendarioHoy(index, habito) {
  const calendario = document.getElementById(`cal-hoy-${index}`);
  if (!calendario) return;
  calendario.innerHTML = "";

  const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
  const primerDiaSemana = new Date(añoActual, mesActual, 1).getDay();
  const completados = habito.historial?.[`${añoActual}-${mesActual}`] || [];

  const titulo = document.createElement("div");
  titulo.className = "calendar-month-title";
  titulo.innerHTML = `
    <button onclick="cambiarMesHoy(-1, ${index})">⬅️</button>
    ${abrevMes(mesActual)} ${añoActual}
    <button onclick="cambiarMesHoy(1, ${index})">➡️</button>
  `;
  calendario.appendChild(titulo);

  for (let i = 0; i < primerDiaSemana; i++) {
    const vacio = document.createElement("div");
    vacio.classList.add("calendar-day");
    calendario.appendChild(vacio);
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const celda = document.createElement("div");
    celda.classList.add("calendar-day");
    if (completados.includes(d)) {
      celda.classList.add("completed", habito.categoria);
    }
    celda.innerHTML = `<div class="day-number">${d}</div>`;
    celda.addEventListener("click", (e) => {
      e.stopPropagation();
      let historial = habito.historial || {};
      let mesHistorial = historial[`${añoActual}-${mesActual}`] || [];

      if (mesHistorial.includes(d)) {
        mesHistorial = mesHistorial.filter((dia) => dia !== d);
      } else {
        mesHistorial.push(d);
      }

      historial[`${añoActual}-${mesActual}`] = mesHistorial;
      habito.historial = historial;

      const habitos = obtenerHabitos();
      habitos[index] = habito;
      guardarHabitos(habitos);
      renderizarHabitos();
    });

    calendario.appendChild(celda);
  }
}

function renderizarCalendario(index, habito) {
  const calendario = document.getElementById(`cal-${index}`);
  if (!calendario) return;
  calendario.innerHTML = "";

  const diasEnMes = new Date(añoActual, mesActual + 1, 0).getDate();
  const primerDiaSemana = new Date(añoActual, mesActual, 1).getDay();
  const completados = habito.historial?.[`${añoActual}-${mesActual}`] || [];

  const titulo = document.createElement("div");
  titulo.className = "calendar-month-title";
  titulo.innerHTML = `
    <button onclick="cambiarMes(-1, ${index})">⬅️</button>
    ${abrevMes(mesActual)} ${añoActual}
    <button onclick="cambiarMes(1, ${index})">➡️</button>
  `;
  calendario.appendChild(titulo);

  for (let i = 0; i < primerDiaSemana; i++) {
    const vacio = document.createElement("div");
    vacio.classList.add("calendar-day");
    calendario.appendChild(vacio);
  }

  for (let d = 1; d <= diasEnMes; d++) {
    const celda = document.createElement("div");
    celda.classList.add("calendar-day");
    if (completados.includes(d)) {
      celda.classList.add("completed", habito.categoria);
    }
    celda.innerHTML = `<div class="day-number">${d}</div>`;
    celda.addEventListener("click", (e) => {
      e.stopPropagation();
      let historial = habito.historial || {};
      let mesHistorial = historial[`${añoActual}-${mesActual}`] || [];

      if (mesHistorial.includes(d)) {
        mesHistorial = mesHistorial.filter((dia) => dia !== d);
      } else {
        mesHistorial.push(d);
      }

      historial[`${añoActual}-${mesActual}`] = mesHistorial;
      habito.historial = historial;

      const habitos = obtenerHabitos();
      habitos[index] = habito;
      guardarHabitos(habitos);
      renderizarHabitos();
    });

    calendario.appendChild(celda);
  }
}



function cambiarMes(direccion, index) {
  mesActual += direccion;
  if (mesActual < 0) {
    mesActual = 11;
    añoActual--;
  } else if (mesActual > 11) {
    mesActual = 0;
    añoActual++;
  }

  const habitos = obtenerHabitos();
  renderizarCalendario(index, habitos[index]);
}

function cambiarMesHoy(direccion, index) {
  mesActual += direccion;
  if (mesActual < 0) {
    mesActual = 11;
    añoActual--;
  } else if (mesActual > 11) {
    mesActual = 0;
    añoActual++;
  }

  const habitos = obtenerHabitos();
  renderizarCalendarioHoy(index, habitos[index]);
}


// Guardar hábito
document.getElementById("habit-form").addEventListener("submit", (e) => {
  e.preventDefault();
  const id = document.getElementById("habit-id").value;
  const nombre = document.getElementById("habit-name").value;
  const categoria = document.getElementById("habit-category").value;
  const meta = document.getElementById("habit-goal").value;
  const dias = [...document.querySelectorAll(".weekday-checkboxes input:checked")].map((c) => parseInt(c.value));

  const habitos = obtenerHabitos();
  const nuevo = { nombre, categoria, dias, meta };

  if (id) {
    habitos[parseInt(id)] = { ...habitos[parseInt(id)], ...nuevo };
  } else {
    habitos.push(nuevo);
  }

  guardarHabitos(habitos);
  document.getElementById("habit-form").reset();
  document.getElementById("habit-id").value = "";
  renderizarHabitos();
});

// Editar
window.editarHabito = function (index) {
  const habito = obtenerHabitos()[index];
  document.getElementById("habit-id").value = index;
  document.getElementById("habit-name").value = habito.nombre;
  document.getElementById("habit-category").value = habito.categoria;
  document.getElementById("habit-goal").value = habito.meta;

  document.querySelectorAll(".weekday-checkboxes input").forEach((c) => {
    c.checked = habito.dias.includes(parseInt(c.value));
  });
};

// Eliminar
window.eliminarHabito = function (index) {
  const habitos = obtenerHabitos();
  habitos.splice(index, 1);
  guardarHabitos(habitos);
  renderizarHabitos();
};

// Exportar JSON
document.getElementById("export-json").addEventListener("click", () => {
  const data = JSON.stringify(obtenerHabitos(), null, 2);
  const blob = new Blob([data], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "habitos.json";
  a.click();
});

// Importar JSON
document.getElementById("import-json").addEventListener("click", () => {
  document.getElementById("file-input").click();
});

document.getElementById("file-input").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = (event) => {
    const nuevos = JSON.parse(event.target.result);
    guardarHabitos(nuevos);
    renderizarHabitos();
  };
  reader.readAsText(file);
});

document.getElementById("export-txt").addEventListener("click", () => {
  const habitos = obtenerHabitos();

  const texto = habitos.map((h, i) => {
    // Encabezado
    let resultado = `HÁBITO ${i + 1}
───────────────
Nombre    : ${h.nombre}
Categoría : ${h.categoria}
Días      : ${h.dias.map((d) => "D L M X J V S"[d * 2]).join(", ")}
Meta      : ${h.meta || "—"}`;

    // Historial por mes
    if (h.historial && Object.keys(h.historial).length > 0) {
      resultado += `\nHistorial :`;

      for (const clave of Object.keys(h.historial)) {
        const [año, mes] = clave.split("-").map(Number);
        const dias = h.historial[clave];
        if (dias.length > 0) {
          resultado += `\n  ${abrevMes(mes)} ${año} → ${dias.sort((a, b) => a - b).join(", ")}`;
        }
      }
    } else {
      resultado += `\nHistorial : —`;
    }

    return resultado + "\n";
  }).join("\n");

  const blob = new Blob([texto], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "habitos.txt";
  a.click();
});


// Inicial
renderizarHabitos();
