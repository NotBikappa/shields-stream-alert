const WS_URL = 'https://realtime.streamelements.com'
import io from 'socket.io-client';


export type StreamEvent = any

export function createStreamElementsEventQueue(props: { authToken: string }) {
    const socket = io(WS_URL, {
        transports: ['websocket']
    })

    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('authenticated', onAuthenticated);

    function onConnect() {
        console.log('Successfully connected to the websocket');
        socket.emit('authenticate', {
            method: 'jwt',
            token: props.authToken
        });
    }

    function onDisconnect() { console.log('Disconnected from websocket'); }
    function onAuthenticated(data: any) { const { channelId } = data; console.log(`Successfully authenticated to channel ${channelId}`); }

    let handleEventInQueue: (()  => void) | undefined = undefined
    const eventQueue: StreamEvent = []

    const handlerWithLog = (event: StreamEvent) => {
        console.log(event)
        eventQueue.push(event)
        handleEventInQueue?.()
    }

    socket.on('event', handlerWithLog);
    socket.on('event:test', (data: StreamEvent) => {

        const testListenerToEventType = {
            'follower-latest': 'follow',
            'subscriber-latest': 'subscriber',
        }
        function isKnownListener(listener: string): listener is Extract<keyof typeof testListenerToEventType, string> {
            return listener in testListenerToEventType
        }

        const listener = data.listener
        if (isKnownListener(listener)) {
            handlerWithLog({
                type: testListenerToEventType[listener],
                data
            })
        }
        console.log(`Unhandled test event with listener ${data.listener}`)
    });

    return {
        eventQueue,
        onEvent: (handler: () => void) => {
            handleEventInQueue = handler
        }
    }
}