import { GLTFViewer } from './GLTFViewer'
import { createStreamElementsEventQueue, StreamEvent } from './StreamElementsEventQueue';

const LOCAL_STORAGE_AUDIO_ENABLED_KEY = 'audio_enabled'

const urlParams = new URLSearchParams(window.location.search);
const authToken = urlParams.get('authToken');
let showingEvent: StreamEvent | undefined = undefined


const audioElem = document.getElementById('audio') as HTMLAudioElement
audioElem.volume = 0.6


const wasAudioPlayed = !!localStorage.getItem(LOCAL_STORAGE_AUDIO_ENABLED_KEY)

function playAudioOnce() {
    audioElem.pause()
    audioElem.currentTime = 0
    audioElem.play()
    localStorage.setItem(LOCAL_STORAGE_AUDIO_ENABLED_KEY, 'true')
    document.removeEventListener('click', playAudioOnce)
}

document.addEventListener('click', playAudioOnce)


if (!authToken) {
    console.log('Missing auth token')
} else {
    const { eventQueue, onEvent } = createStreamElementsEventQueue({
        authToken: authToken
    })

    onEvent(() => {
        if (!showingEvent) {
            processQueue()
        }
    })
    async function processQueue() {

        showingEvent = eventQueue.pop()
        while (showingEvent) {
            console.log('processing event', showingEvent)

            const handler = eventComponentsRenderers[showingEvent.type as keyof typeof eventComponentsRenderers]
            await handler?.(showingEvent)
            showingEvent = eventQueue.pop()
        }

    }
}

const viewer = new GLTFViewer(document.body)
console.log('Start loop')
viewer.loop()


const eventComponentsRenderers = {
    follow: (payload: StreamEvent) => {
        audioElem.play()
        return viewer.showFollow(payload.data.event.name)
    },
    cheer: undefined,
    host: undefined,
    raid: undefined,
    subscriber:  (payload: StreamEvent) => {
        audioElem.play()
        return viewer.showSub(payload.data.event.name)
    },
    tip: undefined,
}
