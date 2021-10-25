import { ModelsRepo } from './ModelsRepo'
import { createStreamElementsEventQueue, StreamEvent } from './StreamElementsEventQueue'
import { Viewer } from './viewer'

const LOCAL_STORAGE_AUDIO_ENABLED_KEY = 'audio_enabled'

const viewer = new Viewer()
viewer.loop()

const urlParams = new URLSearchParams(window.location.search);
const authToken = urlParams.get('authToken');
let showingEvent: StreamEvent | undefined = undefined


const audioElem = document.getElementById('audio') as HTMLAudioElement
audioElem.volume = 0.6


const wasAudioPlayed = !!localStorage.getItem(LOCAL_STORAGE_AUDIO_ENABLED_KEY)

function playAudioOnce () {
    audioElem.pause()
    audioElem.currentTime = 0
    audioElem.play()
    localStorage.setItem(LOCAL_STORAGE_AUDIO_ENABLED_KEY, 'true')
    document.removeEventListener('click', playAudioOnce)  
}

document.addEventListener('click', playAudioOnce)

ModelsRepo.load().then((modelsrepo) => {
    const followShield = modelsrepo.getByName('FollowShield')
    console.log(followShield, followShield?.animations)
})


const eventComponentsRenderers = {
    follow: (payload: StreamEvent) => {
        audioElem.play()
        viewer.showBadge({
        displayName: payload.data.event.name,
        type: 'follower'
        })
    },
    cheer: undefined,
    host: undefined,
    raid: undefined,
    subscriber: undefined,
    tip: undefined,
}

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
    async function waitAnimationEnd() {
        return new Promise<void>((resolve) => {
            console.log('viewer.addShieldAnimationEndListener')
            viewer.addShieldAnimationEndListener(resolve)
        })
    }
    async function processQueue() {

        showingEvent = eventQueue.pop()
        while (showingEvent) {
            console.log('processing event', showingEvent)
            
            const handler =  eventComponentsRenderers[showingEvent.type as keyof typeof eventComponentsRenderers]
            handler?.(showingEvent)
            
            await waitAnimationEnd()
            showingEvent = eventQueue.pop()
        }

    }
}


