const express=require('express');
const cors=require('cors');
const app=express();
const intializationRouter=require('./routers/intialization')
const userRouter=require('./routers/user')
const loanRouter=require('./routers/loan')

app.use(express.json())
app.use(cors())
app.use('/',intializationRouter)
app.use('/',userRouter)
app.use("/",loanRouter)



  

const PORT=3000

app.listen(PORT,async()=>{
    console.log(`Server is running on port ${PORT}`)
})



