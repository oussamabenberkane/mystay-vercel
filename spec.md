# Cahier des charges technique – Application **My Stay (v2 – SaaS simplifiée)**

---

## 1. Objectif du projet

Développer une application web (PWA) nommée **My Stay**, permettant de digitaliser et centraliser l’expérience client dans les hôtels.

L’application doit permettre :

* Gestion du séjour client
* Commande de services (room service)
* Communication client ↔ hôtel
* Suivi des dépenses
* Interface de gestion pour le personnel hôtelier

---

## 2. Architecture technique

### 2.1 Stack technique retenue

* **Frontend** : Next.js (App Router)
* **Backend** : Supabase (Auth, Database, Realtime, Storage)
* **API** : PostgREST (auto-générée via PostgreSQL)
* **Base de données** : PostgreSQL
* **Déploiement** : Vercel
* **Temps réel** : Supabase Realtime

👉 Aucun backend custom (Node.js/Django) n’est utilisé.

---

### 2.2 Architecture générale

* Application web responsive (desktop + mobile)
* Une seule application avec authentification centralisée
* Accès conditionné par **rôle utilisateur**
* Architecture multi-tenant (plusieurs hôtels)

---

## 3. Gestion des utilisateurs

### 3.1 Authentification

Fonctionnalités :

* Inscription (email + mot de passe)
* Connexion sécurisée
* Réinitialisation mot de passe
* Vérification email (via Supabase)

---

### 3.2 Rôles utilisateurs

Le système doit gérer 3 rôles :

* **Client**
* **Employé (staff)**
* **Administrateur**

Après connexion, l’utilisateur est redirigé vers son interface dédiée.

---

### 3.3 Profil utilisateur

Champs obligatoires :

* Nom
* Prénom
* Email
* Téléphone
* Langue

Champs optionnels :

* Préférences
* Historique des séjours

---

## 4. Multi-tenancy (gestion des hôtels)

Le système doit supporter plusieurs hôtels.

Chaque donnée est liée à un hôtel :

* Utilisateurs
* Chambres
* Commandes
* Demandes

👉 Isolation des données via `hotel_id` + Row Level Security (RLS)

---

## 5. Gestion du séjour

### 5.1 Données de séjour

* Affichage des informations :

  * Date d’arrivée / départ
  * Numéro de chambre
  * Type de chambre

⚠️ Pour MVP :

* Données simulées ou saisies manuellement
* Intégration PMS prévue en phase future

---

## 6. Gestion des services (CORE)

### 6.1 Room Service

#### Interface client

* Menu digital :

  * Catégories (boissons, plats, desserts)
* Ajout au panier
* Validation de commande

#### Backend (Supabase)

* Enregistrement des commandes
* Gestion des statuts :

  * en attente
  * en préparation
  * en livraison
  * livré

#### Interface staff

* Réception des commandes en temps réel
* Mise à jour des statuts

---

### 6.2 Demandes de services internes

Types :

* Nettoyage chambre
* Changement serviettes
* Maintenance

Fonctionnalités :

* Création de demande
* Ajout commentaire
* Choix de priorité (normal / urgent)

Suivi :

* envoyé
* en cours
* terminé

---

## 7. Système de communication

### 7.1 Chat en temps réel

Fonctionnalités :

* Messagerie client ↔ staff
* Historique des messages
* Mise à jour en temps réel (Supabase Realtime)

Option (phase future) :

* Chatbot automatique

---

## 8. Gestion des dépenses

### 8.1 Suivi

* Liste des services consommés
* Détail des dépenses
* Total en temps réel

### 8.2 Facturation

* Génération de facture (PDF)
* Téléchargement

---

## 9. Notifications

### 9.1 Notifications in-app

* Confirmation de commande
* Mise à jour de statut
* Messages chat

### 9.2 Notifications push (optionnel)

* Intégration ultérieure (OneSignal / autre)

---

## 10. Feedback client

* Note (1 à 5)
* Commentaire

Stockage en base de données
Consultation via dashboard admin

---

## 11. Dashboard hôtel

### 11.1 Modules

#### Gestion clients

* Liste
* Détails
* Historique

#### Gestion commandes

* Liste temps réel
* Mise à jour statuts

#### Gestion demandes

* Filtrage (type, statut)

#### Gestion menu

* CRUD catégories
* CRUD produits

#### Statistiques (MVP simplifié)

* Nombre de commandes
* Nombre de demandes

---

## 12. Sécurité

Obligatoire :

* HTTPS (Vercel)
* Authentification sécurisée (Supabase Auth)
* Row Level Security (RLS)
* Isolation par hôtel
* Protection des accès par rôle

---

## 13. Multilingue

Langues :

* Français
* Anglais
* Arabe

---

## 14. Performance

Objectifs :

* Temps de réponse rapide (< 2s côté API)
* Application fluide
* Support initial : ~1000 utilisateurs simultanés

---

## 15. Tests

À prévoir :

* Tests fonctionnels
* Tests utilisateurs

(MVP : tests manuels acceptés)

---

## 16. Déploiement

* Hébergement : Vercel (frontend)
* Backend : Supabase
* Environnements :

  * Développement
  * Production

---

## 17. Fonctionnalités exclues du MVP

Pour simplification :

* Application mobile native (remplacée par PWA)
* Intégration PMS réelle
* Paiements en ligne
* Système de fidélité
* Notifications push avancées

---

## 18. Roadmap (phases)

### Phase 1 (Fondation)

* Authentification
* Rôles
* Base de données
* Multi-tenant

### Phase 2 (Core)

* Room service
* Dashboard staff

### Phase 3

* Demandes internes
* Chat

### Phase 4

* Dépenses
* Feedback

---

## 19. Contraintes techniques

* Utilisation stricte de Supabase (pas de backend custom)
* Respect des règles RLS
* Architecture scalable
* Code maintenable (Next.js structuré)

---

**Fin du document**
