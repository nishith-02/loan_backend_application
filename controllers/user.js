const db=require('../DB/Connect')


const generateCustomerId = () => {
    return Math.floor(Math.random() * (10000 - 1000 + 1)) + 1000;
};

const isCustomerIdUnique = async (customerId) => {
    const queryResult = await db.query('SELECT COUNT(*) FROM customers WHERE customer_id = $1', [customerId]);
    return queryResult.rows[0].count === 0;
};

const addCustomer = async (req, res) => {
    try{
        const{first_name,last_name,age,monthly_salary,phone_number}=req.body
        const approvedLimit = Math.round(36 * monthly_salary / 1000000) * 1000000;
        let customer_id;
        do {
            customerId = generateCustomerId();
        } while (!isCustomerIdUnique(customerId));
        customer_id = customerId;
        await db.query("BEGIN");
        const user=await db.query("INSERT INTO customers (customer_id,first_name,last_name,age,monthly_salary,phone_number,approved_limit,current_debt) VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *",[customer_id,first_name,last_name,age,monthly_salary,phone_number,approvedLimit,0])
        await db.query("COMMIT")
        res.status(201).json({
            message:"Customer added successfully",
            data:user.rows[0]
        })
    }
    catch(error){
        await db.query("ROLLBACK");
        console.log(error)
        res.status(500).send("Internal Server Error")
    }
}

module.exports = addCustomer