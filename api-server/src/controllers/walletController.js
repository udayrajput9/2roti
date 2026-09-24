const db = require('../config/database');

// 1. Get Customer Wallet Details & Ledger
async function getWalletDetails(req, res) {
  try {
    const userId = req.user.id;
    const user = await db('users').where({ id: userId }).first();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User account not found.' });
    }

    // Dynamic settings from DB
    const settingsRows = await db('system_settings').whereIn('key', ['cashback_per_order', 'min_wallet_redemption']);
    let cashbackPerOrder = 3.00;
    let minRedemption = 50.00;

    settingsRows.forEach(r => {
      if (r.key === 'cashback_per_order') cashbackPerOrder = parseFloat(r.value) || 3.00;
      if (r.key === 'min_wallet_redemption') minRedemption = parseFloat(r.value) || 50.00;
    });

    const currentBal = parseFloat(user.wallet_balance || 0);

    const transactions = await db('wallet_transactions')
      .where({ user_id: userId })
      .orderBy('created_at', 'desc')
      .limit(50);

    return res.json({
      success: true,
      wallet_balance: currentBal,
      is_eligible_for_redemption: currentBal >= minRedemption,
      rules: {
        cashback_per_order: cashbackPerOrder,
        min_redemption_amount: minRedemption,
        redemption_description: `Redeem full order when balance >= ₹${minRedemption.toFixed(0)} and balance >= order total.`
      },
      transactions
    });
  } catch (err) {
    console.error('getWalletDetails error:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch wallet info.' });
  }
}

module.exports = {
  getWalletDetails
};
