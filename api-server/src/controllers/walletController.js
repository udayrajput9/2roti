const db = require('../config/database');

// 1. Get Customer Wallet Details & Ledger
async function getWalletDetails(req, res) {
  try {
    const userId = req.user.id;
    const user = await db('users').where({ id: userId }).first();

    const transactions = await db('wallet_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(50);

    return res.json({
      success: true,
      wallet_balance: parseFloat(user.wallet_balance || 0),
      is_eligible_for_redemption: parseFloat(user.wallet_balance || 0) >= 50.00,
      rules: {
        cashback_per_order: 3.00,
        min_redemption_amount: 50.00,
        redemption_description: 'Redeem full order when balance >= ₹50 and balance >= order total.'
      },
      transactions
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch wallet info.' });
  }
}

module.exports = {
  getWalletDetails
};
