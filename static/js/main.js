
window.addEventListener("DOMContentLoaded", () => {
  const micBtn = document.getElementById("microfono");
  let reconocimiento;

  if ('webkitSpeechRecognition' in window) {
    reconocimiento = new webkitSpeechRecognition();
    reconocimiento.lang = "es-ES";
    reconocimiento.continuous = false;
    reconocimiento.interimResults = false;

    reconocimiento.onresult = function(event) {
      const texto = event.results[0][0].transcript;
      document.getElementById("pregunta").value = texto;
    };

    reconocimiento.onerror = function(event) {
      alert("Error al reconocer voz: " + event.error);
    };
  } else if (micBtn) {
    micBtn.disabled = true;
    micBtn.title = "Reconocimiento de voz no disponible";
  }

  micBtn?.addEventListener("click", () => {
    if (reconocimiento) reconocimiento.start();
  });

  document.getElementById("ui-lang")?.addEventListener("change", cambiarIdioma);
  document.getElementById("toggle-dark")?.addEventListener("click", () => {
    document.body.classList.toggle("dark");
    localStorage.setItem("modoOscuro", document.body.classList.contains("dark"));
  });

  document.getElementById("presets")?.addEventListener("change", function () {
    const preset = this.value;
    if (preset) document.getElementById("pregunta").value = preset;
  });

  document.getElementById("modo")?.addEventListener("change", () => {
    const modo = document.getElementById("modo").value;
    document.getElementById("input-texto").style.display = (modo === "texto") ? "block" : "none";
    document.getElementById("input-imagen").style.display = (modo !== "texto") ? "block" : "none";
  });

  if (localStorage.getItem("modoOscuro") === "true") {
    document.body.classList.add("dark");
  }

  cambiarIdioma();
  renderHistorial();
});

function cambiarIdioma() {
  const strings = {
    es: {
      comparar: "Comparar Respuestas",
      placeholder: "Escribí tu consulta...",
      presetLabel: "🧩 Elegí una tarea rápida:",
      historial: "🗃️ Historial reciente:",
      exportar: "📤 Exportar historial (.txt)",
      modo: "Modo de entrada:",
      modelos: "Modelos a usar:",
      idioma: "🌐 Idioma de la interfaz:",
      voz: "Voz para lectura (opcional):",
    },
    en: {
      comparar: "Compare Answers",
      placeholder: "Write your query...",
      presetLabel: "🧩 Choose a quick task:",
      historial: "🗃️ Recent History:",
      exportar: "📤 Export history (.txt)",
      modo: "Input mode:",
      modelos: "Models to use:",
      idioma: "🌐 Interface language:",
      voz: "Voice for reading (optional):",
    }
  };

  const lang = document.getElementById("ui-lang").value;
  const t = strings[lang];
  document.querySelector("button[onclick='consultarModelos()']").textContent = t.comparar;
  document.getElementById("pregunta").placeholder = t.placeholder;
  document.querySelector("label[for='presets']").textContent = t.presetLabel;
  document.querySelector("label[for='modo']").textContent = t.modo;
  document.querySelector("label[for='modelos']").textContent = t.modelos;
  document.querySelector("label[for='ui-lang']").textContent = t.idioma;
  document.querySelector("label[for='tts-voice']").textContent = t.voz;
  document.querySelector(".section-title + ul + button").textContent = t.exportar;
  document.querySelector(".section-title + ul").previousElementSibling.textContent = t.historial;
}

function renderHistorial() {
  const historial = JSON.parse(localStorage.getItem("historialConsultas") || "[]");
  const cont = document.getElementById("historial");
  cont.innerHTML = "";
  historial.forEach(q => {
    const li = document.createElement("li");
    li.style.padding = "4px 0";
    li.style.cursor = "pointer";
    li.textContent = q;
    li.onclick = () => document.getElementById("pregunta").value = q;
    cont.appendChild(li);
  });
}

function guardarHistorial(pregunta) {
  if (!pregunta) return;
  let historial = JSON.parse(localStorage.getItem("historialConsultas") || "[]");
  historial.unshift(pregunta);
  historial = historial.slice(0, 5);
  localStorage.setItem("historialConsultas", JSON.stringify(historial));
  renderHistorial();
}

function exportarHistorial() {
  const historial = JSON.parse(localStorage.getItem("historialConsultas") || "[]");
  const contenido = historial.join("\n");
  const blob = new Blob([contenido], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "historial_ai_switchboard.txt";
  a.click();
  URL.revokeObjectURL(url);
}

function limpiarRespuesta(respuesta) {
  if (typeof respuesta === "string") return respuesta;
  if (respuesta?.text && typeof respuesta.text === "string") return respuesta.text;
  if (respuesta?.message?.content && typeof respuesta.message.content === "string") return respuesta.message.content;
  try {
    return JSON.stringify(respuesta, null, 2);
  } catch {
    return "Respuesta inesperada.";
  }
}

async function reproducirTTS(texto, voice) {
  if (!voice) return;
  try {
    const blob = await puter.ai.txt2speech(texto, { voice: voice });
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    audio.play();
  } catch (err) {
    console.error("Error en TTS:", err);
  }
}

async function consultarModelos() {
  if (typeof puter === 'undefined') {
    console.error("❌ Puter.js no está cargado aún.");
    alert("La librería Puter.js no fue cargada correctamente.");
    return;
  }
  const modo = document.getElementById("modo").value;
  const pregunta = document.getElementById("pregunta").value.trim();
  const archivo = document.getElementById("archivo").files[0];
  const modelos = Array.from(document.getElementById("modelos").selectedOptions).map(opt => opt.value);
  const contenedor = document.getElementById("resultados");
  contenedor.innerHTML = "";

  if ((modo === "texto" && !pregunta) || (modo !== "texto" && !archivo) || modelos.length === 0) {
    alert("Completá la entrada según el modo y seleccioná modelos.");
    return;
  }

  if (modo === "texto") guardarHistorial(pregunta);

  for (const modelo of modelos) {
    const div = document.createElement("div");
    div.className = "card";
    div.innerHTML = `<h3>${modelo}</h3><em>Consultando...</em>`;
    contenedor.appendChild(div);

    try {
      let res;
      if (modelo === "img2txt") {
        res = await puter.ai.img2txt(archivo);
      } else if (modo === "imagen") {
        res = await puter.ai.chat("Describe esta imagen", { model: modelo, image: archivo });
      } else {
        res = await puter.ai.chat(pregunta, { model: modelo });
      }

      const text = limpiarRespuesta(res);
      div.innerHTML = `<h3>${modelo}</h3>` + marked.parse(text);
      const voice = document.getElementById("tts-voice").value;
      reproducirTTS(text, voice);
    } catch (err) {
      div.innerHTML = `<h3>${modelo}</h3><span style="color:red;">❌ Error consultando este modelo.</span>`;
      console.error(err);
    }
  }
}
