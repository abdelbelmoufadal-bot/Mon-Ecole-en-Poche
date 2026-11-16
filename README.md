# Mon École en Poche — Citronnelle CP & English Starship

> Application web ludo-éducative pour le CP : apprentissage progressif de la lecture et de l'écriture en français (méthode Citronnelle CP) et découverte de l'anglais oral et visuel (English Starship Level 1).

---

## 🚀 Démarrage Rapide

Sous Windows, double-cliquer sur **DEMARRER-LE-SITE.cmd** démarre un serveur local et ouvre le site à `http://127.0.0.1:3130/`. Ce lancement sert les fichiers audio depuis une adresse HTTP locale. Les progrès d'un ancien onglet `file://` restent dans cet ancien contexte ; utiliser l'export/import familial pour les transférer.

La lecture normale utilise directement le navigateur, sans appel à un lecteur externe. Le mode de dépannage Windows est désactivé par défaut afin d’éviter son délai de démarrage. Pour le demander explicitement, ajouter `?audioOutput=windows` avant le fragment `#` de l’adresse de la leçon. Si FFmpeg est disponible dans le PATH, ce mode utilise `System.Media.SoundPlayer` pour les enregistrements des leçons. Il convertit les MP3 à la demande en WAV dans `scratch/native-audio-cache`, sans modifier les originaux. Node.js, FFmpeg et Windows PowerShell sont nécessaires à ce mode ; aucun droit administrateur n'est demandé. Les boutons d'arrêt et de répétition utilisent le même lecteur. La vitesse s'applique au début de chaque lecture. Les effets et la synthèse vocale restent gérés par le navigateur. Sur un hébergement web ou en `file://`, les enregistrements utilisent le lecteur du navigateur. Ce contournement local ne répare pas la chaîne audio du navigateur.

L'API de lecture accepte uniquement les enregistrements MP3 nommés par leur empreinte dans `assets`. Elle exige une connexion locale, une origine identique et un jeton temporaire ; elle ne permet pas de fournir une commande ou un chemin arbitraire.

L'application et son serveur restent sans dépendance de production. Les tests de DOM utilisent jsdom :

```bash
# 1. Installer les dépendances de développement pour les tests
npm ci

# 2. Lancer la suite complète de tests de validation
npm test

# 3. Lancer le serveur local de développement
npm run serve
```

L'application sera accessible instantanément sur :  
**[http://localhost:3000](http://localhost:3000)**

---

## 📁 Architecture du Projet

```text
D:\ERP\CP\
├── index.html                   # Portail central multi-matières (Français, Anglais, Maths)
├── package.json                 # Configuration du projet et scripts d'industrialisation
├── courses/                     # Modules et applications par matière
│   ├── francais_cp/             # Application dédiée Français CP (Citronnelle)
│   │   ├── index.html
│   │   ├── data/                # francais_cp_data.json (consommé dynamiquement)
│   │   └── assets/              # Sources & médias
│   └── english_starship_1/      # Application dédiée Anglais (Starship 1)
│       ├── index.html
│       ├── data/                # english_starship_data.json (consommé dynamiquement)
│       └── assets/              # Pages Student Book, Workbook, Classroom
├── assets/                      # Médias partagés (audios, polices Borel, images webp)
├── tests/                       # Suite de tests automatisés (CI/CD)
│   ├── run-all-tests.js         # Test Runner principal (npm test)
│   ├── buttons.test.js          # Audit des boutons et fonctions interactives
│   ├── router.test.js           # Validation du routeur central unifié
│   ├── runtime.test.js          # Simulation runtime Node.js VM
│   └── data.test.js             # Validation de l'intégrité des schémas JSON
├── scripts/
│   └── serve.js                 # Serveur HTTP local zero-dependency
├── archives-html/               # Versions HTML monolithiques archivées (dont Citronnelle-CP.html ~70 Mo)
└── sources-pdf/                 # Documents PDF sources (> 420 Mo)
```

---

## 🛠️ Commandes Disponibles

| Commande | Action |
|---|---|
| `npm test` | Exécute les 13 suites : interactions, routeur, données, runtime, navigation, régressions, HTTP, chemins audio, compatibilité Windows, parcours des semaines et enchaînements des voix français/anglais et présentation mobile |
| `npm run test:audit` | Parcourt les routes et commandes audio des trois applications dans un DOM isolé |
| `npm run test:regressions` | Vérifie les validations des activités, les réglages, les profils et les imports de sauvegardes |
| `npm run test:media` | Vérifie les références de médias et décode les fichiers audio ; nécessite Python et FFmpeg |
| `npm run test:buttons` | Contrôle l'absence de fonctions orphelines et l'intégrité des boutons interactifs |
| `npm run test:router` | Valide le bon fonctionnement et le dispatching des 22+ routes de l'application |
| `npm run test:data` | Vérifie la conformité des fichiers JSON de cours dans `courses/*/data/` |
| `npm run test:runtime` | Simule le cycle complet de boot et de navigation dans un environnement DOM virtuel |
| `npm run serve` | Démarre le serveur HTTP local ultra-rapide sur le port 3000 |

---

## 🎯 Architecture Technique (v2.1.0)

### 1. Routeur Central Unifié (`unifiedRoute`)
* Remplacement des 6 couches historiques de monkey-patching par une table déclarative unique.
* Cycle de vie strict :
  1. **Before Route :** Nettoyage des états audio (`stopSpeech`), synchronisation linguistique (`I18N`) et réinitialisation des variables de session.
  2. **Route Matcher :** Dispatching direct vers les contrôleurs de vues.
  3. **After Route :** Mise à jour des onglets actifs, des profils, et gestion de l'accessibilité clavier (`#main.focus()`).

### 2. Service de Chargement de Données (`DataLoader`)
* Chargement asynchrone dynamique des fichiers JSON de cours (`courses/*/data/*.json`) via `fetch()`.
* Mode de résilience **Offline-First** : si ouvert directement via le protocole `file:///` ou sans réseau, bascule automatique et transparente sur les données embarquées de secours.

### 3. Mascotte Interactive (`cheerWithCapi`)
* Clic interactif sur la mascotte Capi déclenchant l'animation CSS `@keyframes capiJoyJump`.
* Synthèse vocale avec encouragements personnalisés en **Français**, **Arabe** et **Anglais**.
* Feedback visuel par bulle toast non intrusive.

## Parcours des semaines en cinq étapes

Chaque semaine française présente l’histoire, les deux sons, une révision et le défi final. Les 18 ateliers et le bilan conservent leurs identifiants et leurs résultats. Les étapes des sons sont terminées lorsque leurs neuf ateliers sont réussis ; l’histoire est confirmée par l’enfant et la révision après deux petits jeux. Le bilan conserve son seuil de passage.

L’étape consultée et les deux confirmations sont enregistrées dans `state.weekJourney`, séparément pour chaque enfant, et incluses dans les exports familiaux. Les anciennes sauvegardes sans ce champ restent acceptées. Les composants communs sont `assets/week-journey.js` et `assets/week-journey.css`. Test ciblé : `node tests/week-journey.test.js`.

## Voix du Grand Bilan

Après une bonne réponse : encouragement jusqu’à sa fin réelle, pause de 500 ms, lecture de la réponse par la narratrice, puis pause de 1 seconde avant la question suivante. Les enregistrements utilisent l’événement ended et les voix de synthèse utilisent onend. Le délai de 1,2 seconde qui coupait la lecture a été retiré.

Arrêter annule la lecture, la pause et le passage automatique. Un bouton Question suivante permet alors de continuer manuellement. Une erreur audio propose aussi cette reprise, sans faire passer automatiquement à la suite. Le changement de page ou d’enfant annule les séquences en cours. Test ciblé : node tests/bilan-audio.test.js.

## Voix des défis anglais

Les missions attendent la fin de l’encouragement anglais, une pause de 500 ms, la réponse lue jusqu’à sa fin et une pause de 1 seconde avant le défi suivant. Le délai automatique de 800 ms a été supprimé. Les voix enregistrées et synthétiques signalent leur fin réelle ; une répétition demandée n’est terminée qu’après sa dernière lecture.

Stop audio, Listen, Pause, l’aide et la navigation annulent la séquence en attente. Après un arrêt ou une erreur, Continue permet de reprendre manuellement. Test ciblé : node tests/english-audio-sequence.test.js.

## Présentation mobile

Un seul bouton Menu ouvre une liste défilante avec la navigation, la langue, le profil, les étoiles et les réglages. Les étapes de la leçon ou de la semaine y restent disponibles. Le menu se ferme avec un choix, la croix, Échap ou le fond extérieur. Sur ordinateur, les commandes retrouvent leur position d’origine.

Le lecteur mobile affiche Rejouer, Arrêter et Options. Les réglages de répétition et de vitesse sont repliés ; un espace correspondant à sa hauteur est réservé pour permettre de voir toutes les réponses. En paysage sur écran bas, il reste dans le flux de la page.

Les consignes des ateliers et bilans occupent toute la largeur, au-dessus du bouton d’écoute. Les choix illustrés sont présentés sur deux colonnes au maximum ; les réponses longues passent sur une colonne aux petites largeurs. L’accueil utilise des cartes de matières compactes et entièrement cliquables. Les contenus et le fonctionnement sur ordinateur sont conservés.

Le comportement est partagé par assets/mobile-layout.js et assets/mobile-layout.css. Test ciblé : node tests/mobile-layout.test.js.
