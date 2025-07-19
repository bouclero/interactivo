// Horario Laboral Interactivo - JavaScript
class HorarioApp {
    constructor() {
        this.currentData = {
            workerName: "",
            month: "",
            year: "",
            scheduleData: {},
            signature: ""
        };
        
        this.isDrawing = false;
        this.canvas = null;
        this.ctx = null;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setupSignatureCanvas();
        
        // Establecer el año y mes actuales por defecto ANTES de intentar cargar datos
        const currentYear = new Date().getFullYear().toString();
        const currentMonth = (new Date().getMonth() + 1).toString();

        document.getElementById("yearInput").value = currentYear;
        document.getElementById("monthSelect").value = currentMonth;
        
        this.currentData.year = currentYear;
        this.currentData.month = currentMonth;

        // Cargar datos guardados DESPUÉS de establecer los valores por defecto
        this.loadSavedData();

        // Asegurarse de que los campos de entrada reflejen los datos cargados o por defecto
        // Es crucial que estos valores se establezcan DESPUÉS de loadSavedData()
        // y DESPUÉS de la lógica de inicialización de año/mes por defecto.
        document.getElementById("workerName").value = this.currentData.workerName;
        document.getElementById("monthSelect").value = this.currentData.month;
        document.getElementById("yearInput").value = this.currentData.year;

        // Generar la tabla después de que los datos iniciales o cargados estén listos
        this.generateScheduleTable();

        console.log("INIT: App initialized. currentData:", this.currentData);
        console.log("INIT: localStorage 'saved_schedules':", localStorage.getItem("saved_schedules"));
    }

    setupEventListeners() {
        // Elementos del DOM
        const workerNameInput = document.getElementById("workerName");
        const monthSelect = document.getElementById("monthSelect");
        const yearInput = document.getElementById("yearInput");
        const saveButton = document.getElementById("saveData");
        const loadButton = document.getElementById("loadData");
        const exportButton = document.getElementById("exportData");
        const clearSignatureButton = document.getElementById("clearSignature");
        const closeNotificationButton = document.getElementById("closeNotification");

        // Event listeners
        workerNameInput.addEventListener("input", (e) => {
            this.currentData.workerName = e.target.value;
        });

        monthSelect.addEventListener("change", (e) => {
            this.currentData.month = e.target.value;
            this.generateScheduleTable();
        });

        yearInput.addEventListener("input", (e) => {
            this.currentData.year = e.target.value;
            this.generateScheduleTable();
        });

        saveButton.addEventListener("click", () => this.saveData());
        loadButton.addEventListener("click", () => this.loadData());
        exportButton.addEventListener("click", () => this.exportData());
        clearSignatureButton.addEventListener("click", () => this.clearSignature());
        closeNotificationButton.addEventListener("click", () => this.hideNotification());
    }

    generateScheduleTable() {
        if (!this.currentData.month || !this.currentData.year) return;

        const tbody = document.getElementById("scheduleBody");
        tbody.innerHTML = "";

        const daysInMonth = new Date(parseInt(this.currentData.year), parseInt(this.currentData.month), 0).getDate();
        const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

        for (let day = 1; day <= daysInMonth; day++) {
            const date = new Date(parseInt(this.currentData.year), parseInt(this.currentData.month) - 1, day);
            const dayName = dayNames[date.getDay()];
            const dateKey = `${this.currentData.year}-${this.currentData.month.toString().padStart(2, "0")}-${day.toString().padStart(2, "0")}`;

            const row = document.createElement("tr");
            
            // Obtener datos guardados si existen
            const savedData = this.currentData.scheduleData[dateKey] || {};

            row.innerHTML = `
                <td class="day-name">${dayName}</td>
                <td class="date-cell">${day}</td>
                <td>
                    <input type="time" 
                           data-date="${dateKey}" 
                           data-field="entrada" 
                           value="${savedData.entrada || ""}"
                           class="time-input">
                </td>
                <td>
                    <input type="time" 
                           data-date="${dateKey}" 
                           data-field="salida" 
                           value="${savedData.salida || ""}"
                           class="time-input">
                </td>
                <td>
                    <span class="hours-display" data-date="${dateKey}">
                        ${savedData.horasTrabajadas || "0:00"}
                    </span>
                </td>
                <td>
                    <textarea data-date="${dateKey}" 
                              data-field="incidencias" 
                              placeholder="Incidencias..."
                              class="incident-input">${savedData.incidencias || ""}</textarea>
                </td>
            `;

            tbody.appendChild(row);
        }

        // Agregar event listeners a los nuevos elementos
        this.setupTableEventListeners();
    }

    setupTableEventListeners() {
        const timeInputs = document.querySelectorAll(".time-input");
        const incidentInputs = document.querySelectorAll(".incident-input");

        timeInputs.forEach(input => {
            input.addEventListener("change", (e) => {
                this.handleTimeChange(e);
            });
        });

        incidentInputs.forEach(input => {
            input.addEventListener("input", (e) => {
                this.handleIncidentChange(e);
            });
        });
    }

    handleTimeChange(event) {
        const dateKey = event.target.dataset.date;
        const field = event.target.dataset.field;
        const value = event.target.value;

        if (!this.currentData.scheduleData[dateKey]) {
            this.currentData.scheduleData[dateKey] = {};
        }

        this.currentData.scheduleData[dateKey][field] = value;

        // Calcular horas trabajadas si ambos campos están llenos
        const entrada = this.currentData.scheduleData[dateKey].entrada;
        const salida = this.currentData.scheduleData[dateKey].salida;

        if (entrada && salida) {
            const horasTrabajadas = this.calculateWorkedHours(entrada, salida);
            this.currentData.scheduleData[dateKey].horasTrabajadas = horasTrabajadas;
            
            // Actualizar la visualización
            const hoursDisplay = document.querySelector(`[data-date="${dateKey}"].hours-display`);
            if (hoursDisplay) {
                hoursDisplay.textContent = horasTrabajadas;
            }
        }
    }

    handleIncidentChange(event) {
        const dateKey = event.target.dataset.date;
        const value = event.target.value;

        if (!this.currentData.scheduleData[dateKey]) {
            this.currentData.scheduleData[dateKey] = {};
        }

        this.currentData.scheduleData[dateKey].incidencias = value;
    }

    calculateWorkedHours(entrada, salida) {
        const [entradaHour, entradaMin] = entrada.split(":").map(Number);
        const [salidaHour, salidaMin] = salida.split(":").map(Number);

        const entradaMinutes = entradaHour * 60 + entradaMin;
        let salidaMinutes = salidaHour * 60 + salidaMin;

        // Si la salida es menor que la entrada, asumimos que es del día siguiente
        if (salidaMinutes < entradaMinutes) {
            salidaMinutes += 24 * 60;
        }

        const totalMinutes = salidaMinutes - entradaMinutes;
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;

        return `${hours}:${minutes.toString().padStart(2, "0")}`;
    }

    setupSignatureCanvas() {
        this.canvas = document.getElementById("signatureCanvas");
        this.ctx = this.canvas.getContext("2d");

        // Configurar el canvas
        this.ctx.strokeStyle = "#000";
        this.ctx.lineWidth = 2;
        this.ctx.lineCap = "round";

        // Event listeners para dibujar
        this.canvas.addEventListener("mousedown", (e) => this.startDrawing(e));
        this.canvas.addEventListener("mousemove", (e) => this.draw(e));
        this.canvas.addEventListener("mouseup", () => this.stopDrawing());
        this.canvas.addEventListener("mouseout", () => this.stopDrawing());

        // Event listeners para dispositivos táctiles
        this.canvas.addEventListener("touchstart", (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent("mousedown", {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener("touchmove", (e) => {
            e.preventDefault();
            const touch = e.touches[0];
            const mouseEvent = new MouseEvent("mousemove", {
                clientX: touch.clientX,
                clientY: touch.clientY
            });
            this.canvas.dispatchEvent(mouseEvent);
        });

        this.canvas.addEventListener("touchend", (e) => {
            e.preventDefault();
            const mouseEvent = new MouseEvent("mouseup", {});
            this.canvas.dispatchEvent(mouseEvent);
        });
    }

    startDrawing(e) {
        this.isDrawing = true;
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        this.ctx.beginPath();
        this.ctx.moveTo(x, y);
    }

    draw(e) {
        if (!this.isDrawing) return;

        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        this.ctx.lineTo(x, y);
        this.ctx.stroke();
    }

    stopDrawing() {
        if (this.isDrawing) {
            this.isDrawing = false;
            // Guardar la firma como imagen base64
            this.currentData.signature = this.canvas.toDataURL();
        }
    }

    clearSignature() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.currentData.signature = "";
        this.showNotification("Firma borrada correctamente", "success");
    }

    saveData() {
        try {
            // Validar datos básicos
            if (!this.currentData.workerName.trim()) {
                this.showNotification("Por favor, ingrese el nombre del trabajador", "error");
                return;
            }

            if (!this.currentData.month || !this.currentData.year) {
                this.showNotification("Por favor, seleccione el mes y año", "error");
                return;
            }

            // Crear clave única para el guardado
            const saveKey = `horario_${this.currentData.workerName.replace(/\s+/g, "_")}_${this.currentData.year}_${this.currentData.month}`;
            
            // Guardar en localStorage
            localStorage.setItem(saveKey, JSON.stringify(this.currentData));
            
            // Guardar también la lista de horarios guardados
            const savedSchedules = JSON.parse(localStorage.getItem("saved_schedules") || "[]");
            const scheduleInfo = {
                key: saveKey,
                workerName: this.currentData.workerName,
                month: this.currentData.month,
                year: this.currentData.year,
                savedDate: new Date().toISOString()
            };

            // Evitar duplicados
            const existingIndex = savedSchedules.findIndex(s => s.key === saveKey);
            if (existingIndex >= 0) {
                savedSchedules[existingIndex] = scheduleInfo;
            } else {
                savedSchedules.push(scheduleInfo);
            }

            localStorage.setItem("saved_schedules", JSON.stringify(savedSchedules));

            this.showNotification("Datos guardados correctamente", "success");
            console.log("SAVE: Data saved. currentData:", this.currentData);
            console.log("SAVE: localStorage 'saved_schedules':", localStorage.getItem("saved_schedules"));
            console.log("SAVE: localStorage '" + saveKey + "':", localStorage.getItem(saveKey));
        } catch (error) {
            console.error("Error al guardar:", error);
            this.showNotification("Error al guardar los datos", "error");
        }
    }

    loadData() {
        try {
            const savedSchedules = JSON.parse(localStorage.getItem("saved_schedules") || "[]");
            
            if (savedSchedules.length === 0) {
                this.showNotification("No hay datos guardados", "error");
                return;
            }

            // Crear un selector para elegir qué horario cargar
            this.showScheduleSelector(savedSchedules);
            console.log("LOAD: Displaying schedule selector.");
        } catch (error) {
            console.error("Error al cargar:", error);
            this.showNotification("Error al cargar los datos", "error");
        }
    }

    showScheduleSelector(schedules) {
        // Crear modal para seleccionar horario
        const modal = document.createElement("div");
        modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 2000;
        `;

        const modalContent = document.createElement("div");
        modalContent.style.cssText = `
            background: white;
            padding: 30px;
            border-radius: 12px;
            max-width: 500px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        `;

        modalContent.innerHTML = `
            <h3 style="margin-bottom: 20px; color: #2d3748;">Seleccionar Horario a Cargar</h3>
            <div id="scheduleList" style="margin-bottom: 20px;"></div>
            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                <button id="cancelLoad" class="btn-secondary">Cancelar</button>
            </div>
        `;

        const scheduleList = modalContent.querySelector("#scheduleList");
        
        schedules.forEach(schedule => {
            const scheduleItem = document.createElement("div");
            scheduleItem.style.cssText = `
                padding: 15px;
                border: 2px solid #e2e8f0;
                border-radius: 8px;
                margin-bottom: 10px;
                cursor: pointer;
                transition: all 0.2s ease;
            `;

            const monthName = [
                "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ][parseInt(schedule.month)];

            scheduleItem.innerHTML = `
                <strong>${schedule.workerName}</strong><br>
                <span style="color: #718096;">${monthName} ${schedule.year}</span><br>
                <small style="color: #a0aec0;">Guardado: ${new Date(schedule.savedDate).toLocaleDateString()}</small>
            `;

            scheduleItem.addEventListener("mouseover", () => {
                scheduleItem.style.borderColor = "#4299e1";
                scheduleItem.style.backgroundColor = "#f7fafc";
            });

            scheduleItem.addEventListener("mouseout", () => {
                scheduleItem.style.borderColor = "#e2e8f0";
                scheduleItem.style.backgroundColor = "white";
            });

            scheduleItem.addEventListener("click", () => {
                this.loadScheduleData(schedule.key);
                document.body.removeChild(modal);
            });

            scheduleList.appendChild(scheduleItem);
        });

        modalContent.querySelector("#cancelLoad").addEventListener("click", () => {
            document.body.removeChild(modal);
        });

        modal.appendChild(modalContent);
        document.body.appendChild(modal);
    }

    loadScheduleData(saveKey) {
        try {
            const savedData = localStorage.getItem(saveKey);
            if (!savedData) {
                this.showNotification("No se encontraron los datos", "error");
                console.log("LOAD_SCHEDULE: No data found for key:", saveKey);
                return;
            }

            this.currentData = JSON.parse(savedData);

            // Actualizar la interfaz
            document.getElementById("workerName").value = this.currentData.workerName;
            document.getElementById("monthSelect").value = this.currentData.month;
            document.getElementById("yearInput").value = this.currentData.year;

            // Regenerar la tabla
            this.generateScheduleTable();

            // Cargar la firma si existe
            if (this.currentData.signature) {
                const img = new Image();
                img.onload = () => {
                    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
                    this.ctx.drawImage(img, 0, 0);
                };
                img.src = this.currentData.signature;
            }

            this.showNotification("Datos cargados correctamente", "success");
            console.log("LOAD_SCHEDULE: Data loaded for key:", saveKey, "currentData:", this.currentData);
        } catch (error) {
            console.error("Error al cargar los datos:", error);
            this.showNotification("Error al cargar los datos", "error");
        }
    }

    loadSavedData() {
        // Simplificar la lógica de carga para asegurar que siempre se intente cargar el último horario guardado
        const savedSchedules = JSON.parse(localStorage.getItem("saved_schedules") || "[]");
        console.log("LOAD_SAVED_DATA: Retrieved 'saved_schedules':", savedSchedules);

        if (savedSchedules.length > 0) {
            // Ordenar por fecha de guardado y tomar el más reciente
            savedSchedules.sort((a, b) => new Date(b.savedDate) - new Date(a.savedDate));
            const lastSchedule = savedSchedules[0];
            
            // Cargar el último horario guardado
            console.log("LOAD_SAVED_DATA: Attempting to load last general schedule with key:", lastSchedule.key);
            const dataToLoad = localStorage.getItem(lastSchedule.key);
            if (dataToLoad) {
                this.currentData = JSON.parse(dataToLoad);
                console.log("LOAD_SAVED_DATA: Successfully loaded data.", this.currentData);
            } else {
                console.log("LOAD_SAVED_DATA: Data for key not found in localStorage:", lastSchedule.key);
            }
        } else {
            console.log("LOAD_SAVED_DATA: No saved schedules found.");
        }
    }

    exportData() {
        if (!this.currentData.workerName.trim()) {
            this.showNotification("No hay datos para exportar", "error");
            return;
        }

        try {
            // Crear contenido para exportar
            const monthNames = [
                "", "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
                "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
            ];

            let exportContent = `HORARIO LABORAL\n`;
            exportContent += `================\n\n`;
            exportContent += `Trabajador: ${this.currentData.workerName}\n`;
            exportContent += `Período: ${monthNames[parseInt(this.currentData.month)]} ${this.currentData.year}\n\n`;
            exportContent += `REGISTRO DE HORARIOS:\n`;
            exportContent += `--------------------\n`;

            // Agregar datos de la tabla
            Object.keys(this.currentData.scheduleData).forEach(dateKey => {
                const data = this.currentData.scheduleData[dateKey];
                const date = new Date(dateKey);
                const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
                
                exportContent += `${dayNames[date.getDay()]} ${date.getDate()}:\n`;
                exportContent += `  Entrada: ${data.entrada || "No registrada"}\n`;
                exportContent += `  Salida: ${data.salida || "No registrada"}\n`;
                exportContent += `  Horas trabajadas: ${data.horasTrabajadas || "0:00"}\n`;
                if (data.incidencias) {
                    exportContent += `  Incidencias: ${data.incidencias}\n`;
                }
                exportContent += `\n`;
            });

            // Crear y descargar archivo
            const blob = new Blob([exportContent], { type: "text/plain;charset=utf-8" });
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `horario_${this.currentData.workerName.replace(/\s+/g, "_")}_${this.currentData.year}_${this.currentData.month}.txt`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);

            this.showNotification("Datos exportados correctamente", "success");
        } catch (error) {
            console.error("Error al exportar:", error);
            this.showNotification("Error al exportar los datos", "error");
        }
    }

    showNotification(message, type = "success") {
        const notification = document.getElementById("notification");
        const notificationText = document.getElementById("notificationText");
        
        notificationText.textContent = message;
        notification.className = `notification ${type === "error" ? "error" : ""}`;
        
        // Auto-hide después de 5 segundos
        setTimeout(() => {
            this.hideNotification();
        }, 5000);
    }

    hideNotification() {
        const notification = document.getElementById("notification");
        notification.classList.add("hidden");
    }
}

// Inicializar la aplicación cuando el DOM esté listo
document.addEventListener("DOMContentLoaded", () => {
    new HorarioApp();
});

