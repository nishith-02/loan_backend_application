const { Pool } = require("pg");



const pool = new Pool(
  {
    
    host: 'localhost',
    user: 'postgres',
    password:'postgres',
    database: 'Task',
    port: 5432
  }
);

pool.on("connect", () => {
  console.log("Connection Successful!");
});

module.exports = {
  query: (text, params) => pool.query(text, params),
};
