



export class Result {

    constructor(status,data,error = null){
        this.success = status;
        this.data = data;
        this.error = error
    }

    static ok(data){
        return new Result(true,data)
    }

    static fail(error){
        return new Result(false,null,error);
    }
}