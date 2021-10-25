import { Scene, PerspectiveCamera, WebGLRenderer, PointLight, AmbientLight, Vector3, BufferGeometry, Triangle, BufferAttribute, PMREMGenerator, Camera, Renderer, AnimationMixer, AnimationAction, LoopOnce, Object3D, Mesh, MeshStandardMaterial, Material } from 'three';
import { Shield } from './shield';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import { GLTF, GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { StopWatch } from './StopWatch';
import { Text3D } from './3DText';

type ActionMap = {
    [key: string]: AnimationAction
}

const gltfLoader = new GLTFLoader();
const envMapFile = './venice_sunset_1k.hdr'
const sceneFile = './shields.gltf'

const nodesToManage = [
    {
        name: 'SubscriberShield',
        animationName: 'SubscriberAnimation',
        materialName: 'Gold'
    },
    {
        name: 'FollowerShield',
        animationName: 'FollowerAnimation',
        materialName: 'Silver'
    }
]

export class GLTFViewer {
    lastFrametTime = 0
    camera: Camera
    shield: Shield | undefined
    scene: Scene
    renderer: WebGLRenderer
    cameraOscillationAngle = 0
    limitFPS = 80
    renderStopWatch: StopWatch
    metrics: {
        frameMs: number
        renderMs: number
    } = {
            frameMs: 0,
            renderMs: 0,
        }
    mixer: AnimationMixer | undefined
    managedObjects: { [key: string]: Object3D } = {}
    managedMaterials: { [key: string]: Material } = {}
    managedActions: { [key: string]: AnimationAction } = {}
    actions: ActionMap = {}
    onBadgeAnimationEnd: VoidFunction | undefined
    debug: boolean = false

    constructor(htmlElement: HTMLElement) {

        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(0, 0, 2)
        this.camera.lookAt(0, 0, 0)

        this.scene = new Scene()
        this.loadEnvMap()
        this.loadGltf()
            .then(this.setupScene.bind(this))

        this.renderer = new WebGLRenderer({
            alpha: true
        });
        this.resizeRenderer()

        this.renderStopWatch = new StopWatch()
        this.renderStopWatch.start()
        if (this.debug) {
            this.initDebugGUI()
        }
        htmlElement.appendChild(this.renderer.domElement);
        window.addEventListener('resize', this.resizeRenderer.bind(this))
    }

    resizeRenderer() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    initDebugGUI() {
        const metricsSpan = document.createElement('span')
        metricsSpan.id = 'metrics'
        document.body.appendChild(metricsSpan)

        window.setInterval(() => {
            metricsSpan.innerText = `${Math.ceil(1000 / this.metrics.frameMs)} fps`
        }, 1000)
    }

    async loadGltf() {
        const gltf = await gltfLoader.loadAsync(sceneFile)
        console.log('Loaded gltf file', gltf)

        gltf.scene.traverse((o) => {
            if (nodesToManage.find((ntm) => ntm.name === o.name)) {
                console.log(`Found managed node ${o.name}`, o)
                o.visible = false
                this.managedObjects[o.name] = o
            }
        })

        gltf.scene.traverse((o) => {
            const mesh = o as Mesh
            if (!mesh.material) {
                return
            }
            const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
            console.log({ materials })
            for (const m of materials) {
                const toManagedata = nodesToManage.find((ntm) => ntm.materialName === m.name)
                if (toManagedata) {
                    console.log(`Found managed material ${m.name}`, o)
                    this.managedMaterials[m.name] = m
                }
            }

        })
        return gltf
    }

    async loadEnvMap() {
        const data = await new RGBELoader().loadAsync(envMapFile)
        this.scene.environment = new PMREMGenerator(this.renderer).fromEquirectangular(data).texture
    }

    loadAnimations(gltf: GLTF) {
        const mixer = new AnimationMixer(gltf.scene)
        this.mixer = mixer
        for (const clip of gltf.animations) {
            if (nodesToManage.find((ntm) => ntm.animationName === clip.name)) {
                console.log(`Found animation ${clip.name}`)
                const action = mixer.clipAction(clip)
                action.setLoop(LoopOnce, 1)
                action.stop()
                this.managedActions[clip.name] = action
            }
        }
    }

    setupScene(gltf: GLTF) {
        this.scene.add(gltf.scene)
        this.loadAnimations(gltf)
    }

    loop() {
        this.metrics.frameMs = this.renderStopWatch.interval() + this.metrics.renderMs
        this.mixer?.update(this.metrics.frameMs / 1000)
        this.renderer.render(this.scene, this.camera)
        this.metrics.renderMs = this.renderStopWatch.interval()

        setTimeout(() => {

            requestAnimationFrame( this.loop.bind(this) );
    
        }, 1000 / 30 );
    }

    showShield(displayName: string, managedObjectName: string) {
        const ntm = nodesToManage.find((ntm) => ntm.name === managedObjectName)
        if (!ntm) {
            return
        }
        const object = this.managedObjects[ntm.name]
        const action = this.managedActions[ntm.animationName]
        const textMaterial = this.managedMaterials[ntm.materialName]

        if (!object || !action || !this.mixer) {
            return
        }

        const mixer = this.mixer
        const textMesh = this.placeText(displayName, object as Mesh, textMaterial)
        return new Promise<void>((resolve) => {
            function resetObject() {
                object.visible = false
                action.stop()
                action.paused = true
                action.time = 0
                console.log({ action })

                textMesh.removeFromParent()
                mixer.removeEventListener('finished', resetObject)
                resolve()
            }
            mixer.addEventListener('finished', resetObject)
            object.visible = true
            console.log('start', action.time, action.paused)
            mixer.setTime(0)
            action.paused = false
            action.play()
        })

    }

    showFollow(displayName: string) {
        return this.showShield(displayName, 'FollowerShield')
    }

    showSub(displayName: string) {
        return this.showShield(displayName, 'SubscriberShield')
    }

    placeText(text: string, object: Mesh, material?: Material) {
        const textMesh = new Text3D(text)
        const sizeShield = new Vector3
        const sizeText = new Vector3
        object.geometry.computeBoundingBox()
        textMesh.geometry.computeBoundingBox()
        object.geometry.boundingBox?.getSize(sizeShield)
        textMesh.geometry.boundingBox?.getSize(sizeText)

        const maxTextWidth = sizeShield.x * 0.75

        if (sizeText.x > maxTextWidth) {
            const factor = maxTextWidth / sizeText.x
            textMesh.scale.multiply(new Vector3(factor, factor, 1))
        }

        if (material) {
            textMesh.material = material
        }

        textMesh.geometry.translate(- sizeText.x / 2, - sizeText.y / 2, - sizeText.z / 2)
        textMesh.position.set(...object.position.toArray())
        textMesh.translateZ(sizeShield.z / 2)
        textMesh.translateY(- sizeShield.y / 10)

        object.add(textMesh)
        return textMesh
    }
}
