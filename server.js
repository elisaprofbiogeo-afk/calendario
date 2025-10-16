require('dotenv').config();
// Backend minimal Node.js/Express pour Railway
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { Pool } = require('pg');

const app = express();
// DELETE: supprimer une réservation
app.delete('/api/reserve', async (req, res) => {
  const body = req.body || {};
  const { date, time_slot } = body;
  if (!date || !time_slot) return res.status(400).end();
  try {
    await pool.query('DELETE FROM reservations WHERE date = $1 AND time_slot = $2', [date, time_slot]);
    res.status(200).end();
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});
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
  // Recibe year y week por query
  const { year, week } = req.query;
  if (!year || !week) return res.status(400).json([]);
  // Calcular el lunes de la semana
  function getMondayOfISOWeek(week, year) {
  // Lógica ISO 8601 robusta: obtener el lunes de la semana ISO
  // 4 de enero siempre está en la semana 1 ISO
  const simple = new Date(year, 0, 4 + (week - 1) * 7);
  const dayOfWeek = simple.getDay(); // 0=domingo, 1=lunes, ...
  const diff = (dayOfWeek + 6) % 7; // días desde lunes
  const monday = new Date(simple);
  monday.setDate(simple.getDate() - diff);
  monday.setHours(0,0,0,0);
  return monday;
  }
  const monday = getMondayOfISOWeek(Number(week), Number(year));
  console.log('DEBUG PATCHED getMondayOfISOWeek logic in use');
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  // Only keep the final debug log for patch verification
  try {
    const result = await pool.query(
      'SELECT date, time_slot, name FROM reservations WHERE date >= $1 AND date <= $2',
      [monday.toISOString().slice(0,10), sunday.toISOString().slice(0,10)]
    );
    // Forzar que la fecha se devuelva como string yyyy-mm-dd
    const rows = result.rows.map(r => ({
      ...r,
      date: r.date instanceof Date ? r.date.toISOString().slice(0,10) : r.date
    }));
    console.log('reservations returned:', rows.map(r => r.date + ' ' + r.time_slot + ' ' + r.name));
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json([]);
  }
});

// POST: réserver une date ou supprimer si _method=DELETE
app.post('/api/reserve', async (req, res) => {
  const { name, date, time_slot, _method } = req.body || {};
  if (_method === 'DELETE') {
    if (!date || !time_slot) return res.status(400).end();
    try {
      await pool.query('DELETE FROM reservations WHERE date = $1 AND time_slot = $2', [date, time_slot]);
      return res.status(200).end();
    } catch (err) {
      console.error(err);
      return res.status(500).end();
    }
  }
  if (!name || !date || !time_slot) return res.status(400).end();
  try {
    // Vérifie si la date est déjà réservée
    const check = await pool.query('SELECT * FROM reservations WHERE date = $1 AND time_slot = $2', [date, time_slot]);
    if (check.rows.length > 0) {
      // Si ya existe, actualiza el texto
      await pool.query('UPDATE reservations SET name = $1 WHERE date = $2::date AND time_slot = $3', [name, date, time_slot]);
      return res.status(200).end();
    }
    await pool.query('INSERT INTO reservations (name, date, time_slot) VALUES ($1, $2::date, $3)', [name, date, time_slot]);
    res.status(201).end();
  } catch (err) {
    console.error(err);
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
    console.error(err);
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
    console.error(err);
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
    console.error(err);
    res.status(500).end();
  }
});
