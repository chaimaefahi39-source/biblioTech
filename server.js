import express from 'express';
import pg from 'pg';

const app = express();
app.use(express.json()); 


const pool = new pg.Pool({
  host:     process.env.DB_HOST     || 'localhost',
  port:     process.env.DB_PORT     || 5433,
  database: process.env.DB_NAME     || 'biblio',
  user:     process.env.DB_USER     || 'admin',
  password: process.env.DB_PASSWORD || '1234',
});


pool.query('SELECT NOW()')
  .then(() => console.log('🛡️ Database handshake successful.'))
  .catch(err => console.error('❌ Database connection failed:', err.message));


  app.get('/', (req, res) => {
  res.status(200).json({
    service: 'BiblioTech Catalog Engine',
    status: 'online',
    version: '1.1.0',
    endpoints: ['POST /livres', 'GET /livres (supports ?disponible= & ?categorie=)', 'GET /livres/stats', 'GET /livres/:id', 'PUT /livres/:id', 'DELETE /livres/:id']
  });
});


app.get('/livres/stats', async (req, res) => {
  try {
    const statsQuery = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE disponible = true) as dispo,
        COUNT(*) FILTER (WHERE disponible = false) as emprunte
      FROM livres
    `;
    const result = await pool.query(statsQuery);
    const { total, dispo, emprunte } = result.rows[0];

    const totalNum = parseInt(total);
    const dispoNum = parseInt(dispo);

    res.status(200).json({
      total: totalNum,
      disponible: dispoNum,
      emprunte: parseInt(emprunte),
      pourcentage_disponible: totalNum > 0 ? ((dispoNum / totalNum) * 100).toFixed(2) + '%' : '0%'
    });
  } catch (err) {
    console.error('Erreur GET /livres/stats:', err);
    res.status(500).json({ error: 'Erreur statistiques', details: err.message });
  }
});


app.post('/livres', async (req, res) => {
  try {
   
    const { titre, auteur, categorie, annee, disponible } = req.body || {};

    if (!titre || !auteur || !categorie || !annee) {
      return res.status(400).json({ error: 'Les champs titre, auteur, categorie et annee sont obligatoires.' });
    }

    if (isNaN(annee) || annee < 0 || annee > new Date().getFullYear()) {
      return res.status(400).json({ error: "L'année doit être un nombre valide." });
    }

    const query = `
      INSERT INTO livres (titre, auteur, categorie, annee, disponible)
      VALUES ($1, $2, $3, $4, $5) RETURNING *
    `;
    const result = await pool.query(query, [titre, auteur, categorie, annee, disponible ?? true]);
    
    res.status(201).json({ message: 'Livre ajouté avec succès ✅', livre: result.rows[0] });
  } catch (err) {
    console.error('Erreur POST /livres:', err);
    res.status(500).json({ error: "Erreur serveur lors de l'ajout", details: err.message });
  }
});


app.get('/livres', async (req, res) => {
  try {
    const { disponible, categorie } = req.query;
    let sqlQuery = 'SELECT * FROM livres WHERE 1=1';
    const params = [];

    if (disponible !== undefined) {
      params.push(disponible === 'true');
      sqlQuery += ` AND disponible = $${params.length}`;
    }

    if (categorie) {
      params.push(categorie);
      sqlQuery += ` AND LOWER(categorie) = LOWER($${params.length})`;
    }

    sqlQuery += ' ORDER BY id ASC';
    
    const result = await pool.query(sqlQuery, params);
    res.status(200).json({ total: result.rowCount, livres: result.rows });
  } catch (err) {
    console.error('Erreur GET /livres:', err);
    res.status(500).json({ error: 'Erreur serveur de récupération', details: err.message });
  }
});


app.get('/livres/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: "L'ID doit être un nombre numérique." });

    const result = await pool.query('SELECT * FROM livres WHERE id = $1', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Aucun livre trouvé avec cet ID.' });

    res.status(200).json({ livre: result.rows[0] });
  } catch (err) {
    console.error('Erreur GET /livres/:id:', err);
    res.status(500).json({ error: 'Erreur de lecture du livre', details: err.message });
  }
});


app.put('/livres/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: "L'ID doit être un nombre." });

    const fields = req.body || {};
    const check = await pool.query('SELECT * FROM livres WHERE id = $1', [id]);
    if (check.rowCount === 0) return res.status(404).json({ error: 'Livre introuvable.' });

    const ancien = check.rows[0];
    const updateQuery = `
      UPDATE livres
      SET titre = $1, auteur = $2, categorie = $3, annee = $4, disponible = $5
      WHERE id = $6 RETURNING *
    `;
    const values = [
      fields.titre ?? ancien.titre,
      fields.auteur ?? ancien.auteur,
      fields.categorie ?? ancien.categorie,
      fields.annee ?? ancien.annee,
      fields.disponible ?? ancien.disponible,
      id
    ];

    const result = await pool.query(updateQuery, values);
    res.status(200).json({ message: 'Livre mis à jour avec succès ✅', livre: result.rows[0] });
  } catch (err) {
    console.error('Erreur PUT /livres/:id:', err);
    res.status(500).json({ error: 'Erreur de mise à jour', details: err.message });
  }
});


app.delete('/livres/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (isNaN(id)) return res.status(400).json({ error: "L'ID doit être numérique." });

    const result = await pool.query('DELETE FROM livres WHERE id = $1 RETURNING *', [id]);
    if (result.rowCount === 0) return res.status(404).json({ error: 'Livre introuvable.' });

    res.status(200).json({ message: `Livre "${result.rows[0].titre}" supprimé avec succès 🗑️` });
  } catch (err) {
    console.error('Erreur DELETE /livres/:id:', err);
    res.status(500).json({ error: 'Erreur de suppression', details: err.message });
  }
});


app.use((req, res) => {
  res.status(404).json({ error: 'Route inexistante.', methode: req.method, path: req.path });
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`📡 Service listening on execution port: http://localhost:${PORT}`);
});

export default app;