const express = require("express");
const app = express();
const cors = require("cors");
const mysql = require("mysql2");
require("dotenv").config();

app.use(cors());
app.use(express.json());
const path = require("path");

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) throw err;
  console.log("SQL Connected");
});
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const JWT_SECRET = "your_jwt_secret";

app.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  db.query(
    "INSERT INTO users (name, email, password) VALUES (?, ?, ?)",
    [name, email, hashedPassword],
    (err, result) => {
      if (err) return res.status(500).send("Error creating user");
      res.send("User registered successfully");
    }
  );
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;
  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, users) => {
    if (err || users.length === 0) return res.status(401).send("Invalid credentials");

    const valid = await bcrypt.compare(password, users[0].password);
    if (!valid) return res.status(401).send("Invalid credentials");

    const token = jwt.sign({ id: users[0].id, name: users[0].name }, JWT_SECRET, { expiresIn: "1h" });
    res.json({ token, user: { id: users[0].id, name: users[0].name } });
  });
});


app.get("/reviews/:product_id", (req, res) => {
  const { product_id } = req.params;
  db.query(
    "SELECT * FROM reviews WHERE product_id = ?",
    [product_id],
    (err, result) => {
      if (err) return res.status(500).send("Error fetching reviews");
      res.json(result);
    }
  );
});

app.post("/rating", (req, res) => {
  const { user_id, product_id, rating } = req.body;
  db.query(
    "INSERT INTO ratings (user_id, product_id, rating) VALUES (?, ?, ?)",
    [user_id, product_id, rating],
    (err, result) => {
      if (err) return res.status(500).send("Error adding rating");
      res.send("Rating added successfully");
    }
  );
});

app.post("/review", (req, res) => {
  const { user_id, product_id, review } = req.body;

  if (!user_id || !product_id || !review) {
    return res.status(400).send("Missing required fields");
  }

  db.query(
    "INSERT INTO reviews (user_id, product_id, review) VALUES (?, ?, ?)",
    [user_id, product_id, review],
    (err, result) => {
      if (err) {
        console.error("Error inserting review:", err);
        return res.status(500).send("Error adding review");
      }
      res.send("Review added successfully");
    }
  );
});

app.get("/products", (req, res) => {
  db.query("SELECT * FROM products", (err, result) => {
    if (err) {
      console.error("Error fetching products:", err);
      res.status(500).send("Error fetching products");
    } else {
      res.json(result);
    }
  });
});

app.post("/check-review", (req, res) => {
  const { user_id, product_id } = req.body;
  db.query(
    "SELECT * FROM reviews WHERE user_id = ? AND product_id = ?",
    [user_id, product_id],
    (err, rows) => {
      if (err) {
        console.error("/check-review error:", err);
        return res.status(500).send("Internal server error");
      }
      res.json({ exists: rows.length > 0 });
    }
  );
});

const ADMIN_EMAIL = "admin@admin.com";
const ADMIN_PASSWORD = "admin123";

app.post("/admin/login", (req, res) => {
  const { email, password } = req.body;
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const token = jwt.sign({ admin: true }, JWT_SECRET, { expiresIn: "2h" });
    return res.json({ token, admin: true });
  }
  res.status(401).send("Invalid admin credentials");
});

function requireAdmin(req, res, next) {
  const auth = req.headers.authorization;
  if (!auth) return res.status(401).send("No token");
  const token = auth.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.admin) return next();
    return res.status(403).send("Forbidden");
  } catch {
    return res.status(401).send("Invalid token");
  }
}

app.get("/admin/users", requireAdmin, (req, res) => {
  db.query("SELECT id, name, email FROM users", (err, users) => {
    if (err) return res.status(500).send("Error fetching users");
    res.json(users);
  });
});

app.get("/admin/reviews", requireAdmin, (req, res) => {
  const q = `SELECT r.id, r.user_id, u.name as user_name, r.product_id, p.name as product_name, r.review FROM reviews r JOIN users u ON r.user_id = u.id JOIN products p ON r.product_id = p.id`;
  db.query(q, (err, reviews) => {
    if (err) return res.status(500).send("Error fetching reviews");
    res.json(reviews);
  });
});

app.delete("/admin/users/:id", requireAdmin, (req, res) => {
  const userId = req.params.id;
  db.query("DELETE FROM reviews WHERE user_id = ?", [userId], err => {
    if (err) return res.status(500).send("Error deleting user reviews");
    db.query("DELETE FROM ratings WHERE user_id = ?", [userId], err2 => {
      if (err2) return res.status(500).send("Error deleting user ratings");
      db.query("DELETE FROM users WHERE id = ?", [userId], err3 => {
        if (err3) return res.status(500).send("Error deleting user");
        res.send("User deleted");
      });
    });
  });
});

app.get("/admin", (req, res) => {
  res.sendFile(path.join(__dirname, "frontend", "admin.html"));
});

app.use(express.static(path.join(__dirname, "frontend")));

app.listen(process.env.PORT, () => {
  console.log(`Server running on http://localhost:${process.env.PORT}`);
});
