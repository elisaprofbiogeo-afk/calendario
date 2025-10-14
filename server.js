// Backend minimal Node.js/Express pour Railway
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
const port = process.env.PORT || 3000;

// Remplacez par vos variables Railway
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.PGSSLMODE ? { rejectUnauthorized: false } : false
});

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// GET: toutes les dates réservées du mois courant
app.get('/api/reservations', async (req, res) => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const start = `${year}-${month}-01`;
  const end = `${year}-${month}-31`;
  try {
    const result = await pool.query(
      'SELECT date FROM reservations WHERE date >= $1 AND date <= $2',
      [start, end]
    );
    res.json(result.rows.map(r => r.date.toISOString().slice(0, 10)));
  } catch (err) {
    res.status(500).json([]);
  }
});

// POST: réserver une date
app.post('/api/reserve', async (req, res) => {
  const { name, date } = req.body;
  if (!name || !date) return res.status(400).end();
  try {
    // Vérifie si la date est déjà réservée
    const check = await pool.query('SELECT * FROM reservations WHERE date = $1', [date]);
    if (check.rows.length > 0) return res.status(409).end();
    await pool.query('INSERT INTO reservations (name, date) VALUES ($1, $2)', [name, date]);
    res.status(201).end();
  } catch (err) {
    res.status(500).end();
  }
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
});

// SQL à exécuter sur Railway :
// CREATE TABLE reservations (id SERIAL PRIMARY KEY, name TEXT, date DATE UNIQUE);
// CREATE TABLE fixed_slots (id SERIAL PRIMARY KEY, day_of_week INTEGER, time_slot TEXT, subject TEXT);
// day_of_week: 0=Lunes, 1=Martes, 2=Miércoles, 3=Jueves, 4=Viernes
// time_slot: '8h25-9h20', '9h20-10h15', etc.

// GET: récupérer tous les créneaux fixes
app.get('/api/fixed-slots', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM fixed_slots ORDER BY day_of_week, time_slot');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json([]);
  }
});

// POST: définir un créneau fixe
app.post('/api/fixed-slots', async (req, res) => {
  const { day_of_week, time_slot, subject } = req.body;
  if (day_of_week === undefined || !time_slot) return res.status(400).end();
  try {
    // Vérifier si le créneau existe déjà
    const check = await pool.query(
      'SELECT * FROM fixed_slots WHERE day_of_week = $1 AND time_slot = $2',
      [day_of_week, time_slot]
    );
    if (check.rows.length > 0) {
      // Mettre à jour
      await pool.query(
        'UPDATE fixed_slots SET subject = $1 WHERE day_of_week = $2 AND time_slot = $3',
        [subject, day_of_week, time_slot]
      );
    } else {
      // Insérer
      await pool.query(
        'INSERT INTO fixed_slots (day_of_week, time_slot, subject) VALUES ($1, $2, $3)',
        [day_of_week, time_slot, subject]
      );
    }
    res.status(201).end();
  } catch (err) {
    res.status(500).end();
  }
});

// DELETE: supprimer un créneau fixe
app.delete('/api/fixed-slots', async (req, res) => {
  const { day_of_week, time_slot } = req.body;
  if (day_of_week === undefined || !time_slot) return res.status(400).end();
  try {
    await pool.query(
      'DELETE FROM fixed_slots WHERE day_of_week = $1 AND time_slot = $2',
      [day_of_week, time_slot]
    );
    res.status(200).end();
  } catch (err) {
    res.status(500).end();
  }
});
