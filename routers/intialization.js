const express=require('express')
const intializationRouter=express.Router()
const dataInsertion=require('../controllers/intialization')

intializationRouter.post('/insert-data',dataInsertion)

module.exports=intializationRouter