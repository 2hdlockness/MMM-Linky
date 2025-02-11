const NodeHelper = require("node_helper");
const cron = require("node-cron");

var log = () => { /* do nothing */ };

module.exports = NodeHelper.create({

  start () {
    this.Linky = null;
    this.config = null;
    this.dates = [];
    this.consumptionData = {};
    this.chartData = {};
  },

  socketNotificationReceived (notification, payload) {
    switch (notification) {
      case "INIT":
        this.config = payload;
        this.initialize();
        break;
    }
  },

  // intialisation de MMM-Linky
  async initialize () {
    console.log(`[LINKY] MMM-Linky Version: ${require("./package.json").version} Revison: ${require("./package.json").rev}`);
    if (this.config.debug) log = (...args) => { console.log("[LINKY]", ...args); };
    log("Config:", this.config);
    this.Dates = await this.getDates();
    if (!this.Dates.length) return;
    log("Dates:", this.Dates);
    process.on("unhandledRejection", (error) => {
      // catch conso API error and Enedis only
      if (error.stack.includes("MMM-Linky/node_modules/linky/") && error.response) {
        // catch Enedis error
        if (error.response.status && error.response.message && error.response.error) {
          console.error(`[LINKY] [${error.response.status}] ${error.response.message}`);
          this.sendSocketNotification("ERROR", error.response.message);
        } else {
          // catch Conso API error
          if (error.message) {
            console.error(`[LINKY] [${error.code}] ${error.message}`);
            this.sendSocketNotification("ERROR", `[${error.code}] ${error.message}`);
          } else {
            // must never Happen...
            console.error("[LINKY]", error);
          }
        }
      }
    });
    const { Session } = await this.loadLinky();
    try {
      this.Linky = new Session(this.config.token, this.config.prm);
    } catch (error) {
      console.error(`[LINKY] ${error}`);
      this.sendSocketNotification("ERROR", error.message);
      return;
    }
    this.scheduleDataFetch();
  },

  // Récupération planifié des données
  scheduleDataFetch () {
    const randomHour = Math.floor(Math.random() * 3) + 10;
    const randomMinute = Math.floor(Math.random() * 60);
    const cronExpression = `${randomMinute} ${randomHour} * * *`;
    cron.schedule(cronExpression, () => {
      log("Exécution de la tâche planifiée de récupération des données.");
      this.getConsumptionData();
    });

    const fixRandomMinute = randomMinute < 10 ? `0${randomMinute}` : randomMinute;
    console.log(`[LINKY] Tâche planifiée pour ${randomHour}:${fixRandomMinute} UTC.`);
    this.getConsumptionData();
  },

  // Récupération des données
  async getConsumptionData () {
    this.consumptionData = {};
    var error = 0;
    await Promise.all(this.Dates.map(
      async (date) => {
        await this.sendConsumptionRequest(date).then((result) => {
          if (result.start && result.end && result.interval_reading) {
            const year = result.start.split("-")[0];
            log(`-${year}- Données reçues de l'API :`, result);
            this.consumptionData[year] = [];

            result.interval_reading.forEach((reading) => {
              const day = parseInt(reading.date.split("-")[2]);
              const month = parseInt(reading.date.split("-")[1]);
              const value = parseFloat(reading.value);

              const isDuplicate = this.consumptionData[year].some(
                (entry) => entry.day === day && entry.month === month && entry.value === value
              );

              if (!isDuplicate) {
                this.consumptionData[year].push({ day, month, value });
              }
            });
          } else {
            error = 1;
            console.error("[LINKY] Format inattendu des données :", result);
            if (result.error) this.sendSocketNotification("ERROR", result.error.error);
            else this.sendSocketNotification("ERROR", "Erreur lors de la collecte de données.");
          }
        });
      }
    ));
    if (!error) {
      log("Données de consommation collecté.", this.consumptionData);
      this.setChartValue();
    } else {
      if (error) log("Il y a des Erreurs API... on va attente le prochain cycle DataFetch");
      else log("Données identique.");
    }
  },

  // création des données chartjs
  setChartValue () {
    const days = [];
    const datasets = [];
    const colors = this.getChartColors();

    let index = 0;
    for (const year in this.consumptionData) {
      const data = this.consumptionData[year].sort((a, b) => {
        if (a.month === b.month) {
          return a.day - b.day;
        }
        return a.month - b.month;
      });

      const values = data.map((item) => item.value);

      if (index === 0) {
        days.push(
          ...data.map(
            (item) => `${item.day} ${["Error", "janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."][item.month]}`
          )
        );
      }

      datasets.push({
        label: year,
        data: values,
        backgroundColor: colors[index],
        borderColor: colors[index].replace("0.8", "1"),
        borderWidth: 1
      });
      index++;
    }

    log("Données des graphiques :", { labels: days, data: datasets });
    this.chartData = {
      labels: days,
      datasets: datasets,
      energie: this.config.annee_n_minus_1 === 1 ? this.setEnergie() : null,
      update: `Données du ${new Date(Date.now()).toLocaleString("fr")}`
    };
    this.sendSocketNotification("DATA", this.chartData);
  },

  // Selection schémas de couleurs
  getChartColors () {
    const colorSchemes = {
      1: ["rgba(245, 234, 39, 0.8)", "rgba(245, 39, 230, 0.8)"],
      2: ["rgba(252, 255, 0, 0.8)", "rgba(13, 255, 0, 0.8)"],
      3: ["rgba(255, 255, 255, 0.8)", "rgba(0, 255, 242, 0.8)"],
      4: ["rgba(255, 125, 0, 0.8)", "rgba(220, 0, 255, 0.8)"]
    };
    return colorSchemes[this.config.couleur] || colorSchemes[1];
  },

  // Demande des datas selon l'API
  sendConsumptionRequest (date) {
    return new Promise((resolve) => {
      this.Linky.getDailyConsumption(date.startDate, date.endDate).then((result) => {
        resolve(result);
      });
    });
  },

  // Importation de la librairie linky (dynamic impor)
  async loadLinky () {
    const loaded = await import("linky");
    return loaded;
  },

  // cacul des dates périodique
  calculateDates (yearOffset = 0) {
    const today = new Date();
    today.setFullYear(today.getFullYear() - yearOffset);
    const endDate = today.toISOString().split("T")[0];
    const startDate = new Date(today);

    switch (this.config.periode) {
      case 1:
        startDate.setDate(today.getDate() - 1);
        break;
      case 2:
        startDate.setDate(today.getDate() - 3);
        break;
      case 3:
        startDate.setDate(today.getDate() - 7);
        break;
      default:
        console.error("[LINKY] periode invalide.");
        this.sendSocketNotification("ERROR", "periode invalide.");
        return null;
    }

    return { startDate: startDate.toISOString().split("T")[0], endDate };
  },

  // Récupere les Dates pour l'intérogation de l'API
  getDates () {
    var Dates = [];
    return new Promise((resolve) => {
      var date = this.calculateDates();
      if (date) Dates.push(date);
      if (this.config.annee_n_minus_1 === 1) {
        date = this.calculateDates(1);
        if (date) Dates.push(date);
      }
      resolve(Dates);
    });
  },

  // Création du message Energie
  setEnergie () {
    const currentYearTotal = this.calculateTotalConsumption(new Date().getFullYear().toString());
    const previousYearTotal = this.calculateTotalConsumption((new Date().getFullYear() - 1).toString());

    var message, color, periodText;

    switch (this.config.periode) {
      case 1:
        periodText = "le dernier jour";
        break;
      case 2:
        periodText = "les 3 derniers jours";
        break;
      case 3:
        periodText = "les 7 derniers jours";
        break;
      default:
        periodText = "période inconnue";
    }

    if (currentYearTotal < previousYearTotal) {
      message = `Félicitations, votre consommation d'énergie a baissé sur ${periodText} par rapport à l'année dernière !`;
      color = "green";
    } else if (currentYearTotal > previousYearTotal) {
      message = `Attention, votre consommation d'énergie a augmenté sur ${periodText} par rapport à l'année dernière !`;
      color = "red";
    } else {
      message = `Votre consommation d'énergie est stable sur ${periodText} par rapport à l'année dernière.`;
      color = "yellow";
    }

    return {
      message: message,
      color: color
    };
  },

  // Calcul de la comsommation totale
  calculateTotalConsumption (year) {
    let total = 0;
    if (this.consumptionData[year]) {
      this.consumptionData[year].forEach((data) => {
        total += data.value;
      });
    }
    return total;
  }
});
