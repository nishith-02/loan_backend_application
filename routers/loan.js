const express=require('express');
const loanRouter=express.Router();
const {checkEligilibity,createLoan,makePayment,getLoanDetails,getStatement}=require('../controllers/loan')

loanRouter.post("/check-eligibility",checkEligilibity)
loanRouter.post('/create-loan',createLoan)
loanRouter.post('/make-payment/:customer_id/:loan_id',makePayment)
loanRouter.get('/view-loan/:loan_id',getLoanDetails)
loanRouter.get('/view-statement/:customer_id/:loan_id',getStatement)

module.exports=loanRouter;