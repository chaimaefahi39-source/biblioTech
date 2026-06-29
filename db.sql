DROP TABLE IF EXISTS livres;

CREATE TABLE livres (
    id SERIAL PRIMARY KEY,
    titre VARCHAR(255) NOT NULL,
    auteur VARCHAR(255) NOT NULL,
    categorie VARCHAR(100) NOT NULL,
    annee INTEGER NOT NULL,
    disponible BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO livres (titre, auteur, categorie, annee, disponible) VALUES
('L''Étranger', 'Albert Camus', 'Romans', 1942, true),
('Clean Code', 'Robert C. Martin', 'Informatique', 2008, true),
('Le Pouvoir du moment présent', 'Eckhart Tolle', 'Spiritualité', 1997, true),
('L''Enfant de sable', 'Tahar Ben Jelloun', 'Romans', 1983, false),
('Fondation', 'Isaac Asimov', 'Science-Fiction', 1951, true),
('Crime et Châtiment', 'Fyodor Dostoevsky', true),
('La Boîte à merveilles', 'Ahmed Sefrioui', true),
('Le Prophète', 'Kahlil Gibran', true),
('Design Patterns', 'Erich Gamma', false),
('Dune', 'Frank Herbert', true);

SELECT COUNT(*) as total_livres FROM livres;
SELECT * FROM livres ORDER BY id ASC;