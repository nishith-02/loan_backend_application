const weights=require('./weights')
const {calculateLoanVolumeScore,calculatePastPaymentsScore,calculateLoanHistoryScore,calculateRecentActivityScore}=require('./helperfunctions')

const creditScoreCalculation=async(customerData)=>{
    const pastPaymentsScore = await calculatePastPaymentsScore(customerData);
    const loanHistoryScore = await calculateLoanHistoryScore(customerData);
    const recentActivityScore = await calculateRecentActivityScore(customerData);
    const loanVolumeScore = await calculateLoanVolumeScore(customerData);
    console.log(pastPaymentsScore,loanHistoryScore,recentActivityScore,loanVolumeScore)

    const weightedPastPaymentsScore = pastPaymentsScore * weights.pastPayments;
    const weightedLoanHistoryScore = loanHistoryScore * weights.loanHistory;
    const weightedRecentActivityScore = recentActivityScore * weights.recentActivity;
    const weightedLoanVolumeScore = loanVolumeScore * weights.loanVolume;

    const creditScore = weightedPastPaymentsScore +weightedLoanHistoryScore +weightedRecentActivityScore +weightedLoanVolumeScore;

    return creditScore;
}

module.exports=creditScoreCalculation