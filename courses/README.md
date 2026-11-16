# Structure Modulaire des Cours — Mon École en Poche

Cette architecture sépare chaque cours dans son propre dossier dédié avec ses pages, ses données JSON et ses sources PDF.
Vous pouvez ainsi modifier, enrichir ou tester un cours spécifique sans aucun risque d'impacter les autres matières déjà terminées.

---

## 📁 1. Cours d'Anglais — English Starship 1
- **Dossier** : `courses/english_starship_1/`
- **Application dédiée** : `courses/english_starship_1/index.html` (ouvrable directement dans le navigateur)
- **Données JSON** : `courses/english_starship_1/data/english_starship_data.json`
- **Sources et Images** : `courses/english_starship_1/assets/`
  - `student_book/` : Les 115 pages authentiques (Couverture en Page 1 + 114 pages de cours Unités 1 à 8, Révisions et Cambridge YLE Starters).
  - `classroom/` : Les pages et cartes interactives de Classroom English (8 consignes de classe + Chiffres & Couleurs).
  - `workbook/` : Le cahier d'activités (Workbook) et sa couverture.
  - Documents PDF sources officiels de référence.

---

## 📁 2. Cours de Français — Citronnelle CP
- **Dossier** : `courses/francais_cp/`
- **Application dédiée** : `courses/francais_cp/index.html` (ouvrable directement dans le navigateur)
- **Données JSON** : `courses/francais_cp/data/francais_cp_data.json`
- **Sources et Images** : `courses/francais_cp/assets/`
  - Livres 1 et 2 numérisés.
  - Guide pédagogique complet.
  - Bilans et examens sur 20 pour les 12 semaines du programme.

---

## 🌐 3. Portail Central (Accueil général)
- **Fichier principal** : `index.html` (à la racine)
- **Version autonome tout-en-un** : `Citronnelle-CP.html`
- Relie instantanément toutes les matières avec choix de langue (Français, Arabe, Anglais) et suivi multi-profils.
