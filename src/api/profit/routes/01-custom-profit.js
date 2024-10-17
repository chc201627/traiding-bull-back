module.exports = {
  routes: [
    {
      method: "GET",
      path: "/profit/getroi",
      handler: "profit.getRoi",
    },
    {
      method: "GET",
      path: "/profit/getdrawdown",
      handler: "profit.getDrawdown",
    },
    {
      method: "GET",
      path: "/profit/getstandarddeviation",
      handler: "profit.getStandardDeviation",
    },
    {
      method: "GET",
      path: "/profit/totalearnings",
      handler: "profit.totalEarnings",
    },
    {
      method: "POST",
      path: "/profit/executePreSettlement",
      handler: "profit.executePreSettlement",
    },
  ],
};
