# Télé-Flux

Outil de conception, de simulation et d’export pour les architectures de routage télécom (PABX / IPBX). Schématisez les flux d’appels (standards, SDA, SVI, groupements, messageries) et simulez leur comportement de façon interactive.

> **Créé avec l’aide de l’IA** — cette solution a été conçue pour faciliter la création de schémas de routage télécom détaillés, plus rapidement et plus clairement.

---

## Fonctionnalités

1. **Logigramme de routage interactif**
   - Rendu vectoriel (SVG)
   - Modes Auto-horizontal, Auto-vertical et Manuel
   - Séparation des sous-graphes indépendants
   - Vue schéma uniquement pour les dossiers techniques

2. **Exports haute qualité**
   - SVG (vectoriel, résolution infinie)
   - PNG HD (échelle ×2.5) pour Word / PowerPoint

3. **Simulateur d’appels**
   - Composition d’un numéro ou d’une ligne interne
   - Visualisation du parcours d’appel
   - Appels entrants, sortants et internes

4. **Rapports, audit et validation**
   - Transcriptions textuelles de routage
   - Commentaires techniques et commentaires clients
   - Détection des boucles, postes orphelins et messageries incomplètes

---

## Stack technique

- **Frontend** : React 19, TypeScript, Tailwind CSS 4
- **Moteur graphique** : SVG natif + disposition hiérarchique (BFS)
- **Icônes** : Lucide React
- **Build** : Vite

---

## Installation locale

### Prérequis

- [Node.js](https://nodejs.org/) 18+
- npm

### Développement

```bash
npm install
npm run dev
```

Ouvrez l’URL indiquée (par défaut `http://localhost:3000`).

### Production

```bash
npm run build
```

Les fichiers générés sont dans `dist/`. Prévisualisation locale :

```bash
npm run preview
```

---

## Déploiement Debian (systemd)

1. Copiez le projet vers `/var/www/telecom-router` (ou un autre chemin).
2. Droits :

```bash
sudo chown -R www-data:www-data /var/www/telecom-router
```

3. Node.js (exemple NodeSource 20.x) :

```bash
sudo apt update
sudo apt install -y curl
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
```

4. Build :

```bash
cd /var/www/telecom-router
sudo -u www-data npm install
sudo -u www-data npm run build
```

5. Service systemd (fichier fourni `telecom-router.service`) :

```bash
sudo cp /var/www/telecom-router/telecom-router.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now telecom-router.service
```

Commandes utiles :

```bash
sudo systemctl status telecom-router.service
sudo journalctl -u telecom-router.service -f
```

---

## Reverse proxy Nginx

Exemple vers le port `3000` :

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

HTTPS : `sudo certbot --nginx`.
