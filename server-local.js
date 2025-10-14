// Backend minimal Node.js/Express - Version locale avec stockage JSON
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('.'));

// Fichiers de stockage local
const RESERVATIONS_FILE = path.join(__dirname, 'reservations.json');
const FIXED_SLOTS_FILE = path.join(__dirname, 'fixed_slots.json');

// Initialiser les fichiers s'ils n'existent pas
if (!fs.existsSync(RESERVATIONS_FILE)) {
  fs.writeFileSync(RESERVATIONS_FILE, '[]');
}
if (!fs.existsSync(FIXED_SLOTS_FILE)) {
  fs.writeFileSync(FIXED_SLOTS_FILE, '[]');
}

// Fonctions helper pour lire/écrire les données
function readReservations() {
  try {
    const data = fs.readFileSync(RESERVATIONS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeReservations(data) {
  fs.writeFileSync(RESERVATIONS_FILE, JSON.stringify(data, null, 2));
}

function readFixedSlots() {
  try {
    const data = fs.readFileSync(FIXED_SLOTS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (err) {
    return [];
  }
}

function writeFixedSlots(data) {
  fs.writeFileSync(FIXED_SLOTS_FILE, JSON.stringify(data, null, 2));
}

// GET: toutes les dates réservées du mois courant

// GET: réservations hebdomadaires pour une semaine donnée
// /api/reservations?year=2025&week=42
app.get('/api/reservations', (req, res) => {
  const { year, week } = req.query;
  try {
    const reservations = readReservations();
    if (year && week) {
      // Filtrer pour la semaine demandée
      const filtered = reservations.filter(r => r.year == year && r.week == week);
      res.json(filtered);
    } else {
      res.json(reservations);
    }
  } catch (err) {
    console.error('Erreur GET /api/reservations:', err);
    res.status(500).json([]);
  }
});

// POST: réserver un créneau pour une semaine donnée
// { year, week, day_of_week, time_slot, text }
app.post('/api/reservations', (req, res) => {
  const { year, week, day_of_week, time_slot, text } = req.body;
  if (year === undefined || week === undefined || day_of_week === undefined || !time_slot) {
    return res.status(400).json({ error: 'Paramètres requis manquants' });
  }
  try {
    let reservations = readReservations();
    // Un seul texte par créneau/semaine
    const idx = reservations.findIndex(r => r.year == year && r.week == week && r.day_of_week == day_of_week && r.time_slot == time_slot);
    if (idx >= 0) {
      reservations[idx].text = text;
    } else {
      reservations.push({ year, week, day_of_week, time_slot, text });
    }
    writeReservations(reservations);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Erreur POST /api/reservations:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE: supprimer une réservation hebdomadaire
// { year, week, day_of_week, time_slot }
app.delete('/api/reservations', (req, res) => {
  const { year, week, day_of_week, time_slot } = req.body;
  if (year === undefined || week === undefined || day_of_week === undefined || !time_slot) {
    return res.status(400).json({ error: 'Paramètres requis manquants' });
  }
  try {
    let reservations = readReservations();
    reservations = reservations.filter(r => !(r.year == year && r.week == week && r.day_of_week == day_of_week && r.time_slot == time_slot));
    writeReservations(reservations);
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur DELETE /api/reservations:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET: récupérer tous les créneaux fixes
app.get('/api/fixed-slots', (req, res) => {
  try {
    const slots = readFixedSlots();
    res.json(slots);
  } catch (err) {
    console.error('Erreur GET /api/fixed-slots:', err);
    res.status(500).json([]);
  }
});

// POST: définir un créneau fixe
app.post('/api/fixed-slots', (req, res) => {
  const { day_of_week, time_slot, subject } = req.body;
  console.log('POST /api/fixed-slots:', req.body);
  
  if (day_of_week === undefined || !time_slot) {
    console.error('Données invalides:', { day_of_week, time_slot, subject });
    return res.status(400).json({ error: 'day_of_week et time_slot requis' });
  }
  
  try {
    let slots = readFixedSlots();
    
    // Chercher si le créneau existe déjà
    const index = slots.findIndex(
      s => s.day_of_week === day_of_week && s.time_slot === time_slot
    );
    
    if (index >= 0) {
      // Mettre à jour
      slots[index].subject = subject;
      console.log('Créneau mis à jour:', slots[index]);
    } else {
      // Insérer
      const newSlot = { 
        id: slots.length + 1,
        day_of_week, 
        time_slot, 
        subject 
      };
      slots.push(newSlot);
      console.log('Nouveau créneau ajouté:', newSlot);
    }
    
    writeFixedSlots(slots);
    res.status(201).json({ success: true });
  } catch (err) {
    console.error('Erreur POST /api/fixed-slots:', err);
    res.status(500).json({ error: err.message });
  }
});

// DELETE: supprimer un créneau fixe
app.delete('/api/fixed-slots', (req, res) => {
  const { day_of_week, time_slot } = req.body;
  console.log('DELETE /api/fixed-slots:', req.body);
  
  if (day_of_week === undefined || !time_slot) {
    return res.status(400).json({ error: 'day_of_week et time_slot requis' });
  }
  
  try {
    let slots = readFixedSlots();
    
    // Filtrer pour supprimer le créneau
    const newSlots = slots.filter(
      s => !(s.day_of_week === day_of_week && s.time_slot === time_slot)
    );
    
    writeFixedSlots(newSlots);
    console.log('Créneau supprimé');
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erreur DELETE /api/fixed-slots:', err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  console.log(`Serveur démarré sur http://localhost:${port}`);
  console.log('Mode local avec stockage JSON');
});
