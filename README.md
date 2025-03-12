# MMM-Linky

Ce module a été spécialement conçu pour les utilisateurs français possédant un compteur Linky.

Grâce à une intégration fluide avec Conso API, il permet de récupérer et d'afficher les données de consommation d'énergie directement sur votre miroir.

Si vous choisissez de récupérer les données de l'année précédente une comparaison sera effectuée et un message vous indiquant si vous avec + ou - consommé sera affiché.

Le header est également dynamique et changera en fonction de la période sélectionnée !

Les données sont actualisées une fois par jour.

## ScreenShots

![APIs](https://github.com/user-attachments/assets/e3497a96-6a3a-4322-b9cb-fdd8bcfe9688)
![Conso 7 derniers jours JPG](https://github.com/user-attachments/assets/fd2412cf-6cb1-4171-a3b7-1a9300ab2cc6)
![Conso 3 derniers jours JPG](https://github.com/user-attachments/assets/c6658811-e6f4-4a5d-8e2c-ea0a53189fea)
![Conso veille](https://github.com/user-attachments/assets/2e50eac0-71d2-44b4-9c78-0e9f4f1b80db)

Possibilité de choisir entre 4 thèmes de couleur pour le graphique et d'afficher les valeurs dans les barres :

![WithDataLabel](https://github.com/user-attachments/assets/3ee608d5-3127-4adb-b6c3-2a3a07f6111e)
![Capture](https://github.com/user-attachments/assets/a4d7366f-9f04-4a02-afaf-221caa9e1872)

## Installation

```sh
cd ~/MagicMirror/modules
git clone https://github.com/2hdlockness/MMM-Linky
cd MMM-Linky
npm run setup
```

## Utilisation du module

### Pré-requis

* Obtenir un token personnel depuis le site <https://conso.boris.sh/>
* Récupérer son numéro PDL Linky (PRM). Vous ne savez pas où le trouver cliquez [ICI](https://www.enedis.fr/faq/compteur-linky/ou-trouver-le-numero-point-de-livraison-pdl-du-compteur-linky)

Pour utiliser ce module, ajoutez-le au tableau modules dans le fichier `config/config.js` :

```js
    {
      module: "MMM-Linky",
      position: "top_left",
      config: {
        debug: 0,
        prm: "",
        token: "",
        periode: 1,
        apis: ["getDailyConsumption"],
        affichageInterval: 1000 * 15,
        annee_n_minus_1: 1,
        couleur: 3,
        valuebar: 1,
        valuebartextcolor: 0,
        header: 1,
        energie: 1,
        updateDate: 1,
        updateNext: 1,
        updateHour: 14
      },
    },
```

Configuration minimale :

```js
    {
      module: "MMM-Linky",
      position: "top_left",
      config: {
        prm: "",
        token: "",
        apis: ["getDailyConsumption"]
      },
    },
```

## Configuration options

Option|Default|Description
---|---|---
`debug`|0|Active le mode débogage. <br>`1` : activer <br> `0` : désactiver
`prm`||Votre numéro PDL Linky [VOIR ICI](https://www.enedis.fr/faq/compteur-linky/ou-trouver-le-numero-point-de-livraison-pdl-du-compteur-linky)
`token`||Votre token personnel [CONSO API](https://conso.boris.sh/)
`periode`|1|Choix de la période: <br>`1` = Données de la veille <br>`2` = 3 derniers jours <br>`3` = 7 derniers jours
`apis`|["getDailyConsumption"]|Nom des API à interroger (voir ci-dessous)
`affichageInterval`|1000 * 15|Intervalle d'affichage des graphiques en ms (si utilisation de plusieurs API)
`annee_n_minus_1`|1|Récupérer les données de l'année précédente. (uniquement pour les API `getDailyConsumption` et `getDailyProduction`) <br>`1` : activer <br> `0` : désactiver
`couleur`|3| `1` : Bleu et Rose <br>`2` : Jaune et Vert <br>`3` : Blanc et Bleu <br>`4` : Orange et Violet
`valuebar`|1|Affiche les valeurs à l'intérieur des barres. <br>`1` : afficher <br>`0` : masquer
`valuebartextcolor`|0|Couleur du texte des valeurs. <br>`0` : texte noir <br>`1` : texte blanc
`header`|1|Affiche l'en-tête selon la période selectionné. <br>`1` : afficher <br>`0` : masquer
`energie`|1|Affiche l'indicateur de consomation d'énergie. <br>`1` : afficher <br>`0` : masquer
`updateDate`|1|Affiche la date de récupération des données. <br>`1` : afficher <br>`0` : masquer
`updateNext`|1|Affiche la date du prochain cycle de récupération des données. <br>`1` : afficher <br>`0` : masquer
`updateHour`|14|Heure de la tâche planifiée pour la mise à jours des données. (voir ci-dessous)

### APIs

Grâce à `Conso API`, vous pouvez interroger plusieurs API et afficher le graphique correspondant.

* `getDailyConsumption`: Récupère la consommation quotidienne.
* `getLoadCurve`: Récupère la puissance moyenne consommée de la veille sur un intervalle de 30 min.
* `getMaxPower`: Récupère la puissance maximale de consommation atteinte quotidiennement.

Il est également possible d'afficher vos données de production d'energie.

* `getDailyProduction`: Récupère la production quotidienne.
* `getProductionLoadCurve`: Récupère la puissance moyenne produite sur un intervalle de 30 min.

### Mise en cache des données

Afin d'éviter une surcharge de l'API, une mise en cache des données a été mise en place.

De ce fait, lors d'un redémarrage de `MagicMirror²`, `MMM-Linky` utilisera les dernières données reçues de l'API.

La validité de ce cache à été fixée à 10h.

### Effacer le cache des données

Vous pouvez toute fois détruire ce cache avec la commande: `npm run reset:cache`

Il est déconseillé d'utiliser cette commande trop souvent car l'api a un usage limité.

`Conso API` a fixé cette régle:

* Maximum de 5 requêtes par seconde.
* Maximum de 10 000 requêtes par heure.

⚠ Si vous dépassez une des régles, votre adresse IP sera bloquée sans avertissement !

Malheurement, nous n'avons aucun pouvoir pour la débloquer...

Pour rappel un appel API est une requête. si vous utilisez 2 API en config... c'est donc 2 requêtes !

### Changement de configuration

Afin de générer un nouveau cache, une nouvelle requête sera relancé pour les API suivantes (si utilisées)

↪️ En cas de changement de configuration `periode`

* `getDailyConsumption`
* `getMaxPower`
* `getDailyProduction`

↪️ En cas de changement de configuration `annee_n_minus_1`

* `getDailyConsumption`
* `getDailyProduction`

### Changement de l'heure de la jour des données (tâche planifiée)

Par défaut, les mises à jours des données sont programmés à 14h (`14` dans la configuration `updateHour`) avec une selection aléatoire dans les 15 premières minutes.

Vous pouvez changer l'heure de cette mise jour par une autre heure comprise entre `6` et `14`.

## Mise à jour

```sh
cd ~/MagicMirror/modules/MMM-Linky
npm run update
```

## Faire un don

Si vous aimez ce module et que vous êtes généreux !

[![Donate](https://img.shields.io/badge/Donate-PayPal-green.svg)](https://www.paypal.com/donate?hosted_button_id=DQW6PLJLDDB8L)

Merci !

## Crédits

* Auteurs :
  * @2hdlockness
  * @bugsounet
* License : MIT
