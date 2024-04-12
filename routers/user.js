const express=require('express');
const userRouter=express.Router();
const addCustomer=require('../controllers/user')

userRouter.post("/register",addCustomer)

module.exports=userRouter;