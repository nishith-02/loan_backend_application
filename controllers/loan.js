const db=require("../DB/Connect")
const creditScoreCalculation=require("../utilities/credit_score_calculation")
const axios=require("axios")

const generateLoanId = () => {
    return Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000;
};

const isLoanIdUnique = async (loanId) => {
    const queryResult = await db.query('SELECT COUNT(*) FROM loans WHERE loan_id = $1', [loanId]);
    return queryResult.rows[0].count === 0;
};

const checkEligilibity=async(req,res)=>{
    try{
    const {customer_id,loan_amount,interest_rate,tenure}=req.body
    const customer=await db.query("SELECT * FROM customers WHERE customer_id=$1",[customer_id])
    const loans=await db.query("SELECT * FROM loans WHERE customer_id=$1 AND end_date > CURRENT_DATE",[customer_id])
    if(customer.rows.length===0){
        return res.status(400).send("Invalid Customer ID")
    }
    let creditScore=await creditScoreCalculation(customer.rows[0])
    creditScore=Math.round(creditScore)
    
    console.log("credit score",creditScore)
    let loanSumAmount=0
    loans.rows.forEach(loan=>{
        loanSumAmount+=parseInt(loan.loan_amount)
    })
    let approvedLimit=customer.rows[0].approved_limit
    if(loanSumAmount>approvedLimit){
        creditScore=0
    }
    let totalEmis=0
    loans.rows.forEach(loan => {
        totalEmis += parseInt(loan.monthly_payment);
    });
    let maxEmis=parseInt(customer.rows[0].monthly_salary) * 0.5;
    console.log("total emis",totalEmis)
    console.log("max emis",maxEmis)
    if (totalEmis > maxEmis) {
        return res.status(200).json({
            customer_id: customer_id,
            approval:"Rejected",
            loan_amount: loan_amount,
            interest_rate:"Not Applicable",
            corrected_interest_rate: "Not Applicable",
            tenure: tenure,
            monthly_installment: "Not Applicable",
            creditScore: creditScore,
        })
    }
    let approved=false
    let corrected_interest_rate;
    let monthly_installment;
    const monthlyInterestRate = interest_rate / 12 / 100;
    const totalPayments = tenure ;
    monthly_installment = (loan_amount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -totalPayments));
    if (creditScore > 50) {
        approved = true;
    } else if (creditScore > 30) {
        if (interest_rate > 12) {
            approved = true;
        } else {
            corrected_interest_rate = 12;
        }
    } else if (creditScore > 10) {
        if (interest_rate > 16) {
            approved = true;
        } else {
            corrected_interest_rate = 16;
        }
    } else if(creditScore<=10){
        return res.status(200).json({
            customer_id: customer_id,
            approval:"Rejected",
            loan_amount: loan_amount,
            interest_rate:"Not Applicable",
            corrected_interest_rate: "Not Applicable",
            tenure: tenure,
            monthly_installment: "Not Applicable",
            creditScore: creditScore,
        })
    }
    console.log("approved",approved)
    if(approved){
        return res.status(200).json({
            customer_id: customer_id,
            approval:"Approved",
            loan_amount: loan_amount,
            interest_rate: interest_rate,
            corrected_interest_rate: "Not Applicable",
            tenure: tenure,
            monthly_installment: monthly_installment,
            creditScore: creditScore,
        })
    }
    else{
        if(corrected_interest_rate){
            const correctedMonthlyInterestRate = corrected_interest_rate / 12 / 100;
            monthly_installment = (loan_amount * correctedMonthlyInterestRate) / (1 - Math.pow(1 + correctedMonthlyInterestRate, -totalPayments));
        }
        console.log("corrected interest rate",corrected_interest_rate)
        return res.status(200).json({
            customer_id: customer_id,
            approval:"Approved",
            loan_amount: loan_amount,
            interest_rate: interest_rate,
            corrected_interest_rate: corrected_interest_rate,
            tenure: tenure,
            monthly_installment: monthly_installment,
            creditScore: creditScore,
        })

    }
    }
    catch(error){
        console.log(error)
        res.status(500).send("Internal Server Error")
    }

}

const createLoan=async(req,res)=>{
    try{
        const {customer_id,loan_amount,interest_rate,tenure}=req.body
        let response=await axios.post("http://localhost:3000/check-eligibility",{customer_id,loan_amount,interest_rate,tenure})
        console.log(response.data)
        if(response.data.approval==="Rejected"){
            if(response.data.creditScore<=10){
                return res.json({
                    loan_id:null,
                    customer_id:customer_id,
                    loan_approved:false,
                    message:"Loan Rejected due to low credit score",
                    monthly_installment:null
                })
            }
            else{
                return res.json({
                    loan_id:null,
                    customer_id:customer_id,
                    loan_approved:false,
                    message:"Loan Rejected due to high EMIs",
                    monthly_installment:null
                })
            }
        }
        else if(response.data.approval==="Approved"){
            let monthly_installment=response.data.monthly_installment
            monthly_installment=Math.round(monthly_installment)
            let loan_approved=true
        
        let loan_id;
        do {
            loanId = generateLoanId();
        } while (!isLoanIdUnique(loanId));
        loan_id = loanId;
        let date=new Date()
        let year=date.getFullYear()
        let month = String(date.getMonth() + 1).padStart(2, '0'); 
        let day = String(date.getDate()).padStart(2, '0');
        let date_of_approval=year + '-' + month + '-' + day;
        let [Eyear, Emonth, Eday] = date_of_approval.split('-').map(Number);
        let approvalDate = new Date(Eyear, Emonth - 1, Eday); 
        let endDate = new Date(approvalDate.getTime());
        endDate.setMonth(endDate.getMonth() + tenure);
        let endYear = endDate.getFullYear();
        let endMonth = String(endDate.getMonth() + 1).padStart(2, '0');
        let endDay = String(endDate.getDate()).padStart(2, '0');
        let end_date = endYear + '-' + endMonth + '-' + endDay;
        
        await db.query("BEGIN");
        const loan=await db.query("INSERT INTO loans (loan_id,customer_id,loan_amount,interest_rate,tenure,monthly_payment,emis_paid_on_time,date_of_approval,end_date,remaining_loan_amount) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",[loan_id,customer_id,loan_amount,interest_rate,tenure,monthly_installment,0,date_of_approval,end_date,loan_amount])
        const customerData=await db.query("SELECT * FROM customers WHERE customer_id=$1",[customer_id])
        const currentDebt=parseInt(customerData.rows[0].current_debt)+parseInt(loan_amount)
        const updatedCustomer=await db.query("UPDATE customers SET current_debt=$1 WHERE customer_id=$2 RETURNING *",[currentDebt,customer_id])
        console.log("updated customer",updatedCustomer)
        await db.query("COMMIT")
        res.status(201).json({
            loan_id:loan.rows[0].loan_id,
            customer_id:loan.rows[0].customer_id,
            loan_approved:loan_approved,
            message:"Not Applicable",
            monthly_installment:loan.rows[0].monthly_payment
        })
    }
    }
    catch(error){
        await db.query("ROLLBACK");
        console.log(error)
        res.status(500).send("Internal Server Error")
    }
}

const makePayment=async(req,res)=>{
    try{
        const {customer_id,loan_id}=req.params
        const {payment_amount}=req.body
        console.log(payment_amount)
        const loan=await db.query("SELECT * FROM loans where loan_id=$1",[loan_id])
        if(loan.rows.length===0){
            return res.status(400).send("Invalid Loan ID")
        }
        let emis_paid_on_time=parseInt(loan.rows[0].emis_paid_on_time)
        console.log(emis_paid_on_time)
        let monthly_payment=parseInt(loan.rows[0].monthly_payment)
        if(payment_amount===monthly_payment){
            let remaining_loan_amount=parseInt(loan.rows[0].remaining_loan_amount)-payment_amount
            emis_paid_on_time=emis_paid_on_time+1
            console.log("updated emi",emis_paid_on_time)
            await db.query("BEGIN")
            await db.query('UPDATE loans SET emis_paid_on_time = $1,remaining_loan_amount=$2  WHERE loan_id = $3', [emis_paid_on_time,remaining_loan_amount,loan_id]);
            let customerData=await db.query("SELECT * FROM customers WHERE customer_id=$1",[customer_id])
            let currentDebt=parseInt(customerData.rows[0].current_debt)-payment_amount
            await db.query("UPDATE customers SET current_debt=$1 WHERE customer_id=$2",[currentDebt,customer_id])
            await db.query("COMMIT")
        }
        else if(payment_amount>monthly_payment){
            let remaining_loan_amount=parseInt(loan.rows[0].remaining_loan_amount)-payment_amount
            emis_paid_on_time=emis_paid_on_time+1
            let monthlyInterestRate = loan.rows[0].interest_rate / 12 / 100;
            let totalPayments = loan.rows[0].tenure;
            monthly_installment = (remaining_loan_amount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -totalPayments));
            monthly_installment=Math.round(monthly_installment)
            await db.query("BEGIN")
            await db.query('UPDATE loans SET emis_paid_on_time = $1,monthly_payment=$2,remaining_loan_amount=$3 WHERE loan_id = $4', [emis_paid_on_time,monthly_installment,remaining_loan_amount,loan_id]);
            let customerData=await db.query("SELECT * FROM customers WHERE customer_id=$1",[customer_id])
            let currentDebt=parseInt(customerData.rows[0].current_debt)-payment_amount
            await db.query("UPDATE customers SET current_debt=$1 WHERE customer_id=$2",[currentDebt,customer_id])
            await db.query("COMMIT")
        }
        else if(payment_amount<monthly_payment){
            let remaining_loan_amount=parseInt(loan.rows[0].remaining_loan_amount)-payment_amount
            let monthlyInterestRate = loan.rows[0].interest_rate / 12 / 100;
            let totalPayments = loan.rows[0].tenure;
            monthly_installment = (remaining_loan_amount * monthlyInterestRate) / (1 - Math.pow(1 + monthlyInterestRate, -totalPayments));
            monthly_installment=Math.round(monthly_installment)
            await db.query("BEGIN")
            await db.query('UPDATE loans SET monthly_payment=$1,remaining_loan_amount=$2 WHERE loan_id = $3', [monthly_installment,remaining_loan_amount,loan_id]);
            let customerData=await db.query("SELECT * FROM customers WHERE customer_id=$1",[customer_id])
            let currentDebt=parseInt(customerData.rows[0].current_debt)-payment_amount
            await db.query("UPDATE customers SET current_debt=$1 WHERE customer_id=$2",[currentDebt,customer_id])
            await db.query("COMMIT")
        }
        res.status(200).json({
            message:"Payment Successful",
            loan:loan.rows[0]
        })
    }
    catch(error){
        await db.query("ROLLBACK");
        console.log(error)
        res.status(500).send("Internal Server Error")
    }
}

const getLoanDetails=async(req,res)=>{
    try{
        const {loan_id}=req.params
        const loan=await db.query("SELECT * FROM loans WHERE loan_id=$1",[loan_id])
        const customer=await db.query("SELECT * FROM customers WHERE customer_id=$1",[loan.rows[0].customer_id])
        if(loan.rows.length===0){
            return res.status(400).send("Invalid Loan ID")
        }
        res.status(200).json({
            loan_id:loan.rows[0].loan_id,
            customer:{
                first_name:customer.rows[0].first_name,
                last_name:customer.rows[0].last_name,
                age:customer.rows[0].age,
                phone_number:customer.rows[0].phone_number
            },
            loan_amount:loan.rows[0].loan_amount,
            interest_rate:loan.rows[0].interest_rate,
            monthly_installment:loan.rows[0].monthly_payment,
            tenure:loan.rows[0].tenure,
        })
    }
    catch(error){
        console.log(error)
        res.status(500).send("Internal Server Error")
    }
}

const getStatement=async(req,res)=>{
    try{
        const {customer_id,loan_id}=req.params
        const loan=await db.query("SELECT * FROM loans WHERE loan_id=$1",[loan_id])
        if(loan.rows.length===0){
            return res.status(400).send("Invalid Loan ID")
        }
        let pruncipalAmount=loan.rows[0].loan_amount
        let interest_rate=loan.rows[0].interest_rate
        let amount_paid=loan.rows[0].emis_paid_on_time*loan.rows[0].monthly_payment
        let monthly_installment=loan.rows[0].monthly_payment
        let repayments_left=(loan.rows[0].tenure*12)-loan.rows[0].emis_paid_on_time
        return res.status(200).json({
            loan_id:loan_id,
            customer_id:customer_id,
            principal_amount:pruncipalAmount,
            interest_rate:interest_rate,
            amount_paid:amount_paid,
            monthly_installment:monthly_installment,
            repayments_left:repayments_left
        })
    }
    catch(error){
        console.log(error)
        res.status(500).send("Internal Server Error")
    }
}



module.exports={
    checkEligilibity,
    createLoan,
    makePayment,
    getLoanDetails,
    getStatement
}