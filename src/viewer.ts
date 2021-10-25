import { Scene, PerspectiveCamera, WebGLRenderer, PointLight, AmbientLight, Vector3, BufferGeometry, Triangle, BufferAttribute, PMREMGenerator, Camera, Renderer } from 'three';
import { Shield } from './shield';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';

interface BadgeData {
    displayName: string,
    type: 'follower'

}

export class Viewer {

    lastFrametTime = 0
    camera: Camera
    shield: Shield | undefined
    scene: Scene
    renderer: WebGLRenderer
    cameraOscillationAngle = 0

    onBadgeAnimationEnd: VoidFunction | undefined
    constructor() {
        this.scene = new Scene();
        this.camera = new PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);

        this.renderer = new WebGLRenderer({
            alpha: true
        });
        this.renderer.setSize(window.innerWidth, window.innerHeight);

        window.addEventListener('resize', () => {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        })
        document.body.appendChild(this.renderer.domElement);

        const pointLight = new PointLight(0xffffff)
        const ambientLight = new AmbientLight(0xffffff, 0.4)
        this.scene.add(pointLight, ambientLight)

        new RGBELoader().load('./venice_sunset_1k.hdr', (texture) => {
            const envMap = new PMREMGenerator(this.renderer).fromEquirectangular(texture).texture
            this.scene.environment = envMap
        })

        pointLight.position.set(3, 12, -3)

        this.camera.position.z = 2;
        this.camera.lookAt(0, 0, 0)

        this.lastFrametTime = performance.now()
    }

    loop() {
        const currentFrameTime = performance.now()
        const alphaSeconds = (currentFrameTime - this.lastFrametTime) / 1000
        this.lastFrametTime = currentFrameTime

        const cameraPosition = this.camera.position

        this.shield?.animate(alphaSeconds)
        cameraPosition.setY(Math.sin(this.cameraOscillationAngle += 0.01))
        this.camera.lookAt(0, 0, 0)
        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.loop.bind(this));
    }

    showBadge(badgeData: BadgeData) {
        if (this.shield) {
            this.shield.removeFromParent()
            delete this.shield
        }
        this.shield = new Shield(badgeData.displayName)
        this.shield.addOnAnimationEndListener(() => {
            this.notifyShieldAnimationEnd()
            this.removeShield()
        })
        this.scene.add(this.shield)

    }

    removeShield() {
        console.log('removing shield', this.shield)
        if (this.shield) {
            this.shield.removeFromParent()
            delete (this.shield)
        }
    }

    addShieldAnimationEndListener(listener: VoidFunction) {
        this.onBadgeAnimationEnd = listener
    }
    
    notifyShieldAnimationEnd() {
        this.onBadgeAnimationEnd?.()
    }
}
