import { AnimationAction, AnimationClip, AnimationMixer, ExtrudeGeometry, Font, LoopOnce, Material, Mesh, MeshBasicMaterial, Object3D, Vector3 } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
const { TextGeometry } = require('three/examples/jsm/geometries/TextGeometry.js')
const { FontLoader } = require('three/examples/jsm/loaders/FontLoader')

const loader = new GLTFLoader();
const fontLoader = new FontLoader()

export class Shield extends Object3D {

    mixer: AnimationMixer | undefined
    shieldMesh: Mesh | undefined
    textMesh: Mesh | undefined
    textMaterial: Material | undefined
    lifetimeAction: AnimationAction | undefined
    onAnimationEnd: VoidFunction | undefined
    constructor(text?: string) {
        super()

        if (text) {
            fontLoader.load('./fonts/opensans.json', (font: Font) => {
                const textGeom: ExtrudeGeometry = new TextGeometry(text, {
                    font,
                    size: 1,
                    height: 2,
                    bevelEnabled: false,
                    bevelThickness: 1,
                    bevelSize: 1,
                    bevelOffset: 0,
                    bevelSegments: 5
                })

                this.textMesh = new Mesh(textGeom, new MeshBasicMaterial({
                    color: 0x00ff00
                }))

                this.addTextToShield()
            })
        }


        loader.loadAsync('./shields.glb').then((object) => {
            console.log(object)
            const actionName = 'ShieldFrameAction'
            const lifetimeClip = AnimationClip.findByName(object.animations, actionName)
            this.shieldMesh = object.scene.children.find((c) => c.name === 'FollowShield') as Mesh
            console.log(this.shieldMesh)
            if (!lifetimeClip) {
                console.log(`Action ${actionName} not found`)
            } else {
                this.mixer = new AnimationMixer(this.shieldMesh)
                console.log({mixer: this.mixer})
                this.lifetimeAction = this.mixer.clipAction(lifetimeClip)
                this.lifetimeAction.setLoop(LoopOnce, 1).play()
                this.mixer.addEventListener('finished', this.notifyAnimationEnd.bind(this))
            }

            function findMaterialOfCornice(o: Object3D): Material | undefined {
                if (!(o instanceof Mesh)) {
                    return
                }
                const mesh = o as Mesh
                if(mesh.name.toLocaleLowerCase() === 'cornice'){
                    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
                    return materials[0]
                }

               
                for (const c of o.children) {
                    const material = findMaterialOfCornice(c)
                    if (material) {
                        return material
                    }
                }
                return

            }

            const textMaterial = findMaterialOfCornice(this.shieldMesh)
            if (textMaterial) {
                this.textMaterial = textMaterial
            }

            this.add(this.shieldMesh)
            this.addTextToShield()
        })
    }

    addTextToShield() {
        if (this.textMesh && this.shieldMesh && this.textMesh.parent !== this.shieldMesh) {

            const sizeShield = new Vector3
            const sizeText = new Vector3

            this.shieldMesh.geometry.computeBoundingBox()
            this.textMesh.geometry.computeBoundingBox()
            this.shieldMesh.geometry.boundingBox?.getSize(sizeShield)
            this.textMesh.geometry.boundingBox?.getSize(sizeText)

            const maxTextWidth = sizeShield.x * 0.75

            if (sizeText.x > maxTextWidth) {
                const factor = maxTextWidth / sizeText.x
                this.textMesh.scale.multiply(new Vector3(factor, factor, 1))
            }


            if (this.textMaterial) {
                this.textMesh.material = this.textMaterial
            }
            this.textMesh.geometry.translate(- sizeText.x / 2, - sizeText.y / 2, - sizeText.z / 2)
            this.textMesh.position.set(...this.shieldMesh.position.toArray())
            this.textMesh.translateZ(sizeShield.z / 2)
            this.textMesh.translateY(- sizeShield.y / 10)

            this.shieldMesh.add(this.textMesh)
        }
    }

    animate(deltaSeconds: number) {
        this.mixer?.update(deltaSeconds)
    }

    addOnAnimationEndListener(listener: VoidFunction) {
        this.onAnimationEnd = listener
    }

    notifyAnimationEnd() {
        console.log('Shield lifetime animation end', this.onAnimationEnd)
        this.onAnimationEnd?.()
    }
}