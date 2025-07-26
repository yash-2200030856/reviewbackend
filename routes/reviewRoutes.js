const express = require('express');
const router = express.Router();
const db = require('../db');
const reviewModel = require('../models/reviewModel');

router.post('/reviews', (req, res) => {
  const review = req.body;

  const checkQuery = `SELECT * FROM reviews WHERE user_id = ? AND product_id = ?`;
  db.query(checkQuery, [review.user_id, review.product_id], (err, results) => {
    if (err) return res.status(500).json(err);
    if (results.length > 0) {
      return res.status(400).json({ error: 'You already reviewed this product.' });
    }

    reviewModel.addReview(review, (err, result) => {
      if (err) return res.status(500).json(err);
      res.status(201).json({ message: 'Review submitted.' });
    });
  });
});

router.get('/products/:id/reviews', (req, res) => {
  const productId = req.params.id;
  reviewModel.getProductReviews(productId, (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

module.exports = router;
