# Coutois Automobile — Procédure complète de mise en ligne

## Résumé des coûts

| Service | Fournisseur | Prix |
|---------|-------------|------|
| Hébergement du site | Netlify | Gratuit |
| CMS (gestion véhicules) | Decap CMS | Gratuit |
| Stockage du code | GitHub | Gratuit |
| Nom de domaine coutois-automobile.fr | OVH | ~7 €/an |
| Email contact@coutois-automobile.fr | OVH (inclus avec domaine) | Gratuit |
| Formulaires (devis + achat) | Netlify Forms | Gratuit (100/mois) |
| **TOTAL** | | **~7 €/an** |

---

## ÉTAPE 1 : Créer un compte GitHub (5 min)

1. Va sur https://github.com/signup
2. Crée un compte (email + mot de passe)
3. Confirme l'email

### Créer le repository

4. Clique le "+" en haut à droite puis "New repository"
5. Repository name : `coutois-automobile`
6. Visibilité : **Public**
7. Ne coche rien d'autre
8. Clique "Create repository"

### Pousser les fichiers du site

Sur ton Mac, ouvre le Terminal :

```bash
cd ~/Desktop/garage-site
git init
git add .
git commit -m "Premier déploiement Coutois Automobile"
git branch -M main
git remote add origin https://github.com/TON-USERNAME/coutois-automobile.git
git push -u origin main
```

Alternative plus simple : installe GitHub Desktop (https://desktop.github.com), clique "Add existing repository", pointe vers le dossier garage-site, puis "Publish repository".

---

## ÉTAPE 2 : Déployer sur Netlify (5 min)

1. Va sur https://app.netlify.com
2. Clique "Sign up" puis **Sign up with GitHub**
3. Autorise Netlify à accéder à ton GitHub

### Importer le site

4. Clique "Add new site" puis "Import an existing project"
5. Choisis "GitHub"
6. Sélectionne le repo `coutois-automobile`
7. Build command : `bash build.sh`
8. Publish directory : `.`
9. Clique "Deploy site"
10. Attends ~30 secondes. Le site est en ligne sur `https://random-name.netlify.app`

**Teste que ça marche** en cliquant sur l'URL.

---

## ÉTAPE 3 : Activer le CMS pour la gestion des véhicules (5 min)

### Activer Identity (authentification)

1. Dans le dashboard Netlify de ton site
2. Va dans **Integrations** (menu du haut)
3. Cherche "Identity" et clique "Enable"
4. Dans Identity puis Settings :
   - **Registration** : choisis "Invite only"
   - Scroll vers le bas : **Services**, puis **Git Gateway**, puis clique "Enable Git Gateway"

### Inviter la compagne

5. Va dans **Identity** puis **Invite users**
6. Entre son email
7. Elle reçoit un email d'invitation et crée son mot de passe

### Tester le CMS

8. Va sur `https://ton-site.netlify.app/admin/`
9. Connecte-toi
10. Tu vois "Véhicules". Clique "Nouveau Véhicule", remplis les champs, "Publier"
11. Attends ~30s, vérifie que le véhicule apparaît sur le site public

---

## ÉTAPE 4 : Acheter le domaine + configurer l'email (15 min)

### Acheter coutois-automobile.fr chez OVH

1. Va sur https://www.ovhcloud.com/fr/domains/
2. Cherche `coutois-automobile.fr`
3. Ajoute au panier et commande (~7 €/an)
4. Crée un compte OVH si nécessaire
5. Paye

### Pointer le domaine vers Netlify

6. Dans Netlify : **Domain management** puis **Add a custom domain**
7. Entre : `coutois-automobile.fr`
8. Netlify affiche les DNS à configurer
9. Dans OVH : **Domaines** puis `coutois-automobile.fr` puis **Zone DNS** :

   Supprime les enregistrements A et CNAME existants (sauf MX), puis ajoute :
   ```
   Type    Nom     Valeur
   A       @       75.2.60.5
   CNAME   www     ton-site.netlify.app.
   ```
   (Netlify te donne l'IP exacte dans son dashboard)

10. **IMPORTANT** : ne touche PAS aux enregistrements MX (email), ils doivent rester ceux d'OVH
11. Attends la propagation DNS (quelques minutes à quelques heures)
12. Retourne dans Netlify : il génère automatiquement le certificat SSL (HTTPS)

### Créer l'adresse email contact@coutois-automobile.fr

OVH inclut gratuitement un service email (MX Plan) avec chaque domaine.

13. Dans OVH : **Emails** puis `coutois-automobile.fr`
14. Crée l'adresse : `contact@coutois-automobile.fr`
15. Choisis un mot de passe
16. Option 1 (simple) : configure une **redirection** vers le Gmail perso de Semih pour qu'il reçoive tout dessus
17. Option 2 (pro) : utilise le webmail OVH (https://www.ovhcloud.com/fr/mail/) pour consulter directement la boîte

---

## ÉTAPE 5 : Connecter les formulaires du site à l'email (10 min)

Les deux formulaires du site (demande de devis mécanique + intérêt achat véhicule) utilisent Netlify Forms.

### Activer Netlify Forms

Netlify détecte automatiquement les formulaires HTML qui contiennent l'attribut `data-netlify="true"`. Les modifications sont déjà faites dans les fichiers livrés.

### Configurer la notification email

1. Dans Netlify Dashboard : **Forms**
2. Tu devrais voir les formulaires détectés après un premier test
3. Clique **Form notifications** puis "Add notification" puis "Email notification"
4. Email de destination : `contact@coutois-automobile.fr`
5. Sélectionne les formulaires concernés
6. Chaque soumission arrive directement par email

### Les deux formulaires sont distincts

- **"devis-mecanique"** : la demande de devis mécanique (depuis rdv.html et les pages services)
  L'email contient : nom, téléphone, email, véhicule du client, description du problème

- **"interet-vehicule"** : l'intérêt pour un véhicule en vente (depuis vehicule.html)
  L'email contient : nom, téléphone, email, référence du véhicule, message

Semih saura immédiatement si c'est une demande mécanique ou un prospect acheteur.

---

## ÉTAPE 6 : Vérification finale

### Checklist

- [ ] Le site s'affiche sur coutois-automobile.fr
- [ ] Le HTTPS fonctionne (cadenas)
- [ ] coutois-automobile.fr/admin/ fonctionne
- [ ] La compagne peut se connecter au CMS
- [ ] Elle peut ajouter un véhicule avec photos
- [ ] Le véhicule apparaît sur le site après ~30 secondes
- [ ] Le formulaire devis envoie un email à contact@coutois-automobile.fr
- [ ] Le formulaire "intéressé" envoie un email aussi
- [ ] Le bouton WhatsApp fonctionne
- [ ] Les liens réseaux sociaux pointent vers les bons profils
- [ ] La carte Google Maps s'affiche sur la page contact

---

## Résumé pour la compagne (à imprimer)

### Ajouter un véhicule
1. Aller sur coutois-automobile.fr/admin/
2. Se connecter (email + mot de passe)
3. Cliquer "Véhicules" puis "Nouveau Véhicule"
4. Remplir les infos + ajouter les photos
5. Cliquer "Publier"
6. Le véhicule apparaît sur le site en ~30 secondes

### Marquer un véhicule vendu
1. Ouvrir le véhicule dans l'admin
2. Changer "Statut" en "Vendu"
3. Mettre la date de vente
4. Cliquer "Publier"
5. Le bandeau VENDU apparaît, le véhicule passe en fin de liste
6. Après 7 jours il disparaît automatiquement

### Supprimer un véhicule
1. Ouvrir le véhicule dans l'admin
2. Cliquer "Supprimer" en haut de la page
3. Confirmer
