const Queue = require('bull');
const db=require('../DB/Connect')
const xlsx = require('xlsx');
const fs = require('fs');

const customerQueue = new Queue('customer-ingestion', {
    redis: {
        host: 'localhost',
        port: 6379,
        
    },
    settings: {
        maxRetries: 3, 
        retryProcessDelay: 5000, 
    },
});

const loanQueue = new Queue('loan-ingestion', {
    redis: {
        host: 'localhost',
        port: 6379,
        
    },
    settings: {
        maxRetries: 3, 
        retryProcessDelay: 5000, 
    },
});

const dataInsertion=async(req,res)=>{
    try {
          await customerQueue.add();
          await loanQueue.add();
          res.json({ message: 'Data ingestion triggered successfully!' });
        } catch (error) {
          console.error(error);
          res.status(500).json({ message: 'Error triggering data ingestion' });
        }
}

const processCustomerData = async (data) => {
    try {
        const workbook = xlsx.read(data, { type: 'binary' });
        const sheet = workbook.Sheets['Sheet1']; 
        let customers = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        customers = customers.filter((row, index) => {
            return index === customers.findIndex(item => item[0] === row[0]);
        });

        for (let i = 1; i < customers.length; i++) {
            const row = customers[i];
            const customer = {
                customer_id: row[0],
                first_name: row[1],
                last_name: row[2],
                age: row[3],
                phone_number: row[4],
                monthly_salary: row[5],
                approved_limit: row[6],
                current_debt: row[7]
            };

            await insertCustomer(customer);
        }

        console.log('Customer data processed and inserted successfully');
        return customers;
    } catch (error) {
        console.error('Error processing customer data:', error);
        throw error;
    }
};


const processLoanData = async (data) => {
    try {
        const workbook = xlsx.read(data, { type: 'binary' });
        const sheet = workbook.Sheets['Sheet1']; 
        let loans = xlsx.utils.sheet_to_json(sheet, { header: 1 });
        loans = loans.filter((row, index) => {
            return index === loans.findIndex(item => item[1] === row[1]);
        });

        for (let i = 1; i < loans.length; i++) {
            const row = loans[i];
            const loan = {
                customer_id: row[0],
                loan_id: row[1],
                loan_amount: row[2],
                tenure: row[3],
                interest_rate: row[4],
                monthly_payment: row[5],
                emis_paid_on_time: row[6],
                date_of_approval: row[7],
                end_date: row[8],
                remaining_loan_amount:row[2]
            };
            // console.log("loan",loan)

            await insertLoan(loan);
        }

        console.log('loan data processed and inserted successfully');
        return loans;
    } catch (error) {
        console.error('Error processing customer data:', error);
        throw error;
    }
};

const insertLoan = async (loan) => {
    try {
        const dateOfApprovalNumericValue=loan.date_of_approval
        const dateObject = xlsx.SSF.parse_date_code(dateOfApprovalNumericValue);
        const formattedDate = new Date(Date.UTC(dateObject.y, dateObject.m, dateObject.d));
        const endDateNumericValue=loan.end_date
        const endDateObject = xlsx.SSF.parse_date_code(endDateNumericValue);
        const formattedEndDate = new Date(Date.UTC(dateObject.y, dateObject.m, dateObject.d));
        await db.query('BEGIN');
        const insertQuery = 'INSERT INTO loans (customer_id, loan_id, loan_amount, tenure, interest_rate, monthly_payment, emis_paid_on_time, date_of_approval, end_date) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)';
        await db.query(insertQuery, [
            loan.customer_id,
            loan.loan_id,
            loan.loan_amount,
            loan.tenure,
            loan.interest_rate,
            loan.monthly_payment,
            loan.emis_paid_on_time,
            formattedDate,
            formattedEndDate,
        ]);
        await db.query('COMMIT');
        console.log(`Inserted loan with ID ${loan.loan_id}`);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error inserting loan:', error);
        throw error;
    }
}


  
const insertCustomer = async (customer) => {
    try {
        await db.query('BEGIN');
        const insertQuery = 'INSERT INTO customers (customer_id, first_name, last_name, age,phone_number, monthly_salary, approved_limit, current_debt) VALUES ($1, $2, $3, $4, $5, $6, $7,$8)';
        await db.query(insertQuery, [
            customer.customer_id,
            customer.first_name,
            customer.last_name,
            customer.age,
            customer.phone_number,
            customer.monthly_salary,
            customer.approved_limit,
            customer.current_debt,
        ]);
        await db.query('COMMIT');
        console.log(`Inserted customer with ID ${customer.customer_id}`);
    } catch (error) {
        await db.query('ROLLBACK');
        console.error('Error inserting customer:', error);
        throw error;
    }
};

  
  customerQueue.process(async () => {
    console.log("hello_two");
    try {
        const customerData = await fs.promises.readFile('./customer_data.xlsx', { encoding: 'binary' });

        console.log("Length of customerData:", customerData.length);
        const customers = await processCustomerData(customerData);
        console.log('Customer data processed and inserted successfully');
    } catch (error) {
        console.error('Error reading customer data:', error);
    }
});

loanQueue.process(async () => {
    console.log("hello_three");
    try {
        const loanData = await fs.promises.readFile('./loan_data.xlsx', { encoding: 'binary' });

        console.log("Length of loanData:", loanData.length);
        const loans = await processLoanData(loanData);
        console.log('Loan data processed and inserted successfully');
    } catch (error) {
        console.error('Error reading customer data:', error);
    }
});

module.exports=dataInsertion