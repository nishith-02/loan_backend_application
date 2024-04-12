const thresholds = {
    pastPayments: {
      allOnTime: 80,
      oneLate: 50,
      default: 20
    },
    loanHistory: {
      fewLoans: 5,
      manyLoans: 10
    },
    recentActivity: {
      noActivity: 0
    },
    loanVolume: {
      good: 100,
      moderate: 50,
      high: 0
    },
  };
  module.exports = thresholds;
  