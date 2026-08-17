import { PaymentRepository } from "./paymentRepository.js";
import { PaymentService } from "./paymentService.js";



export class PaymentFactory{

    static constroyService(){
        const repository = new PaymentRepository();
        const service = new PaymentService(repository);

        return service;
    }
}