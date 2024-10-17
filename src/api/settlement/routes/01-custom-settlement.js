module.exports = {
  routes: [
    {
      method: "GET",
      path: "/settlement/executesettlement",
      handler: "settlement.executeSettlement",
    },
    {
      method: "GET",
      path: "/settlement/lastpresettlement",
      handler: "settlement.lastPreSettelment",
    },
    {
      method: "GET",
      path: "/settlement/alltransactionpendingpay",
      handler: "settlement.allTransactionPendingPay",
    },
    {
      method: "GET",
      path: "/settlement/alltransactionpendingwithdrawal",
      handler: "settlement.allTransactionPendingWithDrawal",
    },
    {
      method: "GET",
      path: "/settlement/totalPreSettelmentReinvestAndWithdrawal",
      handler: "settlement.totalPreSettelmentReinvestAndWithdrawal",
    },
  ],
};
