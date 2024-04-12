const thresholds=require('../utilities/thresholds')
const db=require("../DB/Connect")

const calculatePaidOnTimePercentage = async (customerId) => {
    try {
        const currentDate = new Date(); // Get the current date
        const query = `
            SELECT emis_paid_on_time, date_of_approval, tenure
            FROM loans
            WHERE customer_id = $1;
        `;
        const { rows } = await db.query(query, [customerId]);
        
        let total_emis = 0;
        let total_emis_paid_on_time = 0;

        rows.forEach((row) => {
            const { emis_paid_on_time, date_of_approval, tenure } = row;
            const approvalDate = new Date(date_of_approval);
            const elapsedMonths = Math.max(0, Math.floor((currentDate - approvalDate) / (30 * 24 * 60 * 60 * 1000))); // Calculate the number of elapsed months
            console.log("elapsed months",elapsedMonths)
            total_emis += elapsedMonths; // Add the lesser of elapsed months and tenure to the total number of EMIs
            total_emis_paid_on_time += emis_paid_on_time; // Sum up the EMIs paid on time
        });
        console.log("emis",total_emis,total_emis_paid_on_time)
        return total_emis === 0 ? 0 : (total_emis_paid_on_time / total_emis) * 100;
    } catch (error) {
        console.error('Error calculating paid on time percentage:', error);
        throw error;
    }
};


const calculatePastPaymentsScore = async (customerData) => {
    try {
        const customerId = customerData.customer_id;
      const emisPaidOnTimePercentage = await calculatePaidOnTimePercentage(customerId);
      console.log(thresholds)
      if (emisPaidOnTimePercentage >= thresholds.pastPayments.allOnTime) {
        return 100;
      } else if (emisPaidOnTimePercentage >= thresholds.pastPayments.oneLate) {
        return 75;
      } else if (emisPaidOnTimePercentage >= thresholds.pastPayments.default) {
        return 50;
      } else {
        return 0;
      }
    } catch (error) {
      console.error('Error calculating past payments score:', error);
      throw error;
    }
  };

  const calculateNumberOfLoans = async (customerId) => {
    try {
      const query = `
        SELECT COUNT(*) AS num_loans
        FROM loans
        WHERE customer_id = $1;
      `;
      const { rows } = await db.query(query, [customerId]);
      return rows[0].num_loans;
    } catch (error) {
      console.error('Error calculating number of loans:', error);
      throw error;
    }
  };

  const calculateLoanHistoryScore = async (customerData) => {
    try {
    const customerId = customerData.customer_id;
      const numLoans = await calculateNumberOfLoans(customerId);
      if (numLoans === 0) {
        return 100;
      } else if (numLoans <= thresholds.loanHistory.fewLoans) {
        return 75;
      } else if (numLoans <= thresholds.loanHistory.manyLoans) {
        return 50;
      } else {
        return 25;
      }
    } catch (error) {
      console.error('Error calculating loan history score:', error);
      throw error;
    }
  };

  const calculateCurrentYearActivity = async (customerId) => {
    try {
      const query = `
        SELECT COUNT(*) AS recent_activity
        FROM loans
        WHERE customer_id = $1
          AND EXTRACT(YEAR FROM date_of_approval) = EXTRACT(YEAR FROM CURRENT_DATE);
      `;
      const { rows } = await db.query(query, [customerId]);
      return rows[0].recent_activity;
    } catch (error) {
      console.error('Error calculating current year activity:', error);
      throw error;
    }
  };

  const calculateRecentActivityScore = async (customerData) => {
    try {
        const customerId=customerData.customer_id
      const recentActivity = await calculateCurrentYearActivity(customerId);
      return recentActivity > thresholds.recentActivity.noActivity ? 100 : 0;
    } catch (error) {
      console.error('Error calculating recent activity score:', error);
      throw error;
    }
  };

  const calculateApprovedVolume = async (customerId) => {
    try {
      const customer=await db.query("SELECT * FROM customers WHERE customer_id=$1",[customerId])
      
      
      const approvedLimit = Number(customer.rows[0].approved_limit); 
      return approvedLimit;
    } catch (error) {
      console.error('Error calculating approved volume:', error);
      throw error;
    }
};

  const calculateCurrentLoanSum = async (customerId) => {
    try {
      const query = `
        SELECT COALESCE(SUM(loan_amount), 0) AS current_loan_sum
        FROM loans
        WHERE customer_id = $1
          AND end_date > CURRENT_DATE;
      `;
      const { rows } = await db.query(query, [customerId]);
      return rows[0].current_loan_sum;
    } catch (error) {
      console.error('Error calculating current loan sum:', error);
      throw error;
    }
  };

  const calculateLoanVolumeScore = async (customerData) => {
    try {
      let customerId=customerData.customer_id
      const approvedVolume = await calculateApprovedVolume(customerId);
      const currentLoanSum = await calculateCurrentLoanSum(customerId);
      console.log(approvedVolume,currentLoanSum)
      
      if (currentLoanSum <= approvedVolume) {
        return thresholds.loanVolume.good;
      } else {
        return thresholds.loanVolume.moderate;
      }
    } catch (error) {
      console.error('Error calculating loan volume score:', error);
      throw error;
    }
  };

  module.exports={
    calculatePastPaymentsScore,
    calculateLoanHistoryScore,
    calculateRecentActivityScore,
    calculateLoanVolumeScore
  }
  



