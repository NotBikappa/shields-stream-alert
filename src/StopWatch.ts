export class StopWatch {

    previousStop: number | undefined = undefined

    start(){
        this.previousStop = performance.now()
    }

    interval(): number {
        if(this.previousStop === undefined){
            throw new Error('Stop watch not started')
        }
        const now =  performance.now()
        const interval = now - this.previousStop
        this.previousStop = now
        return interval
    }
}