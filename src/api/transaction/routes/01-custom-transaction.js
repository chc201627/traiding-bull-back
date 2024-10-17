module.exports = {
  routes: [
    {
      method: "GET",
      path: "/transaction/allTransactionsByUser",
      handler: "transaction.allTransactionsByUser",
    },
    {
      method: "GET",
      path: "/transaction/allTransactionsPayedAndWithdrawal",
      handler: "transaction.allTransactionsPayedAndWithdrawal",
    },
  ],
};
