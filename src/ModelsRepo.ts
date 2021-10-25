import { AnimationMixer, Mesh } from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

const loader = new GLTFLoader();

export class ModelsRepo {

    models: Mesh[]

    constructor(models: Mesh[]) {
        this.models = models
    }

    getByName(name: string) {
        return this.models.find((m) => m.name.toLowerCase() === name.toLowerCase())
    }

    static async load() {
        const res = await loader.loadAsync('./shields.gltf')
        console.log(res)
        const models: Mesh[] = res.scene.children.filter((c) => c instanceof Mesh) as Mesh[]

        for(const m of models){
            const mixer = new AnimationMixer(m)
            console.log(m.name, mixer)
        }

        return new ModelsRepo(models)
    }
}
