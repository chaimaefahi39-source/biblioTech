// ============================================
//  BiblioTech API — server.js
//  Backend complet avec Express.js et PostgreSQL
//  5 routes CRUD + 3 bonus
// ============================================

const express = require('express');
const { Pool } = require('pg');
require('dotenv').config();

const app = express();

// ──────────────────────────────────────────
//  MIDDLEWARE
// ──────────────────────────────────────────
app.use(express.json()); // Parse JSON bodies


// ──────────────────────────────────────────
//  CONNEXION À POSTGRESQL
// ──────────────────────────────────────────
const pool = new Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5433,
  database: process.env.DB_NAME     || 'biblio',
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || '1234',
});

// Test de connexion au démarrage
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Erreur connexion PostgreSQL :', err.message);
  } else {
    console.log('✅ Connecté à PostgreSQL');
    release();
  }
});


// ──────────────────────────────────────────
//  ROUTE TEST — Vérifier que l'API fonctionne
// ──────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({ 
    message: 'Bienvenue sur l\'API BiblioTech 📚',
    version: '1.0.0',
    endpoints: [
      'POST /livres',
      'GET /livres',
      'GET /livres/:id',
      'PUT /livres/:id',
      'DELETE /livres/:id',
      'GET /livres/search?categorie=...',
      'GET /livres?disponible=true',
      'GET /stats/total'
    ]
  });
});


// ──────────────────────────────────────────
//  1. POST /livres — CRÉER un livre
// ──────────────────────────────────────────
app.post('/livres', async (req, res) => {
  try {
    const { titre, auteur, categorie, annee, disponible } = req.body;

    // Validation des champs obligatoires
    if (!titre  !auteur  !categorie || !annee) {
      return res.status(400).json({
        erreur: 'Les champs titre, auteur, categorie et annee sont obligatoires.'
      });
    }

    // Validation du type d'annee
    if (isNaN(annee)  annee < 0  annee > new Date().getFullYear()) {
      return res.status(400).json({
        erreur: 'L\'année doit être un nombre valide.'
      });
    }

    // Insertion avec requête paramétrée (protection SQL injection)
    const result = await pool.query(
      `INSERT INTO livres (titre, auteur, categorie, annee, disponible)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [titre, auteur, categorie, annee, disponible ?? true]
    );

    res.status(201).json({
      message: 'Livre ajouté avec succès ✅',
      livre: result.rows[0]
    });

  } catch (err) {
    console.error('Erreur POST /livres:', err);
    res.status(500).json({ 
      erreur: 'Erreur serveur lors de l\'ajout du livre.',
      details: err.message 
    });
  }
});


// ──────────────────────────────────────────
//  2. GET /livres — RÉCUPÉRER tous les livres
// ──────────────────────────────────────────
app.get('/livres', async (req, res) => {
  try {
    // BONUS : filtrer par disponibilité ?disponible=true
    const { disponible } = req.query;

    let query = 'SELECT * FROM livres ORDER BY id ASC';
    let params = [];

    // Si un filtre est fourni, ajouter WHERE clause
    if (disponible !== undefined) {
      const isDisponible = disponible === 'true';
      query = 'SELECT * FROM livres WHERE disponible = $1 ORDER BY id ASC';
      params = [isDisponible];
    }

    const result = await pool.query(query, params);

    res.status(200).json({
      total: result.rowCount,
      livres: result.rows
    });

  } catch (err) {
    console.error('Erreur GET /livres:', err);
    res.status(500).json({ 
      erreur: 'Erreur serveur lors de la récupération des livres.',
      details: err.message 
    });
  }
});


// ──────────────────────────────────────────
//  BONUS : GET /livres/search — Rechercher par catégorie
// ──────────────────────────────────────────
app.get('/livres/search', async (req,res) => {
  try {
    const { categorie } = req.query;

    if (!categorie) {
      return res.status(400).json({ 
        erreur: 'Paramètre "categorie" manquant. Exemple: /livres/search?categorie=Romans' 
      });
    }

    // LOWER() pour recherche insensible à la casse
    const result = await pool.query(
      'SELECT * FROM livres WHERE LOWER(categorie) = LOWER($1) ORDER BY id ASC',
      [categorie]
    );

    res.status(200).json({
      total: result.rowCount,
      categorie: categorie,
      livres: result.rows
    });

  } catch (err) {
    console.error('Erreur GET /livres/search:', err);
    res.status(500).json({ 
      erreur: 'Erreur serveur lors de la recherche.',
      details: err.message 
    });
  }
});


// ──────────────────────────────────────────
//  BONUS : GET /stats/total — Statistiques
// ──────────────────────────────────────────
app.get('/stats/total', async (req, res) => {
  try {
    const total = await pool.query('SELECT COUNT(*) FROM livres');
    const disponible = await pool.query('SELECT COUNT(*) FROM livres WHERE disponible = true');
    const emprunte = await pool.query('SELECT COUNT(*) FROM livres WHERE disponible = false');

    res.status(200).json({
      total: parseInt(total.rows[0].count),
      disponible: parseInt(disponible.rows[0].count),
      emprunte: parseInt(emprunte.rows[0].count),
      pourcentage_disponible: total.rows[0].count > 0 
        ? (parseInt(disponible.rows[0].count) / parseInt(total.rows[0].count) * 100).toFixed(2) + '%'
        : '0%'
    });

  } catch (err) {
    console.error('Erreur GET /stats/total:', err);
    res.status(500).json({ 
      erreur: 'Erreur serveur lors du calcul des statistiques.',
      details: err.message 
    });
  }
});


// ──────────────────────────────────────────
//  3. GET /livres/:id — RÉCUPÉRER un livre par ID
// ──────────────────────────────────────────
app.get('/livres/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validation : ID doit être un nombre
    if (isNaN(id)) {
      return res.status(400).json({ 
        erreur: 'L\'ID doit être un nombre.' 
      });
    }

    const result = await pool.query(
      'SELECT * FROM livres WHERE id = $1',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        erreur: Aucun livre trouvé avec l'ID ${id}. 
      });
    }

    res.status(200).json({ livre: result.rows[0] });

  } catch (err) {
    console.error('Erreur GET /livres/:id:', err);
    res.status(500).json({ 
      erreur: 'Erreur serveur lors de la récupération du livre.',
      details: err.message 
    });
  }
});


// ──────────────────────────────────────────
//  4. PUT /livres/:id — MODIFIER un livre
// ──────────────────────────────────────────
app.put('/livres/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { titre, auteur, categorie, annee, disponible } = req.body;

    // Validation : ID doit être un nombre
    if (isNaN(id)) {
      return res.status(400).json({ 
        erreur: 'L\'ID doit être un nombre.' 
      });
    }

    // Vérifier que le livre existe
    const check = await pool.query('SELECT * FROM livres WHERE id = $1', [id]);
    if (check.rowCount === 0) {
      return res.status(404).json({ 
        erreur: Aucun livre trouvé avec l'ID ${id}. 
      });
    }

    const ancien = check.rows[0];

    // Mettre à jour uniquement les champs fournis (opérateur ??)
    const result = await pool.query(
      `UPDATE livres
       SET titre      = $1,
           auteur     = $2,
           categorie  = $3,
           annee      = $4,
           disponible = $5
       WHERE id = $6
       RETURNING *`,
      [
        titre      ?? ancien.titre,
        auteur     ?? ancien.auteur,
        categorie  ?? ancien.categorie,
        annee      ?? ancien.annee,
        disponible ?? ancien.disponible,
        id
      ]
    );

    res.status(200).json({
      message: 'Livre mis à jour avec succès ✅',
      livre: result.rows[0]
    });

  } catch (err) {
    console.error('Erreur PUT/livres/:id:', err);
    res.status(500).json({ 
      erreur: 'Erreur serveur lors de la mise à jour du livre.',
      details: err.message 
    });
  }
});


// ──────────────────────────────────────────
//  5. DELETE /livres/:id — SUPPRIMER un livre
// ──────────────────────────────────────────
app.delete('/livres/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validation : ID doit être un nombre
    if (isNaN(id)) {
      return res.status(400).json({ 
        erreur: 'L\'ID doit être un nombre.' 
      });
    }

    const result = await pool.query(
      'DELETE FROM livres WHERE id = $1 RETURNING *',
      [id]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ 
        erreur: Aucun livre trouvé avec l'ID ${id}. 
      });
    }

    res.status(200).json({
      message: Livre "${result.rows[0].titre}" supprimé avec succès 🗑️,
      livre: result.rows[0]
    });

  } catch (err) {
    console.error('Erreur DELETE /livres/:id:', err);
    res.status(500).json({ 
      erreur: 'Erreur serveur lors de la suppression du livre.',
      details: err.message 
    });
  }
});


// ──────────────────────────────────────────
//  GESTION DES ERREURS — Route 404
// ──────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ 
    erreur: 'Route non trouvée.',
    methode: req.method,
    path: req.path
  });
});


// ──────────────────────────────────────────
//  DÉMARRAGE DU SERVEUR
// ──────────────────────────────────────────
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════╗
║  🚀 BiblioTech API Démarrée            ║
║  http://localhost:3000/
║                                        ║
║  📚 5 routes CRUD + 3 bonus            ║
║  ✅ PostgreSQL connectée               ║
╚════════════════════════════════════════╝
  `);
});

module.exports = app;