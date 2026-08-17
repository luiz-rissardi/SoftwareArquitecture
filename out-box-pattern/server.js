import express, { response } from "express";
import { OrderFactory } from "./order/orderFactory.js";
import { OrderRepository } from "./order/orderRepository.js";

const app = express();
app.use(express.json());


const orderService = OrderFactory.constroyService();



app.post("/order", async (request, response) => {
    const { order } = request.body;
    
    const result = await orderService.createOrder(order);

    console.log(result);
    if(result.success){
        return response.status(200).json(result.data)
    }else{
        return response.status(400).json({ error: result.error });
    }

})

const PORT = 3000;
app.listen(PORT, () => console.log(`write-service ouvindo na porta ${PORT}`));
