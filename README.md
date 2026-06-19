# 📞 Concepteur de Routage Télécom (Designer & Simulateur Interactif)

Ce projet est un outil visuel moderne de conception, de simulation et de génération de rapports pour les configurations d'infrastructure télécom (PABX / IPBX). Il permet de schématiser les flux d'appels (standards, SDA, serveurs vocaux interactifs, groupements de postes, répondeurs) et de simuler leur comportement de manière interactive.

Le projet a été nettoyé de toutes les dépendances d'API IA (Gemini, OpenAI, etc.) afin de garantir une version 100% autonome, rapide, sécurisée et optimale pour un déploiement dans des environnements d'entreprise.

---

## 🚀 Fonctionnalités Clés

1. **Logigramme de Routage Graphique Interactif** :
   * Rendu fluide sous forme de schéma vectoriel (SVG).
   * **Trois modes d'affichage** : Auto-Horizontal (aligné en couches de flux), Auto-Vertical (arborescence descendante) et Manuel.
   * Auto-séparation avancée des sous-graphes indépendants (forêts de routage disjointes).
   * **Vue Schéma Uniquement** : Un espace d'affichage épuré idéal pour les dossiers d'architecture technique.

2. **Téléchargement Haute Qualité (HD)** :
   * **Export SVG** : Format vectoriel natif à résolution infinie (sans perte de qualité), parfait pour les documents PDF professionnels.
   * **Export PNG HD** : Image haute définition générée à double densité de pixels (échelle x2.5) pour s'intégrer proprement dans les documents bureautiques (Word, PowerPoint).

3. **Simulateur d'Appels Temporel & Interactif** :
   * Composez un numéro ou une ligne interne depuis l'émulateur.
   * Visualisez en temps réel le parcours de l'appel grâce à des animations de flux lumineuses.
   * Gestion des cas d'appels entrants, sortants et des cas d'appels entre postes internes sans programmation spécifique (comportement d'acheminement standardisé).

4. **Analyseur de Rapports, Audit & Validation** :
   * Génération automatique de transcriptions textuelles de routage.
   * Distinction claire entre commentaires techniques (pour les techniciens télécoms) et commentaires clients (traduction simplifiée vulgarisée du flux).
   * Moteur de validation temps réel : Détection des boucles de redirection sans fin, des postes orphelins ou des messageries sans temporisation d'appel.

---

## 🛠️ Architecture Technologique

* **Frontend** : React 18, TypeScript, Tailwind CSS.
* **Moteur Graphique** : Moteur de rendu SVG natif avec positionnement dynamique assisté par algorithme de parcours en largeur (BFS) hiérarchique.
* **Bibliothèque d'icônes** : Lucide React.
* **Outils d'animation** : Motion (anciennement Framer Motion).
* **Build System** : Vite (HMR ultra-rapide).

---

## 💻 Installation et Démarrage Local

### Prérequis
* [Node.js](https://nodejs.org/) (Version 18 ou supérieure recommandée)
* `npm` (installé par défaut avec Node.js)

### Déploiement local (mode développement)
1. Installez les dépendances :
   ```bash
   npm install
   ```
2. Démarrez le serveur de développement :
   ```bash
   npm run dev
   ```
3. Ouvrez votre navigateur sur la page indiquée (généralement `http://localhost:3000`).

### Compilation pour la production
Pour générer les fichiers Web statiques optimisés (HTML, CSS monolithique, JS zippé) :
```bash
npm run build
```
Les fichiers générés se trouveront dans le répertoire `dist/`.

---

## 🧊 Publication et Partage sur GitHub

Pour mettre ce projet sur votre compte GitHub :

1. Créez un nouveau dépôt vide sur votre compte GitHub (sans inclure de fichier README ou de licence .gitignore à la création).
2. Ouvrez un terminal dans le répertoire racine de ce projet :
   ```bash
   # Initialiser le dépôt git local
   git init

   # Ajouter tous les fichiers (le fichier .gitignore est déjà configuré)
   git add .

   # Créer le premier commit
   git commit -m "Initial commit: Concepteur de routage télécom interactif"

   # Renommer la branche principale en 'main'
   git branch -M main

   # Lier au dépôt distant GitHub (remplacez par votre URL)
   git remote add origin https://github.com/VOTRE_PSEUDO/NOM_DU_DEPOT.git

   # Pousser les fichiers vers GitHub
   git push -u origin main
   ```

---

## 🐧 Déploiement et Démarrage Automatique sous Debian (Systemd)

Pour déployer la solution sur un serveur Debian d'entreprise avec démarrage à chaud automatique en tâche de fond (daemon systemd) :

### 1. Préparation du serveur de destination
Déplacez l'intégralité des fichiers du projet dans le dossier de production habituel de votre serveur Debian (par exemple `/var/www/telecom-router`).
Assurez-vous que l'utilisateur système standard de Debian (`www-data` ou votre utilisateur applicatif dédié) a les droits de lecture sur le répertoire :
```bash
sudo chown -R www-data:www-data /var/www/telecom-router
```

### 2. Installation de Node.js sur Debian
Si ce n'est pas déjà fait, configurez le dépôt NodeSource pour installer Node.js v18/20 :
```bash
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 3. Installation et Production Build
Exécutez l'installation des dépendances et compilation en production :
```bash
cd /var/www/telecom-router
sudo -u www-data npm install
sudo -u www-data npm run build
```

### 4. Configuration du service automatique (Systemd)
Le projet contient un fichier de configuration systemd prêt à l'emploi nommé `telecom-router.service`. 

Copiez-le dans le dossier système de Debian :
```bash
sudo cp /var/www/telecom-router/telecom-router.service /etc/systemd/system/
```

Rechargez ensuite les daemons systemd pour enregistrer votre nouveau service :
```bash
sudo systemctl daemon-reload
```

### 5. Administration du service
* **Activer le démarrage automatique au démarrage de Debian** :
  ```bash
  sudo systemctl enable telecom-router.service
  ```
* **Démarrer le service immédiatement** :
  ```bash
  sudo systemctl start telecom-router.service
  ```
* **Consulter le statut du service** (pour voir s'il fonctionne correctement) :
  ```bash
  sudo systemctl status telecom-router.service
  ```
* **Consulter les journaux d'activité en temps réel** :
  ```bash
  sudo journalctl -u telecom-router.service -f
  ```

---

## 🔒 Configuration Reverse Proxy de Production (Nginx)

Pour exposer votre outil au port web standard `80` ou `443` avec SSL, configurez un bloc serveur Nginx en proxy de flux vers le port de l'application (ici configuré sur `3000`) :

```nginx
server {
    listen 80;
    server_name telecom.votre-entreprise.fr;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
Installez ensuite un certificat Let's Encrypt gratuit avec Certbot (`sudo certbot --nginx`) pour sécuriser la liaison HTTPS.
