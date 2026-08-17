import { OrderRepository } from "./orderRepository.js";
import { OrderService } from "./orderService.js";



export class OrderFactory{

    static constroyService(){
        const repository = new OrderRepository();
        const service = new OrderService(repository);

        return service;
    }
}