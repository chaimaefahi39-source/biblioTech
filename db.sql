-- ============================================
--  BiblioTech API — db.sql
--  PostgreSQL Database Schema & Sample Data
-- ============================================

-- ──────────────────────────────────────────
--  1. CREATE TABLE livres
-- ──────────────────────────────────────────

CREATE TABLE livres (
  id SERIAL PRIMARY KEY,
  titre VARCHAR(255) NOT NULL,
  auteur VARCHAR(255) NOT NULL,
  categorie VARCHAR(100) NOT NULL,
  annee INTEGER NOT NULL,
  disponible BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ──────────────────────────────────────────
--  2. SAMPLE DATA — for testing
-- ──────────────────────────────────────────

INSERT INTO livres (titre, auteur, categorie, annee, disponible) VALUES
('L''Alchimiste', 'Paulo Coelho', 'Romans', 1988, true),
('1984', 'George Orwell', 'Romans', 1949, true),
('Sapiens', 'Yuval Noah Harari', 'Sciences', 2011, true),
('Le Seigneur des Anneaux', 'J.R.R. Tolkien', 'Fantaisie', 1954, false),
('Harry Potter à l''école des sorciers', 'J.K. Rowling', 'Jeunesse', 1997, true),
('Vingt Mille Lieues sous les mers', 'Jules Verne', 'Aventure', 1870, true),
('Le Petit Prince', 'Antoine de Saint-Exupéry', 'Jeunesse', 1943, true),
('Fondation', 'Isaac Asimov', 'Sciences', 1951, true),
('Les Trois Mousquetaires', 'Alexandre Dumas', 'Romans', 1844, true),
('Une brève histoire du temps', 'Stephen Hawking', 'Sciences', 1988, false);

-- ──────────────────────────────────────────
--  3. Verify insertion
-- ──────────────────────────────────────────

SELECT COUNT(*) as total_livres FROM livres;
SELECT * FROM livres ORDER BY id ASC;