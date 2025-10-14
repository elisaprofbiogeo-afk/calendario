# Sistema de Horarios

## Configuración de la base de datos

Ejecutar estos comandos SQL en Railway:

```sql
-- Table pour les réservations (existante)
CREATE TABLE IF NOT EXISTS reservations (
    id SERIAL PRIMARY KEY, 
    name TEXT, 
    date DATE UNIQUE
);

-- Nouvelle table pour les créneaux fixes
CREATE TABLE IF NOT EXISTS fixed_slots (
    id SERIAL PRIMARY KEY,
    day_of_week INTEGER NOT NULL,
    time_slot TEXT NOT NULL,
    subject TEXT,
    UNIQUE(day_of_week, time_slot)
);
```

## Description

- **day_of_week**: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes
- **time_slot**: Format "8h25-9h20", "9h20-10h15", etc.
- **subject**: Nom de la matière ou du cours

## Pages

### index.html
- Affiche l'emploi du temps avec navigation par semaine
- Les créneaux fixes sont grisés et non modifiables
- Accessible à tous les utilisateurs

### admin.html
- Permet de définir les créneaux fixes (identiques chaque semaine)
- Clic sur une case pour éditer
- Les changements s'appliquent immédiatement à toutes les semaines

## Démarrage

```bash
npm install
node server.js
```

Puis ouvrir http://localhost:3000/index.html
