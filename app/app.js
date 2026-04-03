(function () {
  const state = {
    sourceMode: "demo",
    currentView: "board",
    search: "",
    statusFilter: "",
    selectedStandortId: null,
    dataset: null,
    formMode: "create",
    editingStandortId: null,
    cloudWriteSecret: readStoredCloudSecret()
  };

  const elements = {
    nav: document.getElementById("view-nav"),
    modePill: document.getElementById("mode-pill"),
    stats: document.getElementById("stats"),
    title: document.getElementById("view-title"),
    subtitle: document.getElementById("view-subtitle"),
    head: document.getElementById("table-head"),
    body: document.getElementById("table-body"),
    search: document.getElementById("search-input"),
    filter: document.getElementById("status-filter"),
    detailTitle: document.getElementById("detail-title"),
    detailSubtitle: document.getElementById("detail-subtitle"),
    detailGrid: document.getElementById("detail-grid"),
    tasksList: document.getElementById("tasks-list"),
    materialList: document.getElementById("material-list"),
    erpMeta: document.getElementById("erp-meta"),
    erpList: document.getElementById("erp-list"),
    materialViewLink: document.getElementById("material-view-link"),
    exportLink: document.getElementById("material-export-link"),
    form: document.getElementById("rollout-form"),
    formTitle: document.getElementById("form-title"),
    formSubtitle: document.getElementById("form-subtitle"),
    formSubmitButton: document.getElementById("form-submit-button"),
    formResetButton: document.getElementById("form-reset-button"),
    formMessage: document.getElementById("form-message"),
    formModeNote: document.getElementById("form-mode-note"),
    importForm: document.getElementById("import-form"),
    importFile: document.getElementById("import-file"),
    importMessage: document.getElementById("import-message"),
    importModeNote: document.getElementById("import-mode-note"),
    newEntryButton: document.getElementById("new-entry-button"),
    editSelectedButton: document.getElementById("edit-selected-button"),
    detailEditButton: document.getElementById("detail-edit-button"),
    detailActionNote: document.getElementById("detail-action-note"),
    cloudUnlockButton: document.getElementById("cloud-unlock-button"),
    cloudLockButton: document.getElementById("cloud-lock-button")
  };

  const viewConfig = {
    board: {
      title: "Rollout Board",
      subtitle: "Management- und PL-Sicht auf Status, Material, Konfiguration und naechsten Task.",
      filterKey: "prozess_status",
      columns: [
        { key: "standort_id", label: "Standort", type: "standort" },
        { key: "ort", label: "Ort" },
        { key: "prozess_status", label: "Prozess", type: "status" },
        { key: "material_status", label: "Material", type: "status" },
        { key: "cms_status", label: "CMS", type: "status" },
        { key: "installationsdatum", label: "Datum" },
        { key: "team", label: "Team" },
        { key: "naechster_task", label: "Naechster Task" }
      ]
    },
    einkauf: {
      title: "Einkauf offen",
      subtitle: "Nur Materialpositionen, die fuer Beschaffung oder Sonderteile relevant sind.",
      filterKey: "bestellstatus",
      columns: [
        { key: "standort_id", label: "Standort", type: "standort" },
        { key: "artikel_typ", label: "Typ" },
        { key: "artikel_code", label: "Artikel" },
        { key: "menge", label: "Menge" },
        { key: "bestellstatus", label: "Bestellstatus", type: "status" },
        { key: "hinweis", label: "Hinweis" }
      ]
    },
    konfig: {
      title: "Konfig offen",
      subtitle: "Rollouts mit offener oder blockierter CMS-/Player-Konfiguration.",
      filterKey: "status",
      columns: [
        { key: "standort_id", label: "Standort", type: "standort" },
        { key: "player_typ", label: "Player" },
        { key: "cms_status", label: "CMS", type: "status" },
        { key: "titel", label: "Task" },
        { key: "status", label: "Task-Status", type: "status" },
        { key: "faellig_am", label: "Faellig" }
      ]
    },
    touren: {
      title: "Tourfreigabe",
      subtitle: "Abgeleitete Tourensicht mit Freigabe-Risiken vor dem Montagetermin.",
      filterKey: "freigabe_status",
      columns: [
        { key: "tour_id", label: "Tour" },
        { key: "standort_id", label: "Standort", type: "standort" },
        { key: "datum", label: "Datum" },
        { key: "startzeit_plan", label: "Start" },
        { key: "dauer_min", label: "Dauer" },
        { key: "freigabe_status", label: "Freigabe", type: "status" },
        { key: "hinweis", label: "Hinweis" }
      ]
    },
    erp: {
      title: "ERP Material",
      subtitle: "Saubere Materialsicht pro Standort mit PSO- und Auftragsnummer fuer ERP-Eintraege.",
      filterKey: "prozess_status",
      columns: [
        { key: "standort_id", label: "Standort", type: "standort" },
        { key: "ort", label: "Ort" },
        { key: "pso_nummer", label: "PSO" },
        { key: "auftragsnummer", label: "Auftrag" },
        { key: "positionen", label: "Pos." },
        { key: "material_kurz", label: "Material", type: "material-summary" },
        { key: "prozess_status", label: "Prozess", type: "status" }
      ]
    }
  };

  init().catch(function (error) {
    console.error(error);
    elements.subtitle.textContent = "Fehler beim Laden der Demo-Daten.";
    elements.modePill.textContent = "Fehler";
    setMessage(elements.formMessage, "Fehler beim Laden der App.", "error");
  });

  async function init() {
    wireEvents();
    updateActiveNav();
    state.dataset = await loadDataset();
    state.selectedStandortId = state.dataset.standorte[0] ? state.dataset.standorte[0].standort_id : null;
    resetForm();
    render();
  }

  function wireEvents() {
    elements.nav.addEventListener("click", function (event) {
      const button = event.target.closest("button[data-view]");
      if (!button) {
        return;
      }

      state.currentView = button.dataset.view;
      state.statusFilter = "";
      updateActiveNav();
      render();
    });

    elements.search.addEventListener("input", function (event) {
      state.search = event.target.value.trim().toLowerCase();
      renderTable();
    });

    elements.filter.addEventListener("change", function (event) {
      state.statusFilter = event.target.value;
      renderTable();
    });

    elements.newEntryButton.addEventListener("click", function () {
      resetForm();
    });

    elements.editSelectedButton.addEventListener("click", function () {
      startEditSelected();
    });

    elements.detailEditButton.addEventListener("click", function () {
      startEditSelected();
    });

    elements.cloudUnlockButton.addEventListener("click", function () {
      unlockCloudWrite();
    });

    elements.cloudLockButton.addEventListener("click", function () {
      lockCloudWrite();
    });

    elements.materialViewLink.addEventListener("click", function (event) {
      if (!state.selectedStandortId) {
        event.preventDefault();
        return;
      }

      if (state.sourceMode === "local") {
        return;
      }

      event.preventDefault();
      openMaterialView();
    });

    elements.exportLink.addEventListener("click", function (event) {
      if (!state.selectedStandortId) {
        event.preventDefault();
        return;
      }

      if (state.sourceMode === "local") {
        return;
      }

      event.preventDefault();
      exportMaterialCsv();
    });

    elements.formResetButton.addEventListener("click", function () {
      if (state.formMode === "edit" && state.editingStandortId) {
        populateForm(state.editingStandortId);
        setMessage(elements.formMessage, "Bearbeitungswerte erneut geladen.", "success");
        return;
      }
      resetForm();
    });

    elements.form.addEventListener("submit", function (event) {
      event.preventDefault();
      submitForm().catch(function (error) {
        console.error(error);
        setMessage(elements.formMessage, error.message || "Speichern fehlgeschlagen.", "error");
      });
    });

    elements.importForm.addEventListener("submit", function (event) {
      event.preventDefault();
      submitImport().catch(function (error) {
        console.error(error);
        setMessage(elements.importMessage, error.message || "Import fehlgeschlagen.", "error");
      });
    });
  }

  async function loadDataset() {
    const config = window.APP_CONFIG || {};
    if (config.mode === "local" && config.localApiUrl) {
      try {
        const response = await fetch(config.localApiUrl, { headers: { Accept: "application/json" } });
        if (!response.ok) {
          throw new Error("Local API request failed with " + response.status);
        }
        state.sourceMode = "local";
        return buildDerived(await response.json());
      } catch (error) {
        console.warn("Lokale API nicht erreichbar, falle auf Demo-Daten zurueck.", error);
      }
    }

    if (config.mode === "supabase" && config.supabaseUrl && config.supabaseAnonKey) {
      try {
        const dataset = await loadFromSupabase(config);
        state.sourceMode = "supabase";
        return buildDerived(dataset);
      } catch (error) {
        console.warn("Supabase-Ladevorgang fehlgeschlagen, falle auf Demo-Daten zurueck.", error);
      }
    }

    state.sourceMode = "demo";
    return buildDerived(window.DEMO_DATA);
  }

  async function loadFromSupabase(config) {
    const baseUrl = config.supabaseUrl.replace(/\/$/, "");
    const headers = {
      apikey: config.supabaseAnonKey,
      Authorization: "Bearer " + config.supabaseAnonKey
    };

    const endpoints = ["standorte", "rollouts", "tasks", "materialbedarf", "touren", "tour_stopps"];
    const results = await Promise.all(
      endpoints.map(async function (name) {
        const url = baseUrl + "/rest/v1/" + name + "?select=*";
        const response = await fetch(url, { headers: headers });
        if (!response.ok) {
          throw new Error("Supabase request failed for " + name + " with " + response.status);
        }
        return [name, await response.json()];
      })
    );

    return Object.fromEntries(results);
  }

  function buildDerived(source) {
    const standorte = (source.standorte || []).slice();
    const rollouts = (source.rollouts || []).slice();
    const tasks = (source.tasks || []).slice();
    const materialbedarf = (source.materialbedarf || []).slice();
    const touren = (source.touren || []).slice();
    const tourStopps = (source.tour_stopps || []).slice();

    const standorteById = indexBy(standorte, "standort_id");
    const rolloutsById = indexBy(rollouts, "rollout_id");

    const rolloutBoard = rollouts
      .map(function (rollout) {
        const standort = standorteById[rollout.standort_id];
        const offeneTasks = tasks
          .filter(function (task) {
            return task.rollout_id === rollout.rollout_id && task.status !== "erledigt";
          })
          .sort(compareTaskPriority);

        return {
          standort_id: standort.standort_id,
          filiale_name: standort.filiale_name,
          ort: standort.ort,
          rollout_id: rollout.rollout_id,
          prozess_status: rollout.prozess_status,
          material_status: rollout.material_status,
          cms_status: rollout.cms_status,
          installationsdatum: rollout.installationsdatum,
          cluster: rollout.cluster,
          team: rollout.team,
          naechster_task: offeneTasks[0] ? offeneTasks[0].titel : "Kein offener Task"
        };
      })
      .sort(compareByDateThenStandort);

    const einkaufOffen = materialbedarf
      .filter(function (row) {
        return row.bestellstatus === "offen";
      })
      .map(function (row) {
        const rollout = rolloutsById[row.rollout_id];
        const standort = standorteById[rollout.standort_id];
        return {
          standort_id: standort.standort_id,
          filiale_name: standort.filiale_name,
          rollout_id: rollout.rollout_id,
          artikel_typ: row.artikel_typ,
          artikel_code: row.artikel_code,
          menge: row.menge,
          bestellstatus: row.bestellstatus,
          hinweis: row.hinweis
        };
      });

    const konfigOffen = tasks
      .filter(function (task) {
        return task.task_typ === "Konfig" && task.status !== "erledigt";
      })
      .map(function (task) {
        const rollout = rolloutsById[task.rollout_id];
        const standort = standorteById[rollout.standort_id];
        return {
          standort_id: standort.standort_id,
          filiale_name: standort.filiale_name,
          rollout_id: rollout.rollout_id,
          player_typ: rollout.player_typ,
          cms_status: rollout.cms_status,
          titel: task.titel,
          status: task.status,
          faellig_am: task.faellig_am
        };
      })
      .sort(function (a, b) {
        return String(a.faellig_am).localeCompare(String(b.faellig_am));
      });

    const tourenFreigabe = tourStopps
      .map(function (stopp) {
        const tour = touren.find(function (item) {
          return item.tour_id === stopp.tour_id;
        });
        const rollout = rolloutsById[stopp.rollout_id];
        const standort = standorteById[rollout.standort_id];
        return {
          tour_id: stopp.tour_id,
          datum: tour ? tour.datum : "",
          team: tour ? tour.team : "",
          standort_id: standort.standort_id,
          filiale_name: standort.filiale_name,
          reihenfolge: stopp.reihenfolge,
          startzeit_plan: stopp.startzeit_plan,
          dauer_min: stopp.dauer_min,
          freigabe_status: stopp.freigabe_status,
          hinweis: stopp.hinweis
        };
      })
      .sort(function (a, b) {
        return String(a.datum).localeCompare(String(b.datum)) || a.reihenfolge - b.reihenfolge;
      });

    const erpMaterial = rollouts
      .map(function (rollout) {
        const standort = standorteById[rollout.standort_id];
        const material = materialbedarf
          .filter(function (item) {
            return item.rollout_id === rollout.rollout_id;
          })
          .sort(compareMaterialType);

        return {
          standort_id: standort.standort_id,
          filiale_name: standort.filiale_name,
          ort: standort.ort,
          rollout_id: rollout.rollout_id,
          prozess_status: rollout.prozess_status,
          installationsdatum: rollout.installationsdatum,
          pso_nummer: material[0] ? material[0].pso_nummer : "",
          auftragsnummer: material[0] ? material[0].auftragsnummer : "",
          positionen: material.length,
          material_kurz: material
            .map(function (item) {
              return item.artikel_code + " x" + item.menge;
            })
            .join(" | ")
        };
      })
      .sort(compareByDateThenStandort);

    return {
      standorte: standorte,
      rollouts: rollouts,
      tasks: tasks,
      materialbedarf: materialbedarf,
      touren: touren,
      tour_stopps: tourStopps,
      rollout_board: rolloutBoard,
      einkauf_offen: einkaufOffen,
      konfig_offen: konfigOffen,
      touren_freigabe: tourenFreigabe,
      erp_material: erpMaterial
    };
  }

  function render() {
    renderMode();
    renderStats();
    renderFilterOptions();
    renderTable();
    renderDetails();
    renderFormState();
  }

  function renderMode() {
    if (state.sourceMode === "local") {
      elements.modePill.innerHTML = "Lokale SQLite-DB <sup>local</sup>";
      return;
    }
    if (state.sourceMode === "supabase") {
      elements.modePill.innerHTML = "Supabase verbunden <sup>live</sup>";
      return;
    }
    elements.modePill.innerHTML = "Demo-Daten lokal <sup>static</sup>";
  }

  function renderStats() {
    const rollouts = state.dataset.rollouts;
    const offeneTasks = state.dataset.tasks.filter(function (task) {
      return task.status !== "erledigt";
    }).length;
    const offeneMaterialien = state.dataset.materialbedarf.filter(function (item) {
      return item.bestellstatus === "offen";
    }).length;
    const exportFaehig = state.dataset.erp_material.filter(function (item) {
      return item.positionen > 0;
    }).length;

    const cards = [
      { label: "Rollouts", value: rollouts.length, hint: "aktive Faelle" },
      { label: "Offene Tasks", value: offeneTasks, hint: "ueber alle Rollen" },
      { label: "Material offen", value: offeneMaterialien, hint: "Bestellung oder Spezialteil" },
      { label: "ERP-Sichten", value: exportFaehig, hint: "mit Material pro Standort" }
    ];

    elements.stats.innerHTML = cards
      .map(function (card) {
        return (
          '<article class="stat-card">' +
          "<h3>" + escapeHtml(card.label) + "</h3>" +
          "<strong>" + escapeHtml(String(card.value)) + "</strong>" +
          '<p class="small">' + escapeHtml(card.hint) + "</p>" +
          "</article>"
        );
      })
      .join("");
  }

  function renderFilterOptions() {
    const config = viewConfig[state.currentView];
    const rows = getRowsForCurrentView();
    const values = Array.from(
      new Set(
        rows
          .map(function (row) {
            return row[config.filterKey];
          })
          .filter(Boolean)
      )
    ).sort();

    elements.filter.innerHTML =
      '<option value="">Alle Stati</option>' +
      values
        .map(function (value) {
          const selected = value === state.statusFilter ? ' selected="selected"' : "";
          return "<option value=\"" + escapeHtml(value) + "\"" + selected + ">" + escapeHtml(value) + "</option>";
        })
        .join("");
  }

  function renderTable() {
    const config = viewConfig[state.currentView];
    const rows = applyFilters(getRowsForCurrentView(), config.filterKey);

    elements.title.textContent = config.title;
    elements.subtitle.textContent =
      config.subtitle + " Aktuell sichtbar: " + rows.length + " Zeilen.";

    elements.head.innerHTML =
      "<tr>" +
      config.columns
        .map(function (column) {
          return "<th>" + escapeHtml(column.label) + "</th>";
        })
        .join("") +
      "</tr>";

    elements.body.innerHTML = rows
      .map(function (row) {
        const selectedClass = row.standort_id === state.selectedStandortId ? " is-selected" : "";
        return (
          '<tr class="' + selectedClass.trim() + '">' +
          config.columns
            .map(function (column) {
              return "<td>" + renderCell(column, row[column.key], row) + "</td>";
            })
            .join("") +
          "</tr>"
        );
      })
      .join("");

    elements.body.querySelectorAll("button.row-action").forEach(function (button) {
      button.addEventListener("click", function () {
        state.selectedStandortId = button.dataset.standortId;
        renderDetails();
        highlightSelectedRows();
      });
    });
  }

  function renderDetails() {
    const standort = getSelectedStandort();
    const rollout = getSelectedRollout();
    const tasks = getSelectedTasks();
    const material = getSelectedMaterial();
    const erp = getSelectedErp();
    const isLocal = state.sourceMode === "local";
    const canWrite = isWritableMode();
    const hasMaterial = material.length > 0;

    elements.detailEditButton.disabled = !standort || !canWrite;
    if (standort && isLocal) {
      elements.materialViewLink.href = "/erp/material/" + encodeURIComponent(standort.standort_id);
      elements.materialViewLink.setAttribute("aria-disabled", "false");
      elements.materialViewLink.classList.remove("is-disabled");
      elements.exportLink.href = "/api/export/material/" + encodeURIComponent(standort.standort_id) + ".csv";
      elements.exportLink.setAttribute("download", "material-" + standort.standort_id + ".csv");
      elements.exportLink.setAttribute("aria-disabled", "false");
      elements.exportLink.classList.remove("is-disabled");
      setMessage(elements.detailActionNote, "Bearbeiten ist lokal schreibbar. Materialansicht und Export laufen direkt ueber die SQLite-API.", "success");
    } else if (standort && hasMaterial) {
      elements.materialViewLink.href = "#";
      elements.materialViewLink.setAttribute("aria-disabled", "false");
      elements.materialViewLink.classList.remove("is-disabled");
      elements.exportLink.href = "#";
      elements.exportLink.removeAttribute("download");
      elements.exportLink.setAttribute("aria-disabled", "false");
      elements.exportLink.classList.remove("is-disabled");
      setMessage(elements.detailActionNote, "Live-Webmodus ist read-only. Materialansicht und CSV-Export werden hier direkt im Browser erzeugt.", "success");
    } else {
      elements.materialViewLink.href = "#";
      elements.materialViewLink.setAttribute("aria-disabled", "true");
      elements.materialViewLink.classList.add("is-disabled");
      elements.exportLink.href = "#";
      elements.exportLink.removeAttribute("download");
      elements.exportLink.setAttribute("aria-disabled", "true");
      elements.exportLink.classList.add("is-disabled");
      setMessage(
        elements.detailActionNote,
        standort ? "Fuer diesen Standort liegen keine Materialpositionen vor." : "Waehle zuerst einen Standort aus.",
        ""
      );
    }

    if (!standort) {
      elements.detailTitle.textContent = "Kein Standort ausgewaehlt";
      elements.detailSubtitle.textContent = "Waehl eine Zeile aus dem Board oder einer Fachsicht.";
      elements.detailGrid.innerHTML = "";
      elements.tasksList.innerHTML = '<div class="list-item">Keine Daten</div>';
      elements.materialList.innerHTML = '<div class="list-item">Keine Daten</div>';
      elements.erpMeta.innerHTML = "";
      elements.erpList.innerHTML = '<div class="list-item">Keine Daten</div>';
      return;
    }

    elements.detailTitle.textContent = standort.standort_id + " " + standort.filiale_name;
    elements.detailSubtitle.textContent =
      [standort.strasse, [standort.plz, standort.ort].filter(Boolean).join(" ")].filter(Boolean).join(", ");

    const details = [
      ["Prozess", rollout ? rollout.prozess_status : "-"],
      ["CMS", rollout ? rollout.cms_status : "-"],
      ["Material", rollout ? rollout.material_status : "-"],
      ["Screen", rollout ? rollout.screen_typ : "-"],
      ["Halterung", rollout ? rollout.halterung_typ : "-"],
      ["Player", rollout ? "Player " + rollout.player_typ : "-"],
      ["IP Power", rollout ? formatYesNo(rollout.ip_power) : "-"],
      ["Hohldecke", rollout ? formatYesNo(rollout.hohldecke) : "-"],
      ["Datum", rollout ? rollout.installationsdatum : "-"],
      ["Team", rollout ? rollout.team : "-"],
      ["Fenster", standort.montagefenster || "-"],
      ["Anmeldung", standort.anmeldung_noetig ? standort.anmeldung_hinweis || "Ja" : "Nein"]
    ];

    elements.detailGrid.innerHTML = details
      .map(function (entry) {
        return (
          '<div class="detail-item">' +
          "<span>" + escapeHtml(entry[0]) + "</span>" +
          "<strong>" + renderValue(entry[1]) + "</strong>" +
          "</div>"
        );
      })
      .join("");

    elements.tasksList.innerHTML = tasks.length
      ? tasks
          .sort(compareTaskPriority)
          .map(function (task) {
            return (
              '<div class="list-item">' +
              "<strong>" + escapeHtml(task.titel) + "</strong>" +
              '<div class="small">' +
              renderStatus(task.status) +
              " · " +
              escapeHtml(task.owner_rolle) +
              " · faellig " +
              escapeHtml(task.faellig_am || "-") +
              "</div>" +
              '<div class="small">' + escapeHtml(task.hinweis || "") + "</div>" +
              "</div>"
            );
          })
          .join("")
      : '<div class="list-item">Keine offenen Tasks.</div>';

    elements.materialList.innerHTML = material.length
      ? material
          .map(function (item) {
            const orderInfo = [item.pso_nummer, item.auftragsnummer].filter(Boolean).join(" · ");
            return (
              '<div class="list-item">' +
              "<strong>" + escapeHtml(item.artikel_code) + "</strong>" +
              '<div class="small">' +
              escapeHtml(item.artikel_typ) +
              " · Menge " +
              escapeHtml(String(item.menge)) +
              " · " +
              renderStatus(item.bestellstatus) +
              "</div>" +
              '<div class="small">' + escapeHtml(orderInfo || item.hinweis || "") + "</div>" +
              "</div>"
            );
          })
          .join("")
      : '<div class="list-item">Kein Material vorhanden.</div>';

    if (!erp) {
      elements.erpMeta.innerHTML = "";
      elements.erpList.innerHTML = '<div class="list-item">Keine ERP-Sicht vorhanden.</div>';
      return;
    }

    elements.erpMeta.innerHTML = [
      ["PSO", erp.pso_nummer || "-"],
      ["Auftrag", erp.auftragsnummer || "-"],
      ["Datum", erp.installationsdatum || "-"],
      ["Positionen", String(erp.positionen)]
    ]
      .map(function (entry) {
        return (
          '<div class="erp-box">' +
          "<span>" + escapeHtml(entry[0]) + "</span>" +
          "<strong>" + escapeHtml(entry[1]) + "</strong>" +
          "</div>"
        );
      })
      .join("");

    elements.erpList.innerHTML = material.length
      ? material
          .sort(compareMaterialType)
          .map(function (item) {
            return (
              '<div class="erp-line">' +
              "<strong>" + escapeHtml(item.artikel_typ) + "</strong>" +
              "<span>" + escapeHtml(item.artikel_code) + "</span>" +
              "<span>Menge " + escapeHtml(String(item.menge)) + "</span>" +
              "<span>" + escapeHtml(item.bestellstatus) + "</span>" +
              "</div>"
            );
          })
          .join("")
      : '<div class="list-item">Keine Materialpositionen vorhanden.</div>';
  }

  function renderFormState() {
    if (!state.dataset) {
      return;
    }

    const writable = isWritableMode();
    const localWrite = state.sourceMode === "local";
    const cloudWrite = state.sourceMode === "supabase" && hasCloudWriteAccess();
    const hasSelection = Boolean(getSelectedStandort());
    const formElements = Array.from(elements.form.elements);

    formElements.forEach(function (field) {
      field.disabled = !writable;
    });
    elements.importFile.disabled = !localWrite;
    Array.from(elements.importForm.elements).forEach(function (field) {
      field.disabled = !localWrite;
    });

    elements.cloudUnlockButton.hidden = state.sourceMode !== "supabase";
    elements.cloudLockButton.hidden = state.sourceMode !== "supabase";
    elements.cloudUnlockButton.disabled = state.sourceMode !== "supabase";
    elements.cloudLockButton.disabled = state.sourceMode !== "supabase" || !hasCloudWriteAccess();

    if (localWrite) {
      setMessage(elements.formModeNote, "Lokaler Schreibmodus aktiv. Neue Eintraege, Bearbeiten und Import schreiben in SQLite.", "success");
      setMessage(elements.importModeNote, "CSV-Dateien werden direkt in die lokale SQLite-Demo importiert.", "success");
      if (state.formMode === "edit") {
        elements.formTitle.textContent = "Eintrag bearbeiten";
        elements.formSubtitle.textContent =
          "Die Bemusterungsdaten des ausgewaehlten Standorts werden aktualisiert und Material sowie gesteuerte Tasks nachgezogen.";
        elements.formSubmitButton.textContent = "Aenderungen speichern";
        elements.form.elements.standort_id.readOnly = true;
      } else {
        elements.formTitle.textContent = "Neue Bemusterung erfassen";
        elements.formSubtitle.textContent =
          "Standort- und Rolloutdaten direkt in die Demo-DB schreiben.";
        elements.formSubmitButton.textContent = "Standort anlegen";
        elements.form.elements.standort_id.readOnly = false;
      }
    } else if (cloudWrite) {
      setMessage(elements.formModeNote, "Cloud-Schreibmodus entsperrt. Formularspeichern schreibt direkt in die Demo-Supabase-DB.", "success");
      setMessage(elements.importModeNote, "CSV-Import bleibt bewusst lokal-only und ist im Webmodus deaktiviert.", "error");
      if (state.formMode === "edit") {
        elements.formTitle.textContent = "Eintrag in Cloud bearbeiten";
        elements.formSubtitle.textContent =
          "Die Bemusterungsdaten des ausgewaehlten Standorts werden in Supabase aktualisiert und Material sowie gesteuerte Tasks nachgezogen.";
        elements.formSubmitButton.textContent = "Cloud-Aenderungen speichern";
        elements.form.elements.standort_id.readOnly = true;
      } else {
        elements.formTitle.textContent = "Neue Cloud-Bemusterung erfassen";
        elements.formSubtitle.textContent =
          "Standort- und Rolloutdaten direkt in die Demo-Supabase-DB schreiben.";
        elements.formSubmitButton.textContent = "In Cloud anlegen";
        elements.form.elements.standort_id.readOnly = false;
      }
    } else {
      elements.formTitle.textContent = "Neue Bemusterung erfassen";
      elements.formSubtitle.textContent =
        "Schreibfunktionen sind nur verfuegbar, wenn die App lokal gegen die SQLite-API laeuft.";
      elements.formSubmitButton.textContent = "Nur lokal moeglich";
      elements.form.elements.standort_id.readOnly = false;
      if (state.sourceMode === "supabase") {
        setMessage(elements.formModeNote, "Web-App ist standardmaessig read-only. Fuer Cloud-Erfassung zuerst \"Cloud entsperren\" und das Demo-Secret eingeben.", "error");
      } else {
        setMessage(elements.formModeNote, "Diese veroeffentlichte Web-App ist read-only. Fuer Erfassen oder Bearbeiten die App lokal mit `python3 local/server.py` starten.", "error");
      }
      setMessage(elements.importModeNote, "Import ist in der Live-Webansicht deaktiviert und nur im lokalen SQLite-Modus verfuegbar.", "error");
    }

    elements.editSelectedButton.disabled = !writable || !hasSelection;
  }

  function renderCell(column, value, row) {
    if (column.type === "status") {
      return renderStatus(value);
    }
    if (column.type === "standort") {
      return (
        '<button class="row-action" data-standort-id="' +
        escapeHtml(row.standort_id) +
        '">' +
        escapeHtml(row.standort_id) +
        "</button>"
      );
    }
    if (column.type === "material-summary") {
      return '<span class="table-note">' + escapeHtml(value || "-") + "</span>";
    }
    return renderValue(value);
  }

  function renderStatus(value) {
    if (!value) {
      return "-";
    }

    const statusClass = "status status--" + String(value).replace(/\s+/g, "_");
    return '<span class="' + escapeHtml(statusClass) + '">' + escapeHtml(String(value)) + "</span>";
  }

  async function submitForm() {
    const wasEdit = state.formMode === "edit";
    const payload = serializeForm();
    let response;

    if (state.sourceMode === "local") {
      const endpoint =
        state.formMode === "edit" && state.editingStandortId
          ? "/api/standort/" + encodeURIComponent(state.editingStandortId)
          : "/api/standort";
      const method = state.formMode === "edit" ? "PUT" : "POST";
      response = await requestJson(endpoint, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
    } else if (state.sourceMode === "supabase" && hasCloudWriteAccess()) {
      const config = window.APP_CONFIG || {};
      response = await requestJson(getCloudWriteUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: config.supabaseAnonKey,
          Authorization: "Bearer " + config.supabaseAnonKey,
          "x-demo-secret": state.cloudWriteSecret
        },
        body: JSON.stringify({
          action: state.formMode === "edit" ? "update" : "create",
          standort_id: state.editingStandortId || payload.standort_id,
          payload: payload
        })
      });
    } else {
      throw new Error("Speichern ist nur lokal oder im entsperrten Cloud-Modus moeglich.");
    }

    await refreshDataset(response.standort_id);
    state.selectedStandortId = response.standort_id;
    state.formMode = "edit";
    state.editingStandortId = response.standort_id;
    populateForm(response.standort_id);
    render();
    setMessage(
      elements.formMessage,
      wasEdit
        ? "Standort gespeichert. Material und gesteuerte Tasks wurden synchronisiert."
        : "Standort angelegt. Material und gesteuerte Tasks wurden synchronisiert.",
      "success"
    );
  }

  async function submitImport() {
    if (state.sourceMode !== "local") {
      throw new Error("Import ist nur im lokalen Modus moeglich.");
    }

    const file = elements.importFile.files[0];
    if (!file) {
      throw new Error("Bitte zuerst eine CSV-Datei auswaehlen.");
    }

    const csvText = await file.text();
    const response = await requestJson("/api/import/csv", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ csv_text: csvText })
    });

    await refreshDataset(response.standort_ids[response.standort_ids.length - 1]);
    state.selectedStandortId = response.standort_ids[response.standort_ids.length - 1];
    elements.importForm.reset();
    render();
    setMessage(
      elements.importMessage,
      response.imported +
        " Zeilen importiert. Neu: " +
        response.created +
        ", aktualisiert: " +
        response.updated +
        ".",
      "success"
    );
  }

  async function refreshDataset(preferredStandortId) {
    state.dataset = await loadDataset();
    state.selectedStandortId = preferredStandortId || state.selectedStandortId;
  }

  function startEditSelected() {
    if (!isWritableMode()) {
      setMessage(elements.formMessage, "Bearbeiten ist nur lokal oder im entsperrten Cloud-Modus moeglich.", "error");
      return;
    }
    if (!state.selectedStandortId) {
      setMessage(elements.formMessage, "Bitte zuerst einen Standort auswaehlen.", "error");
      return;
    }
    populateForm(state.selectedStandortId);
    setMessage(elements.formMessage, "Standort in die Bearbeitungsmaske geladen.", "success");
  }

  function unlockCloudWrite() {
    if (state.sourceMode !== "supabase") {
      return;
    }

    const secret = window.prompt("Demo-Secret fuer Cloud-Schreibmodus eingeben:");
    if (!secret) {
      return;
    }

    state.cloudWriteSecret = secret.trim();
    storeCloudSecret(state.cloudWriteSecret);
    renderFormState();
    setMessage(elements.formMessage, "Cloud-Schreibmodus entsperrt.", "success");
  }

  function lockCloudWrite() {
    state.cloudWriteSecret = "";
    storeCloudSecret("");
    renderFormState();
    resetForm();
    setMessage(elements.formMessage, "Cloud-Schreibmodus wieder gesperrt.", "success");
  }

  function openMaterialView() {
    const standort = getSelectedStandort();
    const rollout = getSelectedRollout();
    const material = getSelectedMaterial().sort(compareMaterialType);
    const erp = getSelectedErp();

    if (!standort || !material.length) {
      setMessage(elements.detailActionNote, "Keine Materialansicht verfuegbar.", "error");
      return;
    }

    const title = "ERP Material " + standort.standort_id;
    const html = buildMaterialViewDocument(title, standort, rollout, material, erp);
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const popup = window.open(url, "_blank");

    if (!popup) {
      URL.revokeObjectURL(url);
      setMessage(elements.detailActionNote, "Neue Registerkarte konnte nicht geoeffnet werden. Bitte Popups fuer diese Seite erlauben.", "error");
      return;
    }

    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 60000);
  }

  function exportMaterialCsv() {
    const standort = getSelectedStandort();
    const material = getSelectedMaterial().sort(compareMaterialType);
    const erp = getSelectedErp();

    if (!standort || !material.length) {
      setMessage(elements.detailActionNote, "Kein Material zum Exportieren vorhanden.", "error");
      return;
    }

    const rows = [
      ["standort_id", "filiale_name", "pso_nummer", "auftragsnummer", "artikel_typ", "artikel_code", "menge", "bestellstatus", "hinweis"]
    ].concat(
      material.map(function (item) {
        return [
          standort.standort_id,
          standort.filiale_name || "",
          item.pso_nummer || (erp ? erp.pso_nummer : ""),
          item.auftragsnummer || (erp ? erp.auftragsnummer : ""),
          item.artikel_typ || "",
          item.artikel_code || "",
          item.menge == null ? "" : String(item.menge),
          item.bestellstatus || "",
          item.hinweis || ""
        ];
      })
    );

    downloadTextFile("material-" + standort.standort_id + ".csv", buildCsv(rows), "text/csv;charset=utf-8");
    setMessage(elements.detailActionNote, "CSV wurde im Browser erzeugt und heruntergeladen.", "success");
  }

  function populateForm(standortId) {
    const standort = state.dataset.standorte.find(function (item) {
      return item.standort_id === standortId;
    });
    const rollout = state.dataset.rollouts.find(function (item) {
      return item.standort_id === standortId;
    });

    if (!standort || !rollout) {
      return;
    }

    setFieldValue("standort_id", standort.standort_id);
    setFieldValue("filiale_name", standort.filiale_name);
    setFieldValue("strasse", standort.strasse);
    setFieldValue("plz", standort.plz);
    setFieldValue("ort", standort.ort);
    setFieldValue("kanton", standort.kanton);
    setFieldValue("kontaktperson", standort.kontaktperson);
    setFieldValue("telefon", standort.telefon);
    setCheckboxValue("anmeldung_noetig", Boolean(standort.anmeldung_noetig));
    setFieldValue("anmeldung_hinweis", standort.anmeldung_hinweis);
    setFieldValue("montagefenster", standort.montagefenster);
    setFieldValue("parkplatz_hinweis", standort.parkplatz_hinweis);

    setFieldValue("rollout_typ", rollout.rollout_typ);
    setFieldValue("screen_typ", rollout.screen_typ);
    setFieldValue("halterung_typ", rollout.halterung_typ);
    setFieldValue("player_typ", rollout.player_typ);
    setFieldValue("anzahl_personen", rollout.anzahl_personen);
    setFieldValue("zeitbedarf_min", rollout.zeitbedarf_min);
    setCheckboxValue("ip_power", Boolean(rollout.ip_power));
    setCheckboxValue("hohldecke", Boolean(rollout.hohldecke));

    setFieldValue("cms_status", rollout.cms_status);
    setFieldValue("material_status", rollout.material_status);
    setFieldValue("prozess_status", rollout.prozess_status);
    setFieldValue("installationsdatum", rollout.installationsdatum);
    setFieldValue("cluster", rollout.cluster);
    setFieldValue("team", rollout.team);
    setFieldValue("bemerkung", rollout.bemerkung);

    state.formMode = "edit";
    state.editingStandortId = standortId;
    renderFormState();
  }

  function resetForm() {
    elements.form.reset();
    setFieldValue("rollout_typ", "Austausch 55 Zoll");
    setFieldValue("screen_typ", "QM55");
    setFieldValue("halterung_typ", "SIP");
    setFieldValue("player_typ", "1");
    setFieldValue("anzahl_personen", "1");
    setFieldValue("zeitbedarf_min", "90");
    setFieldValue("cms_status", "offen");
    setFieldValue("material_status", "offen");
    setFieldValue("prozess_status", "offen");
    state.formMode = "create";
    state.editingStandortId = null;
    renderFormState();
    setMessage(elements.formMessage, "", "");
  }

  function serializeForm() {
    return {
      standort_id: getFieldValue("standort_id"),
      filiale_name: getFieldValue("filiale_name"),
      strasse: getFieldValue("strasse"),
      plz: getFieldValue("plz"),
      ort: getFieldValue("ort"),
      kanton: getFieldValue("kanton"),
      kontaktperson: getFieldValue("kontaktperson"),
      telefon: getFieldValue("telefon"),
      anmeldung_noetig: elements.form.elements.anmeldung_noetig.checked,
      anmeldung_hinweis: getFieldValue("anmeldung_hinweis"),
      montagefenster: getFieldValue("montagefenster"),
      parkplatz_hinweis: getFieldValue("parkplatz_hinweis"),
      rollout_typ: getFieldValue("rollout_typ"),
      screen_typ: getFieldValue("screen_typ"),
      halterung_typ: getFieldValue("halterung_typ"),
      ip_power: elements.form.elements.ip_power.checked,
      player_typ: Number(getFieldValue("player_typ") || 1),
      hohldecke: elements.form.elements.hohldecke.checked,
      anzahl_personen: Number(getFieldValue("anzahl_personen") || 1),
      zeitbedarf_min: Number(getFieldValue("zeitbedarf_min") || 90),
      cms_status: getFieldValue("cms_status"),
      material_status: getFieldValue("material_status"),
      prozess_status: getFieldValue("prozess_status"),
      installationsdatum: getFieldValue("installationsdatum"),
      cluster: getFieldValue("cluster"),
      team: getFieldValue("team"),
      bemerkung: getFieldValue("bemerkung")
    };
  }

  async function requestJson(url, options) {
    const response = await fetch(url, options);
    const payload = await response.json().catch(function () {
      return {};
    });
    if (!response.ok) {
      throw new Error(payload.error || "Request fehlgeschlagen.");
    }
    return payload;
  }

  function getRowsForCurrentView() {
    if (state.currentView === "board") {
      return state.dataset.rollout_board;
    }
    if (state.currentView === "einkauf") {
      return state.dataset.einkauf_offen;
    }
    if (state.currentView === "konfig") {
      return state.dataset.konfig_offen;
    }
    if (state.currentView === "erp") {
      return state.dataset.erp_material;
    }
    return state.dataset.touren_freigabe;
  }

  function applyFilters(rows, filterKey) {
    return rows.filter(function (row) {
      const haystack = Object.values(row)
        .filter(function (value) {
          return value !== null && value !== undefined;
        })
        .join(" ")
        .toLowerCase();
      const matchesSearch = !state.search || haystack.includes(state.search);
      const matchesStatus = !state.statusFilter || row[filterKey] === state.statusFilter;
      return matchesSearch && matchesStatus;
    });
  }

  function highlightSelectedRows() {
    elements.body.querySelectorAll("tr").forEach(function (row) {
      row.classList.remove("is-selected");
    });
    elements.body.querySelectorAll("button.row-action").forEach(function (button) {
      if (button.dataset.standortId === state.selectedStandortId) {
        button.closest("tr").classList.add("is-selected");
      }
    });
  }

  function updateActiveNav() {
    elements.nav.querySelectorAll("button[data-view]").forEach(function (button) {
      button.classList.toggle("active", button.dataset.view === state.currentView);
    });
  }

  function getSelectedStandort() {
    return state.dataset.standorte.find(function (item) {
      return item.standort_id === state.selectedStandortId;
    });
  }

  function getSelectedRollout() {
    return state.dataset.rollouts.find(function (item) {
      return item.standort_id === state.selectedStandortId;
    });
  }

  function getSelectedTasks() {
    const rollout = getSelectedRollout();
    if (!rollout) {
      return [];
    }
    return state.dataset.tasks.filter(function (item) {
      return item.rollout_id === rollout.rollout_id && item.status !== "erledigt";
    });
  }

  function getSelectedMaterial() {
    const rollout = getSelectedRollout();
    if (!rollout) {
      return [];
    }
    return state.dataset.materialbedarf.filter(function (item) {
      return item.rollout_id === rollout.rollout_id;
    });
  }

  function getSelectedErp() {
    return state.dataset.erp_material.find(function (item) {
      return item.standort_id === state.selectedStandortId;
    });
  }

  function setFieldValue(name, value) {
    if (elements.form.elements[name]) {
      elements.form.elements[name].value = value || "";
    }
  }

  function setCheckboxValue(name, value) {
    if (elements.form.elements[name]) {
      elements.form.elements[name].checked = Boolean(value);
    }
  }

  function getFieldValue(name) {
    return String(elements.form.elements[name].value || "").trim();
  }

  function setMessage(element, message, type) {
    element.textContent = message || "";
    element.className = "form-message" + (message && type ? " is-" + type : "");
  }

  function hasCloudWriteAccess() {
    return state.sourceMode === "supabase" && Boolean(getCloudWriteUrl()) && Boolean(state.cloudWriteSecret);
  }

  function isWritableMode() {
    return state.sourceMode === "local" || hasCloudWriteAccess();
  }

  function getCloudWriteUrl() {
    const config = window.APP_CONFIG || {};
    return String(config.cloudWriteUrl || "").trim();
  }

  function readStoredCloudSecret() {
    try {
      return window.sessionStorage.getItem("jlsDemoWriteSecret") || "";
    } catch (error) {
      return "";
    }
  }

  function storeCloudSecret(secret) {
    try {
      if (secret) {
        window.sessionStorage.setItem("jlsDemoWriteSecret", secret);
      } else {
        window.sessionStorage.removeItem("jlsDemoWriteSecret");
      }
    } catch (error) {
      console.warn("Cloud-Secret konnte nicht in sessionStorage gespeichert werden.", error);
    }
  }

  function formatYesNo(value) {
    return value ? "Ja" : "Nein";
  }

  function renderValue(value) {
    if (value === null || value === undefined || value === "") {
      return "-";
    }
    return escapeHtml(String(value));
  }

  function buildMaterialViewDocument(title, standort, rollout, material, erp) {
    const subtitle = [standort.strasse, [standort.plz, standort.ort].filter(Boolean).join(" ")]
      .filter(Boolean)
      .join(", ");

    const metaRows = [
      ["PSO", erp && erp.pso_nummer ? erp.pso_nummer : "-"],
      ["Auftrag", erp && erp.auftragsnummer ? erp.auftragsnummer : "-"],
      ["Rollout", rollout && rollout.rollout_typ ? rollout.rollout_typ : "-"],
      ["Datum", rollout && rollout.installationsdatum ? rollout.installationsdatum : "-"]
    ];

    return (
      '<!DOCTYPE html><html lang="de"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">' +
      "<title>" + escapeHtml(title) + "</title>" +
      "<style>" +
      "body{font-family:Arial,sans-serif;background:#f7f1e7;color:#1f2a25;margin:0;padding:32px;}" +
      ".sheet{max-width:960px;margin:0 auto;background:#fffdf8;border:1px solid #d8cdbb;border-radius:20px;padding:28px;}" +
      ".eyebrow{font-size:12px;letter-spacing:.18em;text-transform:uppercase;color:#5d665f;}" +
      "h1{margin:8px 0 4px;font-size:42px;line-height:1;}" +
      ".subtitle{margin:0 0 22px;color:#5d665f;font-size:18px;}" +
      ".meta{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-bottom:22px;}" +
      ".box{background:#f6f1e7;border-radius:14px;padding:12px 14px;}" +
      ".box span{display:block;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5d665f;margin-bottom:4px;}" +
      "table{width:100%;border-collapse:collapse;}" +
      "th,td{padding:12px 10px;border-bottom:1px solid #e5dac8;text-align:left;}" +
      "th{font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#5d665f;}" +
      ".muted{color:#5d665f;}" +
      "@media print{body{background:#fff;padding:0;}.sheet{border:none;border-radius:0;box-shadow:none;}}" +
      "</style></head><body><main class=\"sheet\">" +
      '<div class="eyebrow">ERP Materialansicht</div>' +
      "<h1>" + escapeHtml(standort.standort_id + " " + (standort.filiale_name || "")) + "</h1>" +
      '<p class="subtitle">' + escapeHtml(subtitle || "Keine Adressdaten") + "</p>" +
      '<section class="meta">' +
      metaRows
        .map(function (row) {
          return '<div class="box"><span>' + escapeHtml(row[0]) + "</span><strong>" + escapeHtml(row[1]) + "</strong></div>";
        })
        .join("") +
      "</section>" +
      "<table><thead><tr><th>Typ</th><th>Artikel</th><th>Menge</th><th>Status</th><th>Hinweis</th></tr></thead><tbody>" +
      material
        .map(function (item) {
          return (
            "<tr><td>" +
            escapeHtml(item.artikel_typ || "-") +
            "</td><td>" +
            escapeHtml(item.artikel_code || "-") +
            "</td><td>" +
            escapeHtml(item.menge == null ? "-" : String(item.menge)) +
            "</td><td>" +
            escapeHtml(item.bestellstatus || "-") +
            "</td><td class=\"muted\">" +
            escapeHtml(item.hinweis || "") +
            "</td></tr>"
          );
        })
        .join("") +
      "</tbody></table></main></body></html>"
    );
  }

  function buildCsv(rows) {
    return rows
      .map(function (row) {
        return row
          .map(function (cell) {
            const value = String(cell == null ? "" : cell);
            return '"' + value.replace(/"/g, '""') + '"';
          })
          .join(",");
      })
      .join("\n");
  }

  function downloadTextFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(function () {
      URL.revokeObjectURL(url);
    }, 0);
  }

  function indexBy(items, key) {
    return items.reduce(function (acc, item) {
      acc[item[key]] = item;
      return acc;
    }, {});
  }

  function compareTaskPriority(a, b) {
    const rank = { hoch: 1, mittel: 2, niedrig: 3 };
    return (rank[a.prioritaet] || 9) - (rank[b.prioritaet] || 9) || String(a.faellig_am).localeCompare(String(b.faellig_am));
  }

  function compareMaterialType(a, b) {
    const rank = { Screen: 1, Halterung: 2, "IP Power": 3, Player: 4 };
    return (rank[a.artikel_typ] || 9) - (rank[b.artikel_typ] || 9) || String(a.artikel_code).localeCompare(String(b.artikel_code));
  }

  function compareByDateThenStandort(a, b) {
    return String(a.installationsdatum).localeCompare(String(b.installationsdatum)) || String(a.standort_id).localeCompare(String(b.standort_id));
  }

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }
})();
