const db = require('../db');

exports.addReview = (data, callback) => {
  const { user_id, product_id, rating, review_text, photo_url } = data;
  const query = `INSERT INTO reviews (user_id, product_id, rating, review_text, photo_url) VALUES (?, ?, ?, ?, ?)`;
  db.query(query, [user_id, product_id, rating, review_text, photo_url], callback);
};

exports.getProductReviews = (productId, callback) => {
  const query = `
    SELECT r.*, u.name AS user_name FROM reviews r JOIN users u ON r.user_id = u.id WHERE product_id = ?`;
  db.query(query, [productId], callback);
};
